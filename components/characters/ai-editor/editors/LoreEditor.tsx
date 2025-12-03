/**
 * LoreEditor Component
 * Editor for character lore array - backstory and world-building elements
 * Lore entries are optional and provide additional context for the AI
 */

'use client'

import { memo } from 'react'
import { ArrayFieldEditor } from '../shared'
import { FIELD_LIMITS } from '@/types/eliza'

interface LoreEditorProps {
  /** Array of lore entries */
  value: string[]
  /** Callback when lore changes */
  onChange: (value: string[]) => void
  /** Whether the editor is disabled */
  disabled?: boolean
  /** Whether the editor is read-only */
  readOnly?: boolean
}

function LoreEditorComponent({
  value,
  onChange,
  disabled = false,
  readOnly = false,
}: LoreEditorProps) {
  return (
    <ArrayFieldEditor
      label="Lore"
      helpText="Background information, historical facts, and world-building details that enrich the character's context. These are sampled to add depth to AI responses."
      value={value}
      onChange={onChange}
      maxItems={FIELD_LIMITS.maxLoreEntries}
      maxCharsPerItem={FIELD_LIMITS.lore}
      placeholder="Enter a lore entry about this character's history, relationships, or world..."
      disabled={disabled}
      readOnly={readOnly}
      minRows={3}
      showIndices={true}
    />
  )
}

export const LoreEditor = memo(LoreEditorComponent)
