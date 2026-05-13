'use client'

/**
 * CharacterStoryTab Component
 * Displays and edits the character's background story.
 * Extracted from page.tsx to reduce complexity.
 */

import { SheetBackgroundStory } from '@/components/characters/SheetBackgroundStory'

interface CharacterStoryTabProps {
  story: string
  isEditMode: boolean
  isOwner: boolean
  onChange: (story: string) => void
  variant?: 'card' | 'inline'
}

export function CharacterStoryTab({
  story,
  isEditMode,
  isOwner,
  onChange,
  variant = 'card',
}: CharacterStoryTabProps) {
  return (
    <SheetBackgroundStory
      story={story}
      isEditMode={isEditMode}
      isOwner={isOwner}
      onChange={onChange}
      variant={variant}
    />
  )
}
