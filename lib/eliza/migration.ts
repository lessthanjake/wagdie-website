/**
 * Migration utilities for Eliza character data
 * Handles personality → bio migration and legacy draft conversion
 */

import type { AICharacter, DraftAIPersona, ExampleMessage } from '@/types/eliza'
import { FIELD_LIMITS } from '@/types/eliza'

/**
 * Legacy AI character structure (pre-migration)
 */
interface LegacyAICharacter {
  id: string
  externalId: string
  name: string
  personality?: string | null
  backstory: string | null
  systemPrompt: string | null
  exampleMessages: ExampleMessage[]
  createdAt: string
  updatedAt: string
}

/**
 * Legacy draft structure (pre-migration)
 */
interface LegacyDraftAIPersona {
  tokenId: string
  personality?: string
  systemPrompt?: string
  exampleMessages?: ExampleMessage[]
  savedAt: string
}

/**
 * Migration result with status information
 */
export interface MigrationResult<T> {
  data: T
  migrated: boolean
  warnings: string[]
}

/**
 * Migrate personality string to bio array
 * Handles truncation for entries exceeding 500 chars
 *
 * @param personality - Legacy personality string
 * @returns Array of bio entries (at least one entry guaranteed)
 */
export function migratePersonalityToBio(personality: string | null | undefined): string[] {
  if (!personality || personality.trim() === '') {
    return [''] // Ensure at least one entry for bio requirement
  }

  const trimmed = personality.trim()

  // If under limit, return as single entry
  if (trimmed.length <= FIELD_LIMITS.bio) {
    return [trimmed]
  }

  // Truncate to field limit
  return [trimmed.slice(0, FIELD_LIMITS.bio)]
}

/**
 * Check if a character needs migration
 *
 * @param character - Character to check
 * @returns true if character has personality but no bio
 */
export function needsMigration(
  character: Partial<AICharacter> & { personality?: string | null }
): boolean {
  const hasLegacyPersonality = character.personality != null && character.personality.trim() !== ''
  const hasNewBio = Array.isArray(character.bio) && character.bio.length > 0
  return hasLegacyPersonality && !hasNewBio
}

/**
 * Migrate a legacy AI character to the new format
 *
 * @param legacy - Legacy character with personality field
 * @returns Migration result with converted character and any warnings
 */
export function migrateCharacter(
  legacy: LegacyAICharacter
): MigrationResult<AICharacter> {
  const warnings: string[] = []
  const bio = migratePersonalityToBio(legacy.personality)

  // Warn if personality was truncated
  if (legacy.personality && legacy.personality.length > FIELD_LIMITS.bio) {
    warnings.push(
      `Personality field truncated from ${legacy.personality.length} to ${FIELD_LIMITS.bio} characters. ` +
        'Consider splitting content into multiple bio entries.'
    )
  }

  const migrated: AICharacter = {
    id: legacy.id,
    externalId: legacy.externalId,
    name: legacy.name,
    backstory: legacy.backstory,
    systemPrompt: legacy.systemPrompt,
    exampleMessages: legacy.exampleMessages || [],
    bio,
    lore: [],
    topics: [],
    adjectives: [],
    style: undefined,
    postExamples: [],
    knowledge: [],
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt,
  }

  return {
    data: migrated,
    migrated: legacy.personality != null,
    warnings,
  }
}

/**
 * Migrate a legacy draft to the new format
 *
 * @param draft - Legacy draft with personality field
 * @returns Migration result with converted draft and any warnings
 */
