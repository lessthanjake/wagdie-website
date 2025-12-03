/**
 * PostExamplesEditor Component
 * Editor for example social media posts that demonstrate character's online voice
 */

'use client'

import { memo } from 'react'
import { ArrayFieldEditor } from '../shared'
import { FIELD_LIMITS } from '@/types/eliza'

interface PostExamplesEditorProps {
  /** Array of post example entries */
  value: string[]
  /** Callback when post examples change */
  onChange: (value: string[]) => void
  /** Whether the editor is disabled */
  disabled?: boolean
  /** Whether the editor is read-only */
  readOnly?: boolean
}

function PostExamplesEditorComponent({
  value,
  onChange,
  disabled = false,
  readOnly = false,
}: PostExamplesEditorProps) {
  return (
    <ArrayFieldEditor
      label="Post Examples"
      helpText="Example social media posts that demonstrate the character's online voice and style. The AI uses these to generate authentic-sounding posts."
      value={value}
      onChange={onChange}
      maxItems={FIELD_LIMITS.maxPostExamples}
      maxCharsPerItem={FIELD_LIMITS.postExample}
      placeholder="Write an example post in the character's voice..."
      disabled={disabled}
      readOnly={readOnly}
      minRows={2}
      showIndices={true}
    />
  )
}

export const PostExamplesEditor = memo(PostExamplesEditorComponent)
