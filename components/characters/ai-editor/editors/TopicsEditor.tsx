/**
 * TopicsEditor Component
 * Editor for character topics - areas of interest and expertise
 * Uses chip-style input for shorter entries
 */

'use client'

import { memo } from 'react'
import { ArrayFieldEditor } from '../shared'
import { FIELD_LIMITS } from '@/types/eliza'

interface TopicsEditorProps {
  /** Array of topic entries */
  value: string[]
  /** Callback when topics change */
  onChange: (value: string[]) => void
  /** Whether the editor is disabled */
  disabled?: boolean
  /** Whether the editor is read-only */
  readOnly?: boolean
}

function TopicsEditorComponent({
  value,
  onChange,
  disabled = false,
  readOnly = false,
}: TopicsEditorProps) {
  return (
    <ArrayFieldEditor
      label="Topics"
      helpText="Areas of interest, expertise, or conversation subjects the character engages with. The AI uses these to determine relevance and guide discussions."
      value={value}
      onChange={onChange}
      maxItems={FIELD_LIMITS.maxTopics}
      maxCharsPerItem={FIELD_LIMITS.topic}
      placeholder="Enter a topic..."
      disabled={disabled}
      readOnly={readOnly}
      inputType="input"
      showIndices={false}
    />
  )
}

export const TopicsEditor = memo(TopicsEditorComponent)
