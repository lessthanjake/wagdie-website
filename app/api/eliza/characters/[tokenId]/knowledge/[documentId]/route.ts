/**
 * Knowledge Document API Route
 * GET /api/eliza/characters/[tokenId]/knowledge/[documentId] - Get document
 * DELETE /api/eliza/characters/[tokenId]/knowledge/[documentId] - Delete document
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  findKnowledgeDocumentById,
  getKnowledgeDocuments,
  getKnowledgeRecordByTokenId,
  removeKnowledgeDocumentById,
  replaceKnowledgeDocuments,
  toKnowledgeDocumentResponse,
} from '@/lib/eliza/knowledge'
import { elizaConfig } from '@/lib/eliza/config'
import { deleteKnowledgeDocumentFromOfficial } from '@/lib/eliza/knowledgeSync'
import { authorizeElizaCharacterMutation } from '@/lib/eliza/routeAuth'

interface RouteParams {
  params: Promise<{ tokenId: string; documentId: string }>
}

/**
 * GET /api/eliza/characters/[tokenId]/knowledge/[documentId]
 * Returns a specific knowledge document with full content
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { tokenId, documentId } = await params

    if (!tokenId || !documentId) {
      return NextResponse.json(
        { error: 'Token ID and Document ID are required' },
        { status: 400 }
      )
    }

    const record = await getKnowledgeRecordByTokenId(tokenId)

    if (!record) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    const character = record.character as Record<string, unknown>
    const document = findKnowledgeDocumentById(
      getKnowledgeDocuments(character),
      documentId
    )

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(toKnowledgeDocumentResponse(document), { status: 200 })
  } catch (error) {
    console.error('[Knowledge API] GET document error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch knowledge document' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/eliza/characters/[tokenId]/knowledge/[documentId]
 * Deletes a specific knowledge document
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { tokenId, documentId } = await params

    if (!documentId) {
      return NextResponse.json(
        { error: 'Token ID and Document ID are required' },
        { status: 400 }
      )
    }

    const authorization = await authorizeElizaCharacterMutation(tokenId)

    if (!authorization.authorized) {
      if (authorization.reason === 'missing_token') {
        return NextResponse.json(
          { error: 'Token ID and Document ID are required' },
          { status: 400 }
        )
      }

      if (authorization.reason === 'invalid_token') {
        return NextResponse.json(
          { error: 'Invalid token ID' },
          { status: 400 }
        )
      }

      if (authorization.reason === 'unauthenticated') {
        return NextResponse.json(
          { error: 'UNAUTHORIZED', message: 'Wallet not connected' },
          { status: 401 }
        )
      }

      if (authorization.reason === 'not_found') {
        return NextResponse.json(
          { error: 'Character not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Not character owner' },
        { status: 403 }
      )
    }

    const externalTokenId = authorization.externalId

    const record = await getKnowledgeRecordByTokenId(externalTokenId)

    if (!record) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    const character = record.character as Record<string, unknown>
    const currentKnowledge = getKnowledgeDocuments(character)
    const document = findKnowledgeDocumentById(currentKnowledge, documentId)

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    const updatedRecord = await replaceKnowledgeDocuments(
      record,
      removeKnowledgeDocumentById(currentKnowledge, documentId)
    )

    const syncResult = await deleteKnowledgeDocumentFromOfficial({
      tokenId: externalTokenId,
      record: updatedRecord,
      document,
    })

    if (syncResult.attempted && !syncResult.ok) {
      console.warn('[Knowledge API] Official knowledge delete sync failed:', syncResult.error)

      if (elizaConfig.mode === 'official') {
        return NextResponse.json(
          { error: 'Failed to sync knowledge deletion' },
          { status: 502 }
        )
      }
    }

    return NextResponse.json(
      { success: true, message: 'Document deleted' },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Knowledge API] DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete knowledge document' },
      { status: 500 }
    )
  }
}
