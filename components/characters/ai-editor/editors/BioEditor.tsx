/**
 * BioEditor Component
 * Editor for character bio array - core identity statements
 * Bio entries are required (at least 1) and provide "entropy" for AI responses
 */

'use client'

import { memo, useCallback } from 'react'
import { ArrayFieldEditor } from '../shared'
import { FIELD_LIMITS } from '@/types/eliza'

interface BioEditorProps {
  /** Array of bio entries */
  value: string[]
  /** Callback when bio changes */
  onChange: (value: string[]) => void
  /** Whether the editor is disabled */
  disabled?: boolean
  /** Whether the editor is read-only */
  readOnly?: boolean
}

function BioEditorComponent({
  value,
  onChange,
  disabled = false,
  readOnly = false,
}: BioEditorProps) {
  // Ensure at least one entry exists
  const normalizedValue = value.length > 0 ? value : ['']

  const handleChange = useCallback(
    (newValue: string[]) => {
      // Ensure at least one entry remains
      if (newValue.length === 0) {
        onChange([''])
      } else {
        onChange(newValue)
      }
    },
    [onChange]
  )

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <ArrayFieldEditor
            label="Bio"
            helpText="Short biographical snippets that define who this character is. The AI randomly samples from these to create varied but consistent responses. At least one entry is required."
            value={normalizedValue}
            onChange={handleChange}
            maxItems={FIELD_LIMITS.maxBioEntries}
            maxCharsPerItem={FIELD_LIMITS.bio}
            placeholder="Enter a biographical statement about this character..."
            disabled={disabled}
            readOnly={readOnly}
            minRows={2}
            showIndices={true}
          />
        </div>
      </div>

      {/* Required field indicator */}
      <p className="text-xs text-soul-400 flex items-center gap-1">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
        Required - at least one bio entry must be provided
      </p>
    </div>
  )
}

export const BioEditor = memo(BioEditorComponent)
