'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import type { Dispatch, SetStateAction } from 'react'
import type { Character } from '@/types/character'

interface UseCharacterDetailDataReturn {
  character: Character | null
  setCharacter: Dispatch<SetStateAction<Character | null>>
  isLoading: boolean
  refetchCharacter: () => Promise<void>
}

export function useCharacterDetailData(tokenId: number): UseCharacterDetailDataReturn {
  const [character, setCharacter] = useState<Character | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refetchCharacter = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/characters/${tokenId}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('Failed to fetch character')
      setCharacter(await response.json())
    } catch (error) {
      console.error('Error fetching character:', error)
      toast.error('Failed to load character')
    } finally {
      setIsLoading(false)
    }
  }, [tokenId])

  useEffect(() => {
    refetchCharacter()
  }, [refetchCharacter])

  return {
    character,
    setCharacter,
    isLoading,
    refetchCharacter,
  }
}
