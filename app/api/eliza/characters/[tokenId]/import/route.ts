/**
 * Import API Route
 * POST /api/eliza/characters/[tokenId]/import
 * Imports character configuration from standard Eliza character JSON
 */

import { NextRequest, NextResponse } from 'next/server'
import { getElizaClient } from '@/lib/eliza/client'
import { elizaConfig } from '@/lib/eliza/config'
import { recordPersonaMigrationSuccess, syncOfficialPersonaShadow } from '@/lib/eliza/personaMigration'
import { getCharacterRecordByExternalId } from '@/lib/eliza/characterResolver'
import { mergeAgentCharacter } from '@/lib/eliza/sdkAdapter'
import { authorizeElizaCharacterMutation } from '@/lib/eliza/routeAuth'
import { elizaCharacterExportSchema } from '@/lib/eliza/validation'
import { normalizeCharacterSheetImport } from '@/lib/eliza/character-sheet-policy'

interface RouteParams {
  params: Promise<{ tokenId: string }>
}

interface ImportResult {
  success: boolean
  imported: string[]
  skipped: string[]
  warnings: string[]
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { tokenId } = await params

    const authorization = await authorizeElizaCharacterMutation(tokenId)

    if (!authorization.authorized) {
      if (authorization.reason === 'missing_token') {
        return NextResponse.json(
          { error: 'Token ID is required' },
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

    // Parse request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Validate against Eliza character schema
    const parseResult = elizaCharacterExportSchema.safeParse(body)

    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }))

      return NextResponse.json(
        {
          error: 'Invalid character format',
          details: errors,
        },
        { status: 400 }
      )
    }

    const importResult = normalizeCharacterSheetImport(body)
    const result: ImportResult = {
      success: true,
      imported: importResult.imported,
      skipped: importResult.skipped,
      warnings: importResult.warnings,
    }

    // Get current character using canonical record lookup
    const client = getElizaClient()
    const record = await getCharacterRecordByExternalId(client, externalTokenId)

    if (!record) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    // Merge safe imported patch with existing character while preserving backend-owned keys
    const updatedCharacter = mergeAgentCharacter(record.character, importResult.agentPatch)

    // Update character using canonical replaceRecord
    const updatedRecord = await client.characters.replaceRecord(record.id, { character: updatedCharacter })

    if (elizaConfig.mode === 'dual') {
      await syncOfficialPersonaShadow({
        tokenId: externalTokenId,
        legacyCharacterId: updatedRecord.id,
        character: updatedRecord.character,
      })
    } else if (elizaConfig.mode === 'official') {
      await recordPersonaMigrationSuccess({
        tokenId: externalTokenId,
        officialAgentId: updatedRecord.id,
      })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('[Import API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to import character' },
      { status: 500 }
    )
  }
}
