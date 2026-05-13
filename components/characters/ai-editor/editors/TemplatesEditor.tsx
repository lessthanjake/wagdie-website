'use client'

import { memo } from 'react'
import type { CharacterTemplates } from '@/types/eliza'

interface TemplatesEditorProps {
  value: CharacterTemplates
  onChange: (value: CharacterTemplates) => void
  disabled?: boolean
  readOnly?: boolean
}

function TemplatesEditorComponent({ value, onChange, disabled = false, readOnly = false }: TemplatesEditorProps) {
  const entries = Object.entries(value)

  const updateEntry = (index: number, key: string, body: string) => {
    const nextEntries = [...entries]
    nextEntries[index] = [key, body]
    onChange(Object.fromEntries(nextEntries.filter(([name]) => name.trim().length > 0)))
  }

  const removeEntry = (index: number) => {
    onChange(Object.fromEntries(entries.filter((_, i) => i !== index)))
  }

  const addEntry = () => {
    const base = 'template'
    let i = entries.length + 1
    let key = `${base}${i}`
    while (Object.prototype.hasOwnProperty.call(value, key)) {
      i += 1
      key = `${base}${i}`
    }
    onChange({ ...value, [key]: '' })
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-lg font-display text-neutral-200 mb-1">Prompt Templates</h4>
        <p className="text-sm text-neutral-500">
          Optional named prompt template overrides. Plugins and secrets are managed by the backend.
        </p>
      </div>

      {entries.map(([key, body], index) => (
        <div key={`${key}-${index}`} className="p-3 border border-neutral-800 rounded-lg space-y-2">
          <div className="flex gap-2">
            <input
              value={key}
              onChange={(event) => updateEntry(index, event.target.value, body)}
              disabled={disabled || readOnly}
              placeholder="templateName"
              className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-200 disabled:opacity-50"
            />
            {!readOnly && (
              <button
                type="button"
                onClick={() => removeEntry(index)}
                disabled={disabled}
                className="px-3 py-2 text-xs border border-neutral-800 text-neutral-400 hover:text-red-300 disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
          <textarea
            value={body}
            onChange={(event) => updateEntry(index, key, event.target.value)}
            disabled={disabled || readOnly}
            rows={4}
            placeholder="Template body..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-200 disabled:opacity-50"
          />
        </div>
      ))}

      {!readOnly && (
        <button
          type="button"
          onClick={addEntry}
          disabled={disabled}
          className="px-3 py-2 text-xs font-display border border-neutral-700 text-neutral-400 hover:text-neutral-200 disabled:opacity-50"
        >
          Add Template
        </button>
      )}
    </div>
  )
}

export const TemplatesEditor = memo(TemplatesEditorComponent)
