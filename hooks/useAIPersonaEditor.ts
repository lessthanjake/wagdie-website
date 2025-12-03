/**
 * useAIPersonaEditor Hook
 * Manages local state for the full Eliza persona editor
 * Handles draft persistence, validation, and change tracking
 */

'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import type {
  AICharacter,
  DraftAIPersona,
  ExampleMessage,
  StyleConfig,
  UpdateAICharacterInput,
} from '@/types/eliza'
import { migrateDraft } from '@/lib/eliza/migration'

/** Draft storage key prefix */
const DRAFT_KEY_PREFIX = 'wagdie-ai-draft-'

/** Get storage key for a token */
const getDraftKey = (tokenId: string) => `${DRAFT_KEY_PREFIX}${tokenId}`

export interface AIPersonaEditorState {
  // Identity
  bio: string[]
  lore: string[]
  // Behavior
  topics: string[]
  adjectives: string[]
  style: StyleConfig
  // Examples
  exampleMessages: ExampleMessage[]
  postExamples: string[]
  // Advanced
  systemPrompt: string
  knowledgeIds: string[]
}

export interface UseAIPersonaEditorReturn {
  /** Current editor state */
  state: AIPersonaEditorState
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean
  /** Update bio array */
  setBio: (value: string[]) => void
  /** Update lore array */
  setLore: (value: string[]) => void
  /** Update topics array */
  setTopics: (value: string[]) => void
  /** Update adjectives array */
  setAdjectives: (value: string[]) => void
  /** Update style config */
  setStyle: (value: StyleConfig) => void
  /** Update example messages */
  setExampleMessages: (value: ExampleMessage[]) => void
  /** Update post examples */
  setPostExamples: (value: string[]) => void
  /** Update system prompt */
  setSystemPrompt: (value: string) => void
  /** Update knowledge IDs */
  setKnowledgeIds: (value: string[]) => void
  /** Reset state to match character or empty */
  resetState: (character?: AICharacter | null) => void
  /** Discard draft and reset to character state */
  discardDraft: () => void
  /** Get data formatted for API update */
  getUpdateInput: () => UpdateAICharacterInput
  /** Clear draft from storage */
  clearDraft: () => void
}

const DEFAULT_STATE: AIPersonaEditorState = {
  bio: [''],
  lore: [],
  topics: [],
  adjectives: [],
  style: {},
  exampleMessages: [],
  postExamples: [],
  systemPrompt: '',
  knowledgeIds: [],
}

