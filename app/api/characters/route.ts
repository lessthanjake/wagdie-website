/**
 * Characters API Route
 * GET handler for character listing with filters, pagination, and sorting
 */

import { NextRequest } from 'next/server'
import { handleCharacterListGet } from '@/lib/api/handlers/character-list'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return handleCharacterListGet(request)
}
