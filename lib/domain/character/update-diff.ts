import type { Character, CharacterUpdate } from '@/types/character'
import type { CharacterEditorState } from '@/hooks/useCharacterEditor'

const CORE_STAT_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const
const DERIVED_STAT_KEYS = ['hp', 'max_hp', 'ac', 'speed'] as const

export function buildCharacterUpdateDiff(
  character: Character,
  state: CharacterEditorState
): CharacterUpdate {
  const updates: CharacterUpdate = {}
  const updateRecord = updates as Record<string, unknown>
  const originalName = character.name || character.metadata?.name || ''

  if (state.name !== originalName) {
    updates.name = state.name
  }

  const originalStory = character.background_story ?? character.metadata?.background_story ?? ''

  if (state.story !== originalStory) {
    updates.background_story = state.story
  }

  for (const key of CORE_STAT_KEYS) {
    if (state.coreStats[key] !== (character[key] ?? null)) {
      updateRecord[key] = state.coreStats[key]
    }
  }

  for (const key of DERIVED_STAT_KEYS) {
    if (state.derivedStats[key] !== (character[key] ?? null)) {
      updateRecord[key] = state.derivedStats[key]
    }
  }

  if (state.levelExp.level !== (character.level ?? null)) {
    updateRecord.level = state.levelExp.level
  }

  if (state.levelExp.experience !== (character.experience ?? null)) {
    updateRecord.experience = state.levelExp.experience
  }

  return updates
}
