'use client'

import { NFTTraitsDisplay } from '@/components/characters/NFTTraitsDisplay'
import { AIPersonaTab } from '@/components/characters/ai-editor'
import { CharacterStoryTab } from '@/components/characters/detail/CharacterStoryTab'
import { CharacterEquipmentTab } from '@/components/characters/detail/CharacterEquipmentTab'
import { CharacterWalletTab } from '@/components/characters/detail/CharacterWalletTab'
import { Separator, Tabs } from '@/components/ui'
import type { TabItem } from '@/components/ui'
import type { Character } from '@/types/character'
import type { UseCharacterEditorReturn } from '@/hooks/useCharacterEditor'

interface CharacterTabsSectionProps {
  activeTab: string
  onTabChange: (tabId: string) => void
  tokenId: number
  character: Character
  name: string
  isOwner: boolean
  isEditMode: boolean
  editor: Pick<UseCharacterEditorReturn, 'state' | 'setStory'>
}

const tabs: TabItem[] = [
  { id: 'story', label: 'story' },
  { id: 'ai-persona', label: 'ai persona' },
  { id: 'equipment', label: 'equipment' },
  { id: 'wallet', label: 'wallet' },
]

export function CharacterTabsSection({
  activeTab,
  onTabChange,
  tokenId,
  character,
  name,
  isOwner,
  isEditMode,
  editor,
}: CharacterTabsSectionProps) {
  return (
    <>
      <NFTTraitsDisplay metadata={character.metadata} className="mb-8" />
      <Separator className="mb-8" />
      <Tabs items={tabs} activeId={activeTab} onChange={onTabChange} />
      <div className="mt-6">
        {activeTab === 'story' && (
          <CharacterStoryTab
            story={editor.state.story}
            isEditMode={isEditMode}
            isOwner={isOwner}
            onChange={editor.setStory}
          />
        )}
        {activeTab === 'ai-persona' && (
          <AIPersonaTab
            tokenId={String(tokenId)}
            isOwner={isOwner}
            characterName={name}
            characterBackstory={editor.state.story}
          />
        )}
        {activeTab === 'equipment' && (
          <CharacterEquipmentTab
            equipment={character.equipment ?? null}
            metadataEquipment={character.metadata?.equipment}
            isEditMode={isEditMode}
          />
        )}
        {activeTab === 'wallet' && (
          <CharacterWalletTab
            tokenId={tokenId}
            ownerAddress={character.owner_address ?? null}
            stakerAddress={character.staker_address ?? null}
          />
        )}
      </div>
    </>
  )
}
