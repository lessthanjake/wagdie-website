'use client'

import { CharacterEquipmentTab } from '@/components/characters/detail/CharacterEquipmentTab'
import type { Character } from '@/types/character'

interface CharacterEquipmentSectionProps {
  character: Character
  isEditMode: boolean
}

export function CharacterEquipmentSection({
  character,
  isEditMode,
}: CharacterEquipmentSectionProps) {
  return (
    <section aria-labelledby="character-equipment-heading" className="border-t border-midnight-light/40 pt-6">
      <div className="mb-4">
        <h2 id="character-equipment-heading" className="text-h3 font-display text-bone tracking-widest lowercase">
          equipment
        </h2>
        <p className="text-body-sm text-ash font-eskapade">
          arms, armor, relics, and spoils carried into the dark.
        </p>
      </div>
      <CharacterEquipmentTab
        equipment={character.equipment ?? null}
        metadataEquipment={character.metadata?.equipment}
        isEditMode={isEditMode}
        variant="inline"
      />
    </section>
  )
}
