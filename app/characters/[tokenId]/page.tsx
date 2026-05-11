'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  CharacterHeader,
  CharacterModals,
  CharacterArtworkCard,
  CharacterSheetPanel,
  CharacterTabsSection,
} from '@/components/characters/detail'
import { useCharacterEditor } from '@/hooks/useCharacterEditor'
import { useCharacterDetailData } from '@/hooks/useCharacterDetailData'
import { useCharacterSave } from '@/hooks/useCharacterSave'
import { useCharacterImageDisplay } from '@/hooks/useCharacterImageDisplay'
import { useCharacterEditGuards } from '@/hooks/useCharacterEditGuards'
import { Card, CardTitle, CardContent, CardDescription, Button, Spinner } from '@/components/ui'
import { isAdmin } from '@/lib/auth/admin'
import { canEditCharacterForAddress } from '@/lib/domain/character/ownership'
import { useChatDock } from '@/contexts/ChatDockContext'

const showLoreNav = process.env.NEXT_PUBLIC_SHOW_LORE_NAV === 'true'

export default function CharacterDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { address } = useAccount()
  const { openChat } = useChatDock()
  const tokenId = parseInt(params.tokenId as string, 10)

  const [isEditMode, setIsEditMode] = useState(false)
  const [isSearingModalOpen, setIsSearingModalOpen] = useState(false)
  const [isInfectionModalOpen, setIsInfectionModalOpen] = useState(false)
  const [isCureModalOpen, setIsCureModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('story')

  const { character, setCharacter, isLoading, refetchCharacter } = useCharacterDetailData(tokenId)
  const editor = useCharacterEditor({ character, isLoading })
  const userIsAdmin = isAdmin(address)
  const isOwner = canEditCharacterForAddress(character, address, userIsAdmin)

  const name = character?.name || character?.metadata?.name || `Character #${tokenId}`
  const { imageDisclosure, displayedImageUrl, handleImageError } = useCharacterImageDisplay({
    tokenId,
    metadata: character?.metadata,
    imageUrl: character?.image_url,
    infectionStatus: character?.infection_status,
    infected: character?.infected,
  })

  useEffect(() => {
    if (searchParams.get('tab') === 'ai-persona') {
      setActiveTab('ai-persona')
    }
  }, [searchParams])

  useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    const shouldOpenSearing = query.get('sear') === 'true' || query.get('searing') === 'true'
    if (shouldOpenSearing && isOwner) {
      setIsSearingModalOpen(true)
    }
  }, [isOwner])

  const handleCancelEdit = useCallback(() => {
    editor.reset()
    setIsEditMode(false)
  }, [editor])

  const handleEditToggle = useCallback(() => {
    if (isEditMode) {
      handleCancelEdit()
      return
    }

    setIsEditMode(true)
  }, [handleCancelEdit, isEditMode])

  const handleSaveComplete = useCallback(() => {
    setIsEditMode(false)
  }, [])

  const { isSaving, saveCharacter } = useCharacterSave({
    tokenId,
    character,
    editorState: editor.state,
    setCharacter,
    onSaved: handleSaveComplete,
    onNoChanges: handleSaveComplete,
  })

  useCharacterEditGuards({
    isEditMode,
    hasUnsavedChanges: editor.hasUnsavedChanges,
    onCancelEdit: handleCancelEdit,
  })

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-soul-950">
      <div className="flex flex-col items-center gap-4"><Spinner size="lg" /><p className="text-neutral-500 font-display tracking-widest text-sm">Loading Character</p></div>
    </div>
  )

  if (!character) return (
    <div className="min-h-screen flex items-center justify-center bg-soul-950">
      <Card className="max-w-md text-center">
        <CardContent className="py-12">
          <div className="text-6xl mb-4 opacity-30">☠</div>
          <CardTitle className="mb-2">Character Not Found</CardTitle>
          <CardDescription>Token ID #{tokenId} does not exist.</CardDescription>
          <Button variant="secondary" onClick={() => router.push('/characters')} className="mt-6">Back to Characters</Button>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen bg-soul-950">
      <CharacterHeader
        tokenId={tokenId}
        isOwner={isOwner}
        isEditMode={isEditMode}
        isSaving={isSaving}
        onBack={() => router.push('/characters')}
        onEdit={handleEditToggle}
        onSave={saveCharacter}
        onCancel={handleEditToggle}
        onChat={() => openChat({ tokenId: String(tokenId), characterName: name })}
        onAnimated={() => router.push(`/characters/${tokenId}/animated`)}
      />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          <div className="lg:col-span-5">
            <CharacterArtworkCard
              name={name}
              imageUrl={displayedImageUrl}
              imageDisclosure={imageDisclosure}
              infectionStatus={character.infection_status}
              stakingStatus={character.staking_status}
              onImageError={handleImageError}
            />
          </div>

          <div className="lg:col-span-5">
            <CharacterSheetPanel
              tokenId={tokenId}
              character={character}
              name={name}
              isOwner={isOwner}
              isEditMode={isEditMode}
              editor={editor}
              showLoreNav={showLoreNav}
              onAddCommunityStory={() => router.push(`/lore/submit?tokenId=${tokenId}`)}
              onEnterEditMode={() => setIsEditMode(true)}
              onSear={() => setIsSearingModalOpen(true)}
              onInfect={() => setIsInfectionModalOpen(true)}
              onCure={() => setIsCureModalOpen(true)}
            />
          </div>
        </div>

        <CharacterTabsSection
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tokenId={tokenId}
          character={character}
          name={name}
          isOwner={isOwner}
          isEditMode={isEditMode}
          editor={editor}
        />
      </div>

      <CharacterModals
        tokenId={tokenId}
        name={name}
        isSearingModalOpen={isSearingModalOpen}
        isInfectionModalOpen={isInfectionModalOpen}
        isCureModalOpen={isCureModalOpen}
        onCloseSearing={() => setIsSearingModalOpen(false)}
        onCloseInfection={() => setIsInfectionModalOpen(false)}
        onCloseCure={() => setIsCureModalOpen(false)}
        onSearingSuccess={refetchCharacter}
      />
    </div>
  )
}
