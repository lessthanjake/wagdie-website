/**
 * Origins API Route
 * GET handler for fetching available character origins with counts
 */

import { NextResponse } from 'next/server'
import { serverCharacterRepository } from '@/lib/repositories/character-repository.server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const result = await serverCharacterRepository.getOrigins()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching origins:', error)
    return NextResponse.json(
      { error: 'Failed to fetch origins' },
      { status: 500 }
    )
  }
}
