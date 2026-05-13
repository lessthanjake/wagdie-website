'use client'

import { memo } from 'react'
import type { SafeCharacterSettings, WagdieUserMetadataValue } from '@/types/eliza'

interface SafeSettingsEditorProps {
  value: SafeCharacterSettings
  onChange: (value: SafeCharacterSettings) => void
  disabled?: boolean
  readOnly?: boolean
}

function stringifyValue(value: WagdieUserMetadataValue): string {
  if (value === null) return ''
  return String(value)
}

function SafeSettingsEditorComponent({ value, onChange, disabled = false, readOnly = false }: SafeSettingsEditorProps) {
  const metadata = value.metadata?.wagdieUser || {}
  const entries = Object.entries(metadata)

  const updateAvatar = (avatar: string) => {
    onChange({ ...value, avatar })
  }

  const updateMetadataEntry = (index: number, key: string, metadataValue: string) => {
    const nextEntries = [...entries]
    nextEntries[index] = [key, metadataValue]
    onChange({
      ...value,
      metadata: {
        wagdieUser: Object.fromEntries(nextEntries.filter(([name]) => name.trim().length > 0)),
      },
    })
  }

  const removeMetadataEntry = (index: number) => {
    onChange({
      ...value,
      metadata: {
        wagdieUser: Object.fromEntries(entries.filter((_, i) => i !== index)),
      },
    })
  }

  const addMetadataEntry = () => {
    let i = entries.length + 1
    let key = `field${i}`
    while (Object.prototype.hasOwnProperty.call(metadata, key)) {
      i += 1
      key = `field${i}`
    }
    onChange({
      ...value,
      metadata: {
        wagdieUser: { ...metadata, [key]: '' },
      },
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-lg font-display text-neutral-200 mb-1">Public Settings</h4>
        <p className="text-sm text-neutral-500">
          Safe public settings only. Runtime settings, providers, plugins, and secrets stay backend-managed.
        </p>
      </div>

      <label className="block space-y-2">
        <span className="text-sm text-neutral-400">Avatar</span>
        <input
          value={value.avatar || ''}
          onChange={(event) => updateAvatar(event.target.value)}
          disabled={disabled || readOnly}
          placeholder="Avatar URL or identifier"
          className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-200 disabled:opacity-50"
        />
      </label>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-400">Public Metadata</span>
          {!readOnly && (
            <button
              type="button"
              onClick={addMetadataEntry}
              disabled={disabled}
              className="px-2 py-1 text-xs border border-neutral-800 text-neutral-400 hover:text-neutral-200 disabled:opacity-50"
            >
              Add Field
            </button>
          )}
        </div>

        {entries.map(([key, metadataValue], index) => (
          <div key={`${key}-${index}`} className="flex gap-2">
            <input
              value={key}
              onChange={(event) => updateMetadataEntry(index, event.target.value, stringifyValue(metadataValue))}
              disabled={disabled || readOnly}
              placeholder="key"
              className="w-1/3 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-200 disabled:opacity-50"
            />
            <input
              value={stringifyValue(metadataValue)}
              onChange={(event) => updateMetadataEntry(index, key, event.target.value)}
              disabled={disabled || readOnly}
              placeholder="value"
              className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-200 disabled:opacity-50"
            />
            {!readOnly && (
              <button
                type="button"
                onClick={() => removeMetadataEntry(index)}
                disabled={disabled}
                className="px-3 py-2 text-xs border border-neutral-800 text-neutral-400 hover:text-red-300 disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export const SafeSettingsEditor = memo(SafeSettingsEditorComponent)
