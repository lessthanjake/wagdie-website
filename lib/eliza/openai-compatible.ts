/**
 * Compatibility re-export for OpenAI-compatible chat inference helpers.
 *
 * New code should import from '@/lib/eliza/gateway/venice'. This path remains
 * during migration so existing tests/routes keep compiling.
 */

export {
  buildMessagesForCharacter,
  streamOpenAICompatibleChat,
} from '@/lib/eliza/gateway/venice'

export type {
  OpenAICompatibleChatConfig,
  OpenAICompatibleChatMessage,
  StreamOpenAICompatibleChatParams,
} from '@/lib/eliza/gateway/venice'
