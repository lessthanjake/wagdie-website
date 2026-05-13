/**
 * IdentityTab Component
 * Container for Bio and Lore editors - core character identity
 */

'use client'

import { memo } from 'react'
import { BioEditor } from '../editors/BioEditor'
import { LoreEditor } from '../editors/LoreEditor'

interface IdentityTabProps {
  /** Username value */
  username: string
  /** Backstory value */
  backstory: string
  /** Bio array values */
  bio: string[]
  /** Lore array values */
  lore: string[]
  /** Callback when username changes */
  onUsernameChange: (value: string) => void
  /** Callback when backstory changes */
  onBackstoryChange: (value: string) => void
  /** Callback when bio changes */
  onBioChange: (value: string[]) => void
  /** Callback when lore changes */
  onLoreChange: (value: string[]) => void
  /** Whether editors are disabled */
  disabled?: boolean
  /** Whether editors are read-only */
  readOnly?: boolean
}

function IdentityTabComponent({
  username,
  backstory,
  bio,
  lore,
  onUsernameChange,
  onBackstoryChange,
  onBioChange,
  onLoreChange,
  disabled = false,
  readOnly = false,
}: IdentityTabProps) {
  return (
    <div
      role="tabpanel"
      id="tabpanel-identity"
      aria-labelledby="tab-identity"
      className="space-y-8 py-6"
    >
      {/* Introduction */}
      <div className="pb-4 border-b border-neutral-800">
        <h3 className="text-2xl font-display text-neutral-200 mb-2">
          Character Identity
        </h3>
        <p className="text-md text-neutral-500">
          Define who your character is at their core. Bio entries establish the character&apos;s
          fundamental traits, while lore provides rich backstory and context that the AI can
          draw from during conversations.
        </p>
      </div>

      <div className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm text-neutral-400">Username</span>
          <input
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            disabled={disabled || readOnly}
            placeholder="Optional Eliza username"
            className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-200 disabled:opacity-50"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-neutral-400">Backstory</span>
          <textarea
            value={backstory}
            onChange={(event) => onBackstoryChange(event.target.value)}
            disabled={disabled || readOnly}
            rows={5}
            placeholder="Character backstory"
            className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-200 disabled:opacity-50"
          />
        </label>
      </div>

      {/* Bio Editor */}
      <BioEditor
        value={bio}
        onChange={onBioChange}
        disabled={disabled}
        readOnly={readOnly}
      />

      {/* Lore Editor */}
      <LoreEditor
        value={lore}
        onChange={onLoreChange}
        disabled={disabled}
        readOnly={readOnly}
      />
    </div>
  )
}

export const IdentityTab = memo(IdentityTabComponent)