export function useAIPersonaEditor(
  tokenId: string,
  aiCharacter: AICharacter | null | undefined,
  isLoading: boolean
): UseAIPersonaEditorReturn {
  const [state, setState] = useState<AIPersonaEditorState>(DEFAULT_STATE)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Initialize state from draft or character
  useEffect(() => {
    if (isLoading || initialized) return

    const draftKey = getDraftKey(tokenId)
    const savedDraft = localStorage.getItem(draftKey)

    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft)
        const { data: draft } = migrateDraft(parsed)

        setState({
          bio: draft.bio || [''],
          lore: draft.lore || [],
          topics: draft.topics || [],
          adjectives: draft.adjectives || [],
          style: draft.style || {},
          exampleMessages: draft.exampleMessages || [],
          postExamples: draft.postExamples || [],
          systemPrompt: draft.systemPrompt || '',
          knowledgeIds: draft.knowledgeIds || [],
        })
        setHasUnsavedChanges(true)
        setInitialized(true)
        return
      } catch {
        // Invalid draft, remove it
        localStorage.removeItem(draftKey)
      }
    }

    // Load from AI character or use defaults
    if (aiCharacter) {
      setState({
        bio: aiCharacter.bio?.length ? aiCharacter.bio : [''],
        lore: aiCharacter.lore || [],
        topics: aiCharacter.topics || [],
        adjectives: aiCharacter.adjectives || [],
        style: aiCharacter.style || {},
        exampleMessages: aiCharacter.exampleMessages || [],
        postExamples: aiCharacter.postExamples || [],
        systemPrompt: aiCharacter.systemPrompt || '',
        knowledgeIds: aiCharacter.knowledge?.map((k) => k.id) || [],
      })
    }

    setHasUnsavedChanges(false)
    setInitialized(true)
  }, [tokenId, aiCharacter, isLoading, initialized])

  // Auto-save draft to localStorage
  useEffect(() => {
    if (!hasUnsavedChanges || !initialized) return

    const draft: DraftAIPersona = {
      tokenId,
      bio: state.bio,
      lore: state.lore,
      topics: state.topics,
      adjectives: state.adjectives,
      style: state.style,
      exampleMessages: state.exampleMessages,
      postExamples: state.postExamples,
      systemPrompt: state.systemPrompt,
      knowledgeIds: state.knowledgeIds,
      savedAt: new Date().toISOString(),
    }

    localStorage.setItem(getDraftKey(tokenId), JSON.stringify(draft))
  }, [state, hasUnsavedChanges, tokenId, initialized])

  // State setters with change tracking
  const setBio = useCallback((value: string[]) => {
    setState((prev) => ({ ...prev, bio: value }))
    setHasUnsavedChanges(true)
  }, [])

  const setLore = useCallback((value: string[]) => {
    setState((prev) => ({ ...prev, lore: value }))
    setHasUnsavedChanges(true)
  }, [])

  const setTopics = useCallback((value: string[]) => {
    setState((prev) => ({ ...prev, topics: value }))
    setHasUnsavedChanges(true)
  }, [])

  const setAdjectives = useCallback((value: string[]) => {
    setState((prev) => ({ ...prev, adjectives: value }))
    setHasUnsavedChanges(true)
  }, [])

  const setStyle = useCallback((value: StyleConfig) => {
    setState((prev) => ({ ...prev, style: value }))
    setHasUnsavedChanges(true)
  }, [])

  const setExampleMessages = useCallback((value: ExampleMessage[]) => {
    setState((prev) => ({ ...prev, exampleMessages: value }))
    setHasUnsavedChanges(true)
  }, [])

  const setPostExamples = useCallback((value: string[]) => {
    setState((prev) => ({ ...prev, postExamples: value }))
    setHasUnsavedChanges(true)
  }, [])

  const setSystemPrompt = useCallback((value: string) => {
    setState((prev) => ({ ...prev, systemPrompt: value }))
    setHasUnsavedChanges(true)
  }, [])

  const setKnowledgeIds = useCallback((value: string[]) => {
    setState((prev) => ({ ...prev, knowledgeIds: value }))
    setHasUnsavedChanges(true)
  }, [])

  // Reset state to character or empty
  const resetState = useCallback(
    (character?: AICharacter | null) => {
      const char = character ?? aiCharacter
      if (char) {
        setState({
          bio: char.bio?.length ? char.bio : [''],
          lore: char.lore || [],
          topics: char.topics || [],
          adjectives: char.adjectives || [],
          style: char.style || {},
          exampleMessages: char.exampleMessages || [],
          postExamples: char.postExamples || [],
          systemPrompt: char.systemPrompt || '',
          knowledgeIds: char.knowledge?.map((k) => k.id) || [],
        })
      } else {
        setState(DEFAULT_STATE)
      }
      setHasUnsavedChanges(false)
    },
    [aiCharacter]
  )

  // Discard draft and reset
  const discardDraft = useCallback(() => {
    localStorage.removeItem(getDraftKey(tokenId))
    resetState()
  }, [tokenId, resetState])

  // Clear draft from storage
  const clearDraft = useCallback(() => {
    localStorage.removeItem(getDraftKey(tokenId))
    setHasUnsavedChanges(false)
  }, [tokenId])

  // Get data formatted for API update
  const getUpdateInput = useCallback((): UpdateAICharacterInput => {
    return {
      bio: state.bio.filter((b) => b.trim() !== ''),
      lore: state.lore.filter((l) => l.trim() !== ''),
      topics: state.topics.filter((t) => t.trim() !== ''),
      adjectives: state.adjectives.filter((a) => a.trim() !== ''),
      style:
        Object.values(state.style).some((arr) => arr && arr.length > 0)
          ? state.style
          : undefined,
      exampleMessages: state.exampleMessages.length > 0 ? state.exampleMessages : undefined,
      postExamples: state.postExamples.filter((p) => p.trim() !== ''),
      systemPrompt: state.systemPrompt || undefined,
    }
  }, [state])

  return {
    state,
    hasUnsavedChanges,
    setBio,
    setLore,
    setTopics,
    setAdjectives,
    setStyle,
    setExampleMessages,
    setPostExamples,
    setSystemPrompt,
    setKnowledgeIds,
    resetState,
    discardDraft,
    getUpdateInput,
    clearDraft,
  }
}
