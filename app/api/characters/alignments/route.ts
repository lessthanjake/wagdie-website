/**
 * Alignments API Route
 * GET handler for fetching available character alignments with counts
 */

import { NextResponse } from 'next/server'
import { serverCharacterRepository } from '@/lib/repositories/character-repository.server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const result = await serverCharacterRepository.getAlignments()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching alignments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alignments' },
      { status: 500 }
    )
  }
}
