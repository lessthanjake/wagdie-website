import { NextRequest, NextResponse } from 'next/server'
import { syncStakingState } from '@/lib/services/sync/staking-state-sync'

export const dynamic = 'force-dynamic'

const MAX_TOKEN_IDS = 50

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store',
} as const

type SyncResult = {
  tokenId: number
  success: boolean
  locationId: string | null
  chainLocationId: string
  error?: string
}

function parseTokenIds(input: unknown): number[] | null {
  if (!Array.isArray(input)) return null

  const parsed: number[] = []
  for (const value of input) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
      return null
    }
    parsed.push(value)
  }

  return parsed
}

function uniqueNumbers(values: number[]): number[] {
  const seen = new Set<number>()
  const out: number[] = []
  for (const value of values) {
    if (seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}

export async function POST(request: NextRequest) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { results: [], error: 'Invalid JSON body' },
      { status: 400, headers: NO_STORE_HEADERS }
    )
  }

  const tokenIds = parseTokenIds((body as { tokenIds?: unknown })?.tokenIds)
  if (!tokenIds) {
    return NextResponse.json(
      { results: [], error: 'tokenIds must be an array of positive integers' },
      { status: 400, headers: NO_STORE_HEADERS }
    )
  }

  if (tokenIds.length === 0) {
    return NextResponse.json(
      { results: [], error: 'tokenIds must not be empty' },
      { status: 400, headers: NO_STORE_HEADERS }
    )
  }

  if (tokenIds.length > MAX_TOKEN_IDS) {
    return NextResponse.json(
      { results: [], error: `Maximum ${MAX_TOKEN_IDS} tokenIds per request` },
      { status: 400, headers: NO_STORE_HEADERS }
    )
  }

  const uniqueTokenIds = uniqueNumbers(tokenIds)

  try {
    const { results: sharedResults } = await syncStakingState({
      tokenIds: uniqueTokenIds,
    })

    const results: SyncResult[] = sharedResults.map((r) => ({
      tokenId: r.tokenId,
      success: r.success,
      locationId: r.locationId,
      chainLocationId: r.chainLocationId,
      ...(r.error ? { error: r.error } : {}),
    }))

    return NextResponse.json({ results }, { headers: NO_STORE_HEADERS })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to sync staking status'
    return NextResponse.json(
      { results: [], error: message },
      { status: 500, headers: NO_STORE_HEADERS }
    )
  }
}
