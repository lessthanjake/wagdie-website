'use client'

import { NameEditor } from '@/components/characters/NameEditor'
import type { UseCharacterEditorReturn } from '@/hooks/useCharacterEditor'

interface CharacterIdentityStatsPanelProps {
  name: string
  isOwner: boolean
  isEditMode: boolean
  editor: Pick<UseCharacterEditorReturn, 'state' | 'setName'>
}

export function CharacterIdentityStatsPanel({
  name,
  isOwner,
  isEditMode,
  editor,
}: CharacterIdentityStatsPanelProps) {
  return (
    <section aria-labelledby="character-identity-heading" className="border-b border-midnight-light/40 pb-6">
      <h2 id="character-identity-heading" className="sr-only">Character identity</h2>
      <NameEditor
        name={isEditMode ? editor.state.name : name}
        isOwner={isOwner}
        isEditMode={isEditMode}
        onChange={editor.setName}
        className="max-w-3xl"
      />
    </section>
  )
}
