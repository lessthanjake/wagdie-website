/**
 * Eliza SDK Adapter (v0.2.0)
 *
 * Stable facade for Eliza data-shape mappings so the rest of the app can remain
 * stable while we migrate away from the local SDK runtime.
 */

export { ElizaError, WagdieElizaError, isElizaError, isWagdieElizaError } from './gateway/errors'

export type {
  AgentCharacter,
  AgentMessage,
  AgentMessageExample,
  AuthTokens,
  CharacterPermissions,
  CharacterRecord,
  CharacterStyle,
  ChatMessage,
  ChatResponse,
  RoleContentMessage,
  StreamCallback,
  StreamCallbacks,
  StreamCompleteCallback,
  StreamErrorCallback,
} from '@/lib/eliza/sdk-types'

export {
  agentMessageExamplesToRoleContentPairs,
  fromAgentMessageExamples,
  roleContentPairsToAgentMessageExamples,
  toAgentMessageExamples,
} from '@/lib/eliza/message-examples'

export {
  applyWagdieUpdateToAgentCharacter,
  extractBackstory,
  mergeAgentCharacter,
  toAgentCharacterFromAICharacter,
  toAgentCharacterPatchFromUpdate,
  toAICharacterFromRecord,
} from '@/lib/eliza/agent-character-mapper'

export {
  fromElizaExportMessageExamples,
  toElizaExportMessageExamples,
} from '@/lib/eliza/eliza-export-mapper'
