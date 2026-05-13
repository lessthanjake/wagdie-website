/**
 * AdvancedTab Component
 * Container for System Prompt and Knowledge Document editors
 */

'use client'

import { memo } from 'react'
import { SystemPromptEditor } from '../SystemPromptEditor'
import { KnowledgeEditor } from '../editors/KnowledgeEditor'
import { TemplatesEditor } from '../editors/TemplatesEditor'
import { SafeSettingsEditor } from '../editors/SafeSettingsEditor'
import type { CharacterTemplates, KnowledgeDocument, SafeCharacterSettings } from '@/types/eliza'

interface AdvancedTabProps {
  /** System prompt value */
  systemPrompt: string
  /** Templates */
  templates: CharacterTemplates
  /** Safe public settings */
  settings: SafeCharacterSettings
  /** Knowledge documents */
  knowledgeDocuments: KnowledgeDocument[]
  /** Whether knowledge upload is in progress */
  isUploadingKnowledge?: boolean
  /** Callback when system prompt changes */
  onSystemPromptChange: (value: string) => void
  /** Callback when templates change */
  onTemplatesChange: (value: CharacterTemplates) => void
  /** Callback when safe settings change */
  onSettingsChange: (value: SafeCharacterSettings) => void
  /** Callback when knowledge document is uploaded */
  onKnowledgeUpload: (file: File) => Promise<void>
  /** Callback when knowledge document is removed */
  onKnowledgeRemove: (documentId: string) => void
  /** Whether editors are disabled */
  disabled?: boolean
  /** Whether editors are read-only */
  readOnly?: boolean
  /** Knowledge upload error */
  knowledgeError?: string | null
}

function AdvancedTabComponent({
  systemPrompt,
  templates,
  settings,
  knowledgeDocuments,
  isUploadingKnowledge = false,
  onSystemPromptChange,
  onTemplatesChange,
  onSettingsChange,
  onKnowledgeUpload,
  onKnowledgeRemove,
  disabled = false,
  readOnly = false,
  knowledgeError = null,
}: AdvancedTabProps) {
  return (
    <div
      role="tabpanel"
      id="tabpanel-advanced"
      aria-labelledby="tab-advanced"
      className="space-y-8 py-6"
    >
      {/* Introduction */}
      <div className="pb-4 border-b border-neutral-800">
        <h3 className="text-2xl font-display text-neutral-200 mb-2">
          Advanced Configuration
        </h3>
        <p className="text-md text-neutral-500">
          Fine-tune your character with system-level instructions and reference documents.
          These settings provide powerful customization for advanced users.
        </p>
      </div>

      {/* System Prompt Editor (existing component) */}
      <SystemPromptEditor
        value={systemPrompt}
        onChange={onSystemPromptChange}
        disabled={disabled}
        readOnly={readOnly}
      />

      <TemplatesEditor
        value={templates}
        onChange={onTemplatesChange}
        disabled={disabled}
        readOnly={readOnly}
      />

      <SafeSettingsEditor
        value={settings}
        onChange={onSettingsChange}
        disabled={disabled}
        readOnly={readOnly}
      />

      {/* Knowledge Editor */}
      <KnowledgeEditor
        documents={knowledgeDocuments}
        isUploading={isUploadingKnowledge}
        onUpload={onKnowledgeUpload}
        onRemove={onKnowledgeRemove}
        disabled={disabled}
        readOnly={readOnly}
        error={knowledgeError}
      />
    </div>
  )
}

export const AdvancedTab = memo(AdvancedTabComponent)
