'use client'

/**
 * CharacterEquipmentTab Component
 * Displays the character's equipment and inventory.
 * Extracted from page.tsx to reduce complexity.
 */

import { SheetEquipment } from '@/components/characters/SheetEquipment'
import type { Equipment } from '@/types/character'

// NFT format equipment type
interface NFTEquipment {
  armor?: string
  back?: string
  mask?: string
}

interface CharacterEquipmentTabProps {
  equipment: Equipment | null
  metadataEquipment: NFTEquipment | null | undefined
  isEditMode: boolean
  variant?: 'card' | 'inline'
}

export function CharacterEquipmentTab({
  equipment,
  metadataEquipment,
  isEditMode,
  variant = 'card',
}: CharacterEquipmentTabProps) {
  return (
    <SheetEquipment
      equipment={equipment}
      metadataEquipment={metadataEquipment}
      isEditMode={isEditMode}
      variant={variant}
    />
  )
}
