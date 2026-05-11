'use client'

import { useEffect } from 'react'

interface UseCharacterEditGuardsInput {
  isEditMode: boolean
  hasUnsavedChanges: boolean
  onCancelEdit: () => void
}

export function useCharacterEditGuards({
  isEditMode,
  hasUnsavedChanges,
  onCancelEdit,
}: UseCharacterEditGuardsInput): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isEditMode) {
        if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Cancel?')) return
        onCancelEdit()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [hasUnsavedChanges, isEditMode, onCancelEdit])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && isEditMode) {
        event.preventDefault()
        event.returnValue = 'You have unsaved changes. Leave?'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges, isEditMode])
}
