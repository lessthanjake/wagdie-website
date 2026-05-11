/**
 * Shared WAGDIE character mutation authorization helpers.
 *
 * Mutations are allowed for admins, current owners, and current stakers.
 */

import { getSession } from '@/lib/auth/session'
import { isAdmin } from '@/lib/auth/admin'
import { getCharacter } from '@/lib/services/character-service'
import { canEditCharacterForAddress } from '@/lib/domain/character/ownership'
import type { Character } from '@/types/character'

export type CharacterMutationAuthorization =
  | {
      authorized: true
      address: string
      character: Character
      isAdmin: boolean
    }
  | {
      authorized: false
      reason: 'unauthenticated' | 'not_found' | 'forbidden'
      address?: string
      character?: Character
      isAdmin?: boolean
    }

/**
 * Check if a user can edit a character.
 * Allows editing if:
 * - User is an admin, OR
 * - User's address matches the owner_address (unstaked ownership), OR
 * - User's address matches the staker_address (staked ownership - user is the staker)
 */
export function canEditCharacter(
  character: Character,
  userAddress: string,
  userIsAdmin: boolean
): boolean {
  return canEditCharacterForAddress(character, userAddress, userIsAdmin)
}

export async function getCharacterMutationAuthorization(
  tokenId: number
): Promise<CharacterMutationAuthorization> {
  const session = await getSession()

  if (!session.address) {
    return { authorized: false, reason: 'unauthenticated' }
  }

  const character = await getCharacter(tokenId)

  if (!character) {
    return {
      authorized: false,
      reason: 'not_found',
      address: session.address,
    }
  }

  const userIsAdmin = isAdmin(session.address)

  if (!canEditCharacter(character, session.address, userIsAdmin)) {
    return {
      authorized: false,
      reason: 'forbidden',
      address: session.address,
      character,
      isAdmin: userIsAdmin,
    }
  }

  return {
    authorized: true,
    address: session.address,
    character,
    isAdmin: userIsAdmin,
  }
}
