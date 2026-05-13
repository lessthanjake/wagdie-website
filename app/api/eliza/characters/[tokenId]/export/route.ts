/**
 * Export API Route
 * GET /api/eliza/characters/[tokenId]/export
 * Exports character configuration as standard Eliza character JSON
 */

import { NextRequest, NextResponse } from 'next/server'
import { getElizaClient } from '@/lib/eliza/client'
import { getCharacterRecordByExternalId } from '@/lib/eliza/characterResolver'
import { buildCharacterSheetExport } from '@/lib/eliza/character-sheet-policy'

interface RouteParams {
  params: Promise<{ tokenId: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { tokenId } = await params

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      )
    }

    // Get character using canonical record lookup
    const client = getElizaClient()
    const record = await getCharacterRecordByExternalId(client, tokenId)

    if (!record) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    const exportData = buildCharacterSheetExport(record.character)

    // Generate filename
    const name = record.character.name || 'character'
    const sanitizedName = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const filename = `${sanitizedName}-character.json`

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[Export API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to export character' },
      { status: 500 }
    )
  }
}
