'use client'

import Image from 'next/image'
import { Card, Badge } from '@/components/ui'
import type { CharacterImageDisclosure } from '@/lib/utils/image'
import type { InfectionStatus, StakingStatus } from '@/types/character'

interface CharacterArtworkCardProps {
  name: string
  imageUrl: string
  imageDisclosure: CharacterImageDisclosure
  infectionStatus?: InfectionStatus
  stakingStatus?: StakingStatus
  onImageError: () => void
  frame?: 'card' | 'inline'
}

export function CharacterArtworkCard({
  name,
  imageUrl,
  imageDisclosure,
  infectionStatus,
  stakingStatus,
  onImageError,
  frame = 'card',
}: CharacterArtworkCardProps) {
  const artwork = (
    <div className="relative aspect-square overflow-hidden">
      <Image
        src={imageUrl}
        alt={name}
        fill
        sizes="(max-width: 1024px) 100vw, 40vw"
        className="object-cover [image-rendering:pixelated]"
        priority
        unoptimized
        onError={onImageError}
      />
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
        {infectionStatus === 'infected' && <Badge className="bg-red-900/80 border-red-700 text-red-400">Infected</Badge>}
        {infectionStatus === 'cured' && <Badge className="bg-emerald-900/80 border-emerald-700 text-emerald-400">Cured</Badge>}
        {imageDisclosure.hasSearedImage && <Badge variant="accent">Seared</Badge>}
        {stakingStatus === 'staked' && <Badge variant="accent">Staked</Badge>}
      </div>
    </div>
  )

  return (
    <>
      {frame === 'card' ? (
        <Card className="overflow-hidden">{artwork}</Card>
      ) : (
        <div className="overflow-hidden border border-midnight-light/40 bg-black/20 shadow-2xl">
          {artwork}
        </div>
      )}
      {imageDisclosure.isSearedImageHiddenByInfection && imageDisclosure.searedImageUrl && (
        <div className="mt-3 rounded-lg border border-soul-accent/20 bg-soul-accent/5 p-3 text-sm text-soul-accent font-eskapade">
          Seared artwork has been generated, but infected artwork remains primary while this character is infected.{' '}
          <a
            href={imageDisclosure.searedImageUrl}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:text-bone"
          >
            View seared image
          </a>
        </div>
      )}
    </>
  )
}
