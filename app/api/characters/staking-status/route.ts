/**
 * Staking Status API Route
 * GET handler for batch staking status lookup by token IDs
 * Returns staking status from database (not blockchain)
 */

import { syncStakingState } from '@/lib/services/sync/staking-state-sync'
import { NextRequest, NextResponse } from 'next/server'
import { parseCsvNumberList } from '@/lib/api/params'
import { activityRepository } from '@/lib/repositories/activity-repository'

export const dynamic = 'force-dynamic'

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store',
} as const

type StakingSource = 'db' | 'chain'

interface StakingStatusResponse {
  tokenId: number
  isStaked: boolean
  locationId: string | null
}

interface ApiResponse {
  statuses: StakingStatusResponse[]
  error?: string
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const searchParams = request.nextUrl.searchParams
    const tokenIdsParam = searchParams.get('tokenIds')
    const sourceParam = searchParams.get('source')

    const source: StakingSource =
      sourceParam === 'chain' ? 'chain' : 'db'

    if (sourceParam && sourceParam !== 'db' && sourceParam !== 'chain') {
      return NextResponse.json(
        { statuses: [], error: 'source must be either "db" or "chain"' },
        { status: 400, headers: NO_STORE_HEADERS }
      )
    }

    if (!tokenIdsParam) {
      return NextResponse.json(
        { statuses: [], error: 'tokenIds parameter is required' },
        { status: 400, headers: NO_STORE_HEADERS }
      )
    }

    // Parse token IDs from comma-separated string
    const tokenIds = parseCsvNumberList(tokenIdsParam, { min: 1 })

    if (tokenIds.length === 0) {
      return NextResponse.json(
        { statuses: [] },
        { headers: NO_STORE_HEADERS }
      )
    }

    // Limit to 500 token IDs per request to prevent abuse
    if (tokenIds.length > 500) {
      return NextResponse.json(
        { statuses: [], error: 'Maximum 500 token IDs per request' },
        { status: 400, headers: NO_STORE_HEADERS }
      )
    }

    if (source === 'chain') {
      // Read-through cache pattern: chain is truth, DB is refreshed as a side effect.
      const { results } = await syncStakingState({ tokenIds })

      const byTokenId = new Map<number, { chainLocationId: string }>()
      for (const r of results) {
        byTokenId.set(r.tokenId, { chainLocationId: r.chainLocationId })
      }

      const statuses: StakingStatusResponse[] = tokenIds.map((tokenId) => {
        const row = byTokenId.get(tokenId)
        const chainLocationId = row?.chainLocationId ?? ''

        const locationId =
          chainLocationId && chainLocationId !== '0'
            ? chainLocationId
            : null

        return {
          tokenId,
          isStaked: locationId !== null,
          locationId,
        }
      })

      return NextResponse.json(
        { statuses },
        { headers: NO_STORE_HEADERS }
      )
    }

    // Default: Query database for staking status (location_id)
    let rows = []
    try {
      rows = await activityRepository.findStakingStatusRows(tokenIds)
    } catch (error) {
      console.error('Error fetching staking status:', error)
      return NextResponse.json(
        { statuses: [], error: 'Failed to fetch staking status' },
        { status: 500, headers: NO_STORE_HEADERS }
      )
    }

    // Build response with staking status
    const statusMap = new Map<number, { location_id: string | null }>()
    for (const row of rows) {
      statusMap.set(row.token_id, { location_id: row.location_id })
    }

    // Build response array for all requested token IDs
    const statuses: StakingStatusResponse[] = tokenIds.map(tokenId => {
      const record = statusMap.get(tokenId)
      const locationId = record?.location_id ?? null
      return {
        tokenId,
        isStaked: locationId !== null,
        locationId,
      }
    })

    return NextResponse.json(
      { statuses },
      { headers: NO_STORE_HEADERS }
    )
  } catch (error) {
    console.error('Error in staking-status API:', error)
    return NextResponse.json(
      { statuses: [], error: 'Internal server error' },
      { status: 500, headers: NO_STORE_HEADERS }
    )
  }
}
