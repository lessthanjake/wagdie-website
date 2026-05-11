import type { Character } from '@/types/character'

export function canEditCharacterForAddress(
  character: Pick<Character, 'owner_address' | 'staker_address'> | null | undefined,
  userAddress: string | null | undefined,
  userIsAdmin: boolean
): boolean {
  if (!character || !userAddress) return false
  if (userIsAdmin) return true

  const address = userAddress.toLowerCase()
  const owner = character.owner_address?.toLowerCase()
  const staker = character.staker_address?.toLowerCase()

  return owner === address || staker === address
}
