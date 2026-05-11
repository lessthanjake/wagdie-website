'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getCharacterImageDisclosure,
  getCharacterImageFallback,
  type CharacterImageDisclosure,
} from '@/lib/utils/image'
import type { CharacterMetadata, InfectionStatus } from '@/types/character'

interface UseCharacterImageDisplayInput {
  tokenId: number
  metadata?: CharacterMetadata | null
  imageUrl?: string | null
  infectionStatus?: InfectionStatus | null
  infected?: boolean | null
}

interface UseCharacterImageDisplayReturn {
  imageDisclosure: CharacterImageDisclosure
  displayedImageUrl: string
  handleImageError: () => void
}

export function useCharacterImageDisplay({
  tokenId,
  metadata,
  imageUrl,
  infectionStatus,
  infected,
}: UseCharacterImageDisplayInput): UseCharacterImageDisplayReturn {
  const imageDisclosure = useMemo(
    () => getCharacterImageDisclosure(tokenId, metadata, imageUrl, {
      infectionStatus,
      isInfected: infected,
    }),
    [tokenId, metadata, imageUrl, infectionStatus, infected]
  )

  const imageCandidates = imageDisclosure.candidates
  const [displayedImageUrl, setDisplayedImageUrl] = useState(imageDisclosure.primaryUrl)

  useEffect(() => {
    setDisplayedImageUrl(imageDisclosure.primaryUrl)
  }, [imageDisclosure.primaryUrl])

  const handleImageError = useCallback(() => {
    setDisplayedImageUrl((current) => {
      const currentIndex = imageCandidates.indexOf(current)
      return imageCandidates[currentIndex + 1] || current || getCharacterImageFallback()
    })
  }, [imageCandidates])

  return {
    imageDisclosure,
    displayedImageUrl,
    handleImageError,
  }
}
