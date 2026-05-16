/**
 * Backwards-compatible Character API Route (singular)
 *
 * Alias for `GET /api/characters` to support older clients expecting `/api/character`.
 */

import { NextRequest } from 'next/server'
import { handleCharacterListGet } from '@/lib/api/handlers/character-list'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return handleCharacterListGet(request)
}
