'use client'

import { AIPersonaTab } from '@/components/characters/ai-editor'
import { CharacterWalletTab } from '@/components/characters/detail/CharacterWalletTab'
import { Card, CardContent, Tabs } from '@/components/ui'
import type { TabItem } from '@/components/ui'
import type { Character } from '@/types/character'
import type { UseCharacterEditorReturn } from '@/hooks/useCharacterEditor'

export type CharacterAppendixTab = 'ai-persona' | 'on-chain'

interface CharacterAppendixSectionProps {
  activeTab: CharacterAppendixTab
  onTabChange: (tabId: CharacterAppendixTab) => void
  tokenId: number
  character: Character
  name: string
  isOwner: boolean
  editor: Pick<UseCharacterEditorReturn, 'state'>
}

const appendixTabs: TabItem[] = [
  { id: 'ai-persona', label: 'ai persona' },
  { id: 'on-chain', label: 'on-chain' },
]

export function CharacterAppendixSection({
  activeTab,
  onTabChange,
  tokenId,
  character,
  name,
  isOwner,
  editor,
}: CharacterAppendixSectionProps) {
  return (
    <section aria-labelledby="character-appendix-heading" className="mt-8">
      <div className="mb-4">
        <h2 id="character-appendix-heading" className="text-h3 font-display text-bone tracking-widest lowercase">
          appendix
        </h2>
        <p className="text-body-sm text-ash font-eskapade">
          supporting systems for persona memory and on-chain holdings.
        </p>
      </div>
      <Card>
        <CardContent className="p-4 sm:p-6">
          <Tabs
            id="character-appendix-tabs"
            items={appendixTabs}
            activeId={activeTab}
            onChange={(tabId) => onTabChange(tabId === 'on-chain' ? 'on-chain' : 'ai-persona')}
          />
          <div className="mt-6">
            {activeTab === 'ai-persona' && (
              <AIPersonaTab
                tokenId={String(tokenId)}
                isOwner={isOwner}
                characterName={name}
                characterBackstory={editor.state.story}
              />
            )}
            {activeTab === 'on-chain' && (
              <CharacterWalletTab
                tokenId={tokenId}
                ownerAddress={character.owner_address ?? null}
                stakerAddress={character.staker_address ?? null}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
