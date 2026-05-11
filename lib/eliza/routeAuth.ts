import { getCharacterMutationAuthorization } from '@/lib/auth/character-permissions'
import type { Character } from '@/types/character'

export type ElizaCharacterMutationAuthorization =
  | {
      authorized: true
      tokenId: number
      externalId: string
      address: string
      character: Character
      isAdmin: boolean
    }
  | {
      authorized: false
      reason: 'missing_token' | 'invalid_token' | 'unauthenticated' | 'not_found' | 'forbidden'
    }

export function parseCanonicalElizaTokenId(
  tokenId: string | null | undefined
): { tokenId: number; externalId: string } | null {
  if (!tokenId || !/^(0|[1-9]\d*)$/.test(tokenId)) {
    return null
  }

  const parsedTokenId = Number(tokenId)
  if (!Number.isSafeInteger(parsedTokenId) || parsedTokenId < 0) {
    return null
  }

  return { tokenId: parsedTokenId, externalId: String(parsedTokenId) }
}

export async function authorizeElizaCharacterMutation(
  tokenId: string | null | undefined
): Promise<ElizaCharacterMutationAuthorization> {
  if (!tokenId) {
    return { authorized: false, reason: 'missing_token' }
  }

  const parsed = parseCanonicalElizaTokenId(tokenId)
  if (!parsed) {
    return { authorized: false, reason: 'invalid_token' }
  }

  const authorization = await getCharacterMutationAuthorization(parsed.tokenId)

  if (!authorization.authorized) {
    return { authorized: false, reason: authorization.reason }
  }

  return {
    authorized: true,
    tokenId: parsed.tokenId,
    externalId: parsed.externalId,
    address: authorization.address,
    character: authorization.character,
    isAdmin: authorization.isAdmin,
  }
}
