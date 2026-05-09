import type { Character } from '@/types/character'

export type CharacterTraitFilters = {
  origin?: string
  alignment?: string
  the17?: string
  armor?: string
  back?: string
  mask?: string
}

export interface CharacterRuntimeAssets {
  hydrateCharacter<T extends Character>(character: T): Promise<T>
  hydrateCharacters<T extends Character>(characters: T[]): Promise<T[]>
  getTraitCounts(traitType: string): Promise<Map<string, number> | null>
  getTokenIdsForTraitFilters(filters: CharacterTraitFilters): Promise<Set<number> | null>
  getTotalCharacters(): Promise<number | null>
}

export const noopCharacterRuntimeAssets: CharacterRuntimeAssets = {
  async hydrateCharacter<T extends Character>(character: T): Promise<T> {
    return character
  },
  async hydrateCharacters<T extends Character>(characters: T[]): Promise<T[]> {
    return characters
  },
  async getTraitCounts(): Promise<Map<string, number> | null> {
    return null
  },
  async getTokenIdsForTraitFilters(): Promise<Set<number> | null> {
    return null
  },
  async getTotalCharacters(): Promise<number | null> {
    return null
  },
}
