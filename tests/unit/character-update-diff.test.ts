import { buildCharacterUpdateDiff } from '@/lib/domain/character/update-diff'
import type { Character } from '@/types/character'
import type { CharacterEditorState } from '@/hooks/useCharacterEditor'

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    token_id: 1,
    name: 'Grim One',
    background_story: 'Original story',
    str: 10,
    dex: 11,
    con: 12,
    int: 13,
    wis: 14,
    cha: 15,
    hp: 20,
    max_hp: 25,
    ac: 16,
    speed: 30,
    level: 2,
    experience: 100,
    ...overrides,
  }
}

function makeState(overrides: Partial<CharacterEditorState> = {}): CharacterEditorState {
  return {
    name: 'Grim One',
    story: 'Original story',
    coreStats: { str: 10, dex: 11, con: 12, int: 13, wis: 14, cha: 15 },
    derivedStats: { hp: 20, max_hp: 25, ac: 16, speed: 30 },
    levelExp: { level: 2, experience: 100 },
    ...overrides,
  }
}

describe('buildCharacterUpdateDiff', () => {
  it('returns an empty object when there are no changes', () => {
    expect(buildCharacterUpdateDiff(makeCharacter(), makeState())).toEqual({})
  })

  it('uses existing name fallback behavior with || metadata fallback', () => {
    const character = makeCharacter({ name: '', metadata: { name: 'Metadata Name' } })
    const state = makeState({ name: '' })

    expect(buildCharacterUpdateDiff(character, state)).toEqual({ name: '' })
  })

  it('uses nullish story fallback behavior with metadata fallback', () => {
    const character = makeCharacter({ background_story: '', metadata: { background_story: 'Metadata story' } })
    const state = makeState({ story: '' })

    expect(buildCharacterUpdateDiff(character, state)).toEqual({})
  })

  it('includes changed core stats compared against character fields nullishly', () => {
    const character = makeCharacter({ str: undefined, dex: 11 })
    const state = makeState({
      coreStats: { str: 10, dex: 12, con: 12, int: 13, wis: 14, cha: 15 },
    })

    expect(buildCharacterUpdateDiff(character, state)).toEqual({ str: 10, dex: 12 })
  })

  it('includes changed derived stats compared against character fields nullishly', () => {
    const character = makeCharacter({ hp: undefined, max_hp: 25 })
    const state = makeState({
      derivedStats: { hp: 10, max_hp: 30, ac: 16, speed: 30 },
    })

    expect(buildCharacterUpdateDiff(character, state)).toEqual({ hp: 10, max_hp: 30 })
  })

  it('includes level and experience only when changed', () => {
    const state = makeState({ levelExp: { level: 3, experience: 100 } })

    expect(buildCharacterUpdateDiff(makeCharacter(), state)).toEqual({ level: 3 })
  })

  it('includes multiple changed fields together', () => {
    const state = makeState({
      name: 'Changed',
      story: 'Changed story',
      coreStats: { str: 12, dex: 11, con: 12, int: 13, wis: 14, cha: 15 },
      derivedStats: { hp: 20, max_hp: 30, ac: 16, speed: 35 },
      levelExp: { level: 3, experience: 150 },
    })

    expect(buildCharacterUpdateDiff(makeCharacter(), state)).toEqual({
      name: 'Changed',
      background_story: 'Changed story',
      str: 12,
      max_hp: 30,
      speed: 35,
      level: 3,
      experience: 150,
    })
  })
})
