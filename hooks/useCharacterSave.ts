'use client'

import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { buildCharacterUpdateDiff } from '@/lib/domain/character/update-diff'
import type { Dispatch, SetStateAction } from 'react'
import type { Character } from '@/types/character'
import type { CharacterEditorState } from '@/hooks/useCharacterEditor'

interface UseCharacterSaveInput {
  tokenId: number
  character: Character | null
  editorState: CharacterEditorState
  setCharacter: Dispatch<SetStateAction<Character | null>>
  onSaved: () => void
  onNoChanges: () => void
}

interface UseCharacterSaveReturn {
  isSaving: boolean
  saveCharacter: () => Promise<void>
}

export function useCharacterSave({
  tokenId,
  character,
  editorState,
  setCharacter,
  onSaved,
  onNoChanges,
}: UseCharacterSaveInput): UseCharacterSaveReturn {
  const [isSaving, setIsSaving] = useState(false)

  const saveCharacter = useCallback(async () => {
    if (!character) return

    try {
      setIsSaving(true)
      const updates = buildCharacterUpdateDiff(character, editorState)

      if (!Object.keys(updates).length) {
        onNoChanges()
        toast.success('No changes')
        return
      }

      const response = await fetch(`/api/characters/${tokenId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.details && Array.isArray(errorData.details)) {
          throw new Error(`${errorData.error}: ${errorData.details.join(', ')}`)
        }
        throw new Error(errorData.error || 'Failed to update')
      }

      setCharacter(await response.json())
      onSaved()
      toast.success('Character updated!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [character, editorState, onNoChanges, onSaved, setCharacter, tokenId])

  return {
    isSaving,
    saveCharacter,
  }
}
