/**
 * AdjectivesEditor Component
 * Editor for character adjectives - personality trait keywords
 * Uses chip-style input for short trait descriptors
 */

'use client'

import { memo } from 'react'
import { ArrayFieldEditor } from '../shared'
import { FIELD_LIMITS } from '@/types/eliza'

interface AdjectivesEditorProps {
  /** Array of adjective entries */
  value: string[]
  /** Callback when adjectives change */
  onChange: (value: string[]) => void
  /** Whether the editor is disabled */
  disabled?: boolean
  /** Whether the editor is read-only */
  readOnly?: boolean
}

function AdjectivesEditorComponent({
  value,
  onChange,
  disabled = false,
  readOnly = false,
}: AdjectivesEditorProps) {
  return (
    <ArrayFieldEditor
      label="Adjectives"
      helpText="Personality traits and descriptors that define the character's demeanor. These keywords influence the AI's tone and behavior in responses."
      value={value}
      onChange={onChange}
      maxItems={FIELD_LIMITS.maxAdjectives}
      maxCharsPerItem={FIELD_LIMITS.adjective}
      placeholder="Enter an adjective..."
      disabled={disabled}
      readOnly={readOnly}
      inputType="input"
      showIndices={false}
    />
  )
}

export const AdjectivesEditor = memo(AdjectivesEditorComponent)