export function migrateDraft(
  draft: LegacyDraftAIPersona | DraftAIPersona
): MigrationResult<DraftAIPersona> {
  const warnings: string[] = []

  // Check if draft has legacy personality but no bio
  const legacyDraft = draft as LegacyDraftAIPersona & Partial<DraftAIPersona>
  const hasLegacyPersonality = legacyDraft.personality && !legacyDraft.bio

  if (!hasLegacyPersonality) {
    // No migration needed
    return {
      data: draft as DraftAIPersona,
      migrated: false,
      warnings: [],
    }
  }

  // Migrate personality to bio
  const bio = migratePersonalityToBio(legacyDraft.personality)

  if (legacyDraft.personality && legacyDraft.personality.length > FIELD_LIMITS.bio) {
    warnings.push(
      `Draft personality truncated from ${legacyDraft.personality.length} to ${FIELD_LIMITS.bio} characters.`
    )
  }

  const migrated: DraftAIPersona = {
    tokenId: draft.tokenId,
    systemPrompt: draft.systemPrompt,
    exampleMessages: draft.exampleMessages,
    bio,
    lore: (draft as DraftAIPersona).lore,
    topics: (draft as DraftAIPersona).topics,
    adjectives: (draft as DraftAIPersona).adjectives,
    style: (draft as DraftAIPersona).style,
    postExamples: (draft as DraftAIPersona).postExamples,
    knowledgeIds: (draft as DraftAIPersona).knowledgeIds,
    savedAt: draft.savedAt,
  }

  return {
    data: migrated,
    migrated: true,
    warnings,
  }
}

/**
 * Migrate all drafts from localStorage
 * Call this on app initialization to ensure all saved drafts are in the new format
 *
 * @param storageKey - localStorage key for drafts (default: 'ai-persona-drafts')
 * @returns Array of migration results for each draft
 */
export function migrateAllDrafts(
  storageKey: string = 'ai-persona-drafts'
): MigrationResult<DraftAIPersona>[] {
  if (typeof window === 'undefined') {
    return []
  }

  const results: MigrationResult<DraftAIPersona>[] = []

  try {
    const stored = localStorage.getItem(storageKey)
    if (!stored) {
      return []
    }

    const drafts: Record<string, LegacyDraftAIPersona | DraftAIPersona> = JSON.parse(stored)
    const migratedDrafts: Record<string, DraftAIPersona> = {}
    let anyMigrated = false

    for (const [tokenId, draft] of Object.entries(drafts)) {
      const result = migrateDraft(draft)
      results.push(result)
      migratedDrafts[tokenId] = result.data

      if (result.migrated) {
        anyMigrated = true
        if (result.warnings.length > 0) {
          console.warn(`Migration warnings for draft ${tokenId}:`, result.warnings)
        }
      }
    }

    // Only update localStorage if any drafts were migrated
    if (anyMigrated) {
      localStorage.setItem(storageKey, JSON.stringify(migratedDrafts))
      console.info(`Migrated ${results.filter((r) => r.migrated).length} legacy drafts`)
    }
  } catch (error) {
    console.error('Failed to migrate drafts:', error)
  }

  return results
}

/**
 * Convert internal ExampleMessage format to Eliza SDK format
 */
export function convertToElizaMessageExamples(
  messages: ExampleMessage[]
): Array<Array<{ user: string; content: { text: string } }>> {
  return messages.map((msg) => [
    { user: '{{user1}}', content: { text: msg.userMessage } },
    { user: '{{char}}', content: { text: msg.assistantMessage } },
  ])
}

/**
 * Convert Eliza SDK message format to internal ExampleMessage format
 */
export function convertFromElizaMessageExamples(
  elizaMessages: Array<Array<{ user: string; content: { text: string } }>>
): ExampleMessage[] {
  return elizaMessages.map((conversation) => {
    const userMsg = conversation.find((m) => m.user === '{{user1}}' || !m.user.startsWith('{{char'))
    const assistantMsg = conversation.find((m) => m.user === '{{char}}')

    return {
      userMessage: userMsg?.content?.text || '',
      assistantMessage: assistantMsg?.content?.text || '',
    }
  })
}

/**
 * Validate that a migrated character has all required fields
 *
 * @param character - Character to validate
 * @returns Array of validation errors, empty if valid
 */
export function validateMigratedCharacter(character: Partial<AICharacter>): string[] {
  const errors: string[] = []

  if (!character.bio || character.bio.length === 0) {
    errors.push('Bio is required and must have at least one entry')
  }

  if (!character.name || character.name.trim() === '') {
    errors.push('Name is required')
  }

  if (character.bio && character.bio.some((entry) => entry.length > FIELD_LIMITS.bio)) {
    errors.push(`Bio entries must not exceed ${FIELD_LIMITS.bio} characters`)
  }

  return errors
}
