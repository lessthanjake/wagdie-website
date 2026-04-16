import { characterLocalAssets } from '@/lib/services/assets/character-local-assets'
import { CharacterRepository } from './character-repository'

export const serverCharacterRepository = new CharacterRepository({
  runtimeAssets: characterLocalAssets,
})

export const getServerStakedCharacters = () => serverCharacterRepository.getStakedCharacters()
