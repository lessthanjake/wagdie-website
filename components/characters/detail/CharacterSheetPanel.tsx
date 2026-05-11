'use client'

import { NameEditor } from '@/components/characters/NameEditor'
import { CoreStatsEditor } from '@/components/characters/CoreStatsEditor'
import { DerivedStatsEditor } from '@/components/characters/DerivedStatsEditor'
import { LevelExperienceEditor } from '@/components/characters/LevelExperienceEditor'
import { EmptyStatsPrompt } from '@/components/characters/EmptyStatsPrompt'
import { NFTTraitsDisplay } from '@/components/characters/NFTTraitsDisplay'
import { CharacterActions } from '@/components/characters/detail/CharacterActions'
import { Card, CardContent, Button } from '@/components/ui'
import type { Character } from '@/types/character'
import type { UseCharacterEditorReturn } from '@/hooks/useCharacterEditor'

interface CharacterSheetPanelProps {
  tokenId: number
  character: Character
  name: string
  isOwner: boolean
  isEditMode: boolean
  editor: Pick<
    UseCharacterEditorReturn,
    | 'state'
    | 'setName'
    | 'setCoreStats'
    | 'setDerivedStats'
    | 'setLevelExp'
    | 'assignDefaultStats'
  >
  showLoreNav: boolean
  onAddCommunityStory: () => void
  onEnterEditMode: () => void
  onSear: () => void
  onInfect: () => void
  onCure: () => void
}

export function CharacterSheetPanel({
  tokenId,
  character,
  name,
  isOwner,
  isEditMode,
  editor,
  showLoreNav,
  onAddCommunityStory,
  onEnterEditMode,
  onSear,
  onInfect,
  onCure,
}: CharacterSheetPanelProps) {
  const level = character.level ?? character.metadata?.level ?? 1
  const attrs = {
    str: character.str || 0,
    dex: character.dex || 0,
    con: character.con || 0,
    int: character.int || 0,
    wis: character.wis || 0,
    cha: character.cha || 0,
  }
  const hasCharacterSheet = attrs.str > 0 || attrs.dex > 0 || attrs.con > 0 || attrs.int > 0 || attrs.wis > 0 || attrs.cha > 0
  const hasAnyStats = (character.str ?? 0) > 0 || (character.dex ?? 0) > 0 || (character.hp ?? 0) > 0 || (character.level ?? 1) > 1

  const handleAssignStats = () => {
    editor.assignDefaultStats()
    onEnterEditMode()
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <NameEditor
          name={isEditMode ? editor.state.name : name}
          isOwner={isOwner}
          isEditMode={isEditMode}
          onChange={editor.setName}
          className="mb-2"
        />
        <LevelExperienceEditor
          stats={isEditMode ? editor.state.levelExp : { level, experience: character.experience ?? null }}
          characterClass={character.class}
          isOwner={isOwner}
          isEditMode={isEditMode}
          onChange={editor.setLevelExp}
        />
        <NFTTraitsDisplay metadata={character.metadata} showIdentityOnly className="mt-3" />
      </div>

      <div className="mb-6">
        <DerivedStatsEditor
          stats={isEditMode ? editor.state.derivedStats : { hp: character.hp ?? null, max_hp: character.max_hp ?? null, ac: character.ac ?? null, speed: character.speed ?? null }}
          isOwner={isOwner}
          isEditMode={isEditMode}
          onChange={editor.setDerivedStats}
        />
        {!isEditMode && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-midnight/50">
              <CardContent className="p-3 text-center">
                <p className="text-[20px] font-display tracking-widest text-mist mb-1 lowercase">token</p>
                <p className="text-2xl font-display text-bone">#{tokenId}</p>
              </CardContent>
            </Card>
          </div>
        )}
        {showLoreNav && !isEditMode && (
          <Button
            type="button"
            variant="secondary"
            onClick={onAddCommunityStory}
            className="mt-4"
          >
            Add community story
          </Button>
        )}
      </div>

      {(hasCharacterSheet || (isOwner && isEditMode)) && (
        <CoreStatsEditor
          stats={isEditMode ? editor.state.coreStats : attrs}
          isOwner={isOwner}
          isEditMode={isEditMode}
          onChange={editor.setCoreStats}
        />
      )}
      {isOwner && !hasAnyStats && !isEditMode && <EmptyStatsPrompt onAssignStats={handleAssignStats} />}
      {isOwner && (
        <CharacterActions
          isInfected={character.infection_status === 'infected'}
          onSear={onSear}
          onInfect={onInfect}
          onCure={onCure}
        />
      )}
    </div>
  )
}
