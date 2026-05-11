import { canEditCharacterForAddress } from '@/lib/domain/character/ownership'
import type { Character } from '@/types/character'

const character = {
  token_id: 1,
  owner_address: '0xOwner',
  staker_address: '0xStaker',
} as Character

describe('canEditCharacterForAddress', () => {
  it('allows an admin with an address to edit', () => {
    expect(canEditCharacterForAddress(character, '0xAdmin', true)).toBe(true)
  })

  it('matches owner address case-insensitively', () => {
    expect(canEditCharacterForAddress(character, '0xowner', false)).toBe(true)
  })

  it('matches staker address case-insensitively', () => {
    expect(canEditCharacterForAddress(character, '0xstaker', false)).toBe(true)
  })

  it('rejects non-owner, non-staker, non-admin users', () => {
    expect(canEditCharacterForAddress(character, '0xOther', false)).toBe(false)
  })

  it('returns false when character is missing', () => {
    expect(canEditCharacterForAddress(null, '0xAdmin', true)).toBe(false)
  })

  it('returns false when user address is missing', () => {
    expect(canEditCharacterForAddress(character, null, true)).toBe(false)
  })
})
