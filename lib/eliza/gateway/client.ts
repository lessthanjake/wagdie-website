/**
 * App-owned raw HTTP gateway for the custom Eliza API and Venice inference.
 *
 * Custom Eliza remains the source for auth, character records, knowledge stored
 * on character records, and conversation metadata/history. Chat inference is
 * routed through Venice only.
 */

import { GatewayHttpClient } from './http'
import { WagdieElizaError, isWagdieElizaError } from './errors'
import { buildMessagesForCharacter, streamOpenAICompatibleChat } from './venice'
import type {
  AuthTokens,
  CharacterRecord,
  GatewayCharacterCreateInput,
  GatewayCharacterReplaceInput,
  GatewayConversationDetail,
  GatewayChatSendInput,
  GatewayConversationSummary,
  GatewayPaginatedResponse,
  GatewayPaginationParams,
  StreamCallbacks,
  WagdieElizaClient,
  WagdieElizaClientConfig,
  WagdieElizaInferenceConfig,
} from './types'

function buildPaginationQuery(params: GatewayPaginationParams = {}): string {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 20
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  return query.toString()
}

function isNotFound(error: unknown): boolean {
  return isWagdieElizaError(error) && error.statusCode === 404
}

interface RawConversationListItem {
  id: string
  characterId: string
  characterName?: string
  messageCount?: number
  createdAt: string
  updatedAt?: string
  lastMessageAt?: string
}

interface RawConversationListResponse {
  conversations?: RawConversationListItem[]
  items?: RawConversationListItem[]
  total: number
  page?: number
  pageSize?: number
  hasMore?: boolean
}

interface RawConversationDetailResponse {
  id: string
  characterId: string
  characterName?: string
  messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; createdAt: string }>
  createdAt: string
  updatedAt?: string
  lastMessageAt?: string
}

function mapConversationSummary(conversation: RawConversationListItem): GatewayConversationSummary {
  return {
    id: conversation.id,
    characterId: conversation.characterId,
    characterName: conversation.characterName,
    messageCount: conversation.messageCount ?? 0,
    lastMessageAt: conversation.lastMessageAt ?? conversation.updatedAt ?? conversation.createdAt,
    createdAt: conversation.createdAt,
  }
}

function mapConversationDetail(response: RawConversationDetailResponse): GatewayConversationDetail {
  return {
    id: response.id,
    characterId: response.characterId,
    characterName: response.characterName,
    messageCount: response.messages.length,
    lastMessageAt: response.lastMessageAt ?? response.updatedAt ?? response.createdAt,
    createdAt: response.createdAt,
    messages: response.messages,
  }
}

function mapConversationListResponse(
  response: RawConversationListResponse,
  params: GatewayPaginationParams = {}
): GatewayPaginatedResponse<GatewayConversationSummary> {
  const items = response.conversations ?? response.items ?? []
  const page = response.page ?? params.page ?? 1
  const pageSize = response.pageSize ?? params.pageSize ?? 20
  const total = response.total ?? items.length

  return {
    items: items.map(mapConversationSummary),
    total,
    page,
    pageSize,
    hasMore: response.hasMore ?? page * pageSize < total,
  }
}

export class WagdieElizaHttpClient implements WagdieElizaClient {
  private readonly http: GatewayHttpClient
  private readonly timeout?: number
  private readonly inference?: WagdieElizaInferenceConfig

  constructor(config: WagdieElizaClientConfig) {
    this.timeout = config.timeout
    this.inference = config.inference
    this.http = new GatewayHttpClient({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      accessToken: config.accessToken,
      timeout: config.timeout,
      retry: config.retry,
    })
  }

  readonly auth = {
    getNonce: async () => this.http.get<{ nonce: string; sessionId: string }>('/auth/nonce'),
    verify: async (message: string, signature: string, sessionId: string): Promise<AuthTokens> => {
      const response = await this.http.post<{
        token?: string
        accessToken?: string
        refreshToken?: string
        expiresIn?: number
        expiresAt?: number
      }>('/auth/verify', { message, signature, sessionId })

      const accessToken = response.accessToken ?? response.token
      const expiresAt = response.expiresAt ?? (response.expiresIn ? Date.now() + response.expiresIn * 1000 : undefined)

      if (!accessToken || typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) {
        throw new WagdieElizaError('Eliza auth verify response did not include valid token fields', {
          code: 'AUTH_ERROR',
          statusCode: 502,
          details: { hasAccessToken: Boolean(accessToken), expiresAt },
        })
      }

      return {
        accessToken,
        refreshToken: response.refreshToken,
        expiresAt,
      }
    },
  }

  readonly characters = {
    getRecord: (id: string) => this.http.get<CharacterRecord>(`/characters/${encodeURIComponent(id)}`),
    getRecordByExternalId: async (externalId: string): Promise<CharacterRecord | null> => {
      try {
        return await this.http.get<CharacterRecord>(
          `/characters/external/${encodeURIComponent(externalId)}`
        )
      } catch (error) {
        if (isNotFound(error)) return null
        throw error
      }
    },
    createRecord: (input: GatewayCharacterCreateInput) =>
      this.http.post<CharacterRecord>('/characters', input),
    replaceRecord: (id: string, input: GatewayCharacterReplaceInput) =>
      this.http.put<CharacterRecord>(`/characters/${encodeURIComponent(id)}`, input),
  }

  readonly chat = {
    sendMessageStream: async (
      input: GatewayChatSendInput,
      callbacks: StreamCallbacks
    ): Promise<void> => {
      if (!this.inference?.baseUrl || !this.inference.apiKey || !this.inference.model) {
        throw new WagdieElizaError(
          'Venice inference is not configured. Set ELIZA_LLM_API_KEY/VENICE_API_KEY and ELIZA_LLM_MODEL/VENICE_MODEL.',
          { code: 'VALIDATION_ERROR', statusCode: 500 }
        )
      }

      const character = input.character ?? (await this.characters.getRecord(input.characterId)).character

      await streamOpenAICompatibleChat(
        {
          baseUrl: this.inference.baseUrl,
          apiKey: this.inference.apiKey,
          model: this.inference.model,
          timeout: this.timeout,
          temperature: this.inference.temperature,
          maxTokens: this.inference.maxTokens,
          conversationId: input.conversationId,
          signal: input.signal,
          messages: buildMessagesForCharacter(character, input.message),
        },
        callbacks
      )
    },
  }

  readonly conversations = {
    list: async (params: GatewayPaginationParams = {}) => {
      const response = await this.http.get<RawConversationListResponse>(
        `/conversations?${buildPaginationQuery(params)}`
      )
      return mapConversationListResponse(response, params)
    },
    listForCharacter: async (characterId: string, params: GatewayPaginationParams = {}) => {
      const response = await this.http.get<RawConversationListResponse>(
        `/characters/${encodeURIComponent(characterId)}/conversations?${buildPaginationQuery(params)}`
      )
      return mapConversationListResponse(response, params)
    },
    get: async (id: string) =>
      mapConversationDetail(
        await this.http.get<RawConversationDetailResponse>(`/conversations/${encodeURIComponent(id)}`)
      ),
    delete: (id: string) => this.http.delete<void>(`/conversations/${encodeURIComponent(id)}`),
  }
}

export function createWagdieElizaHttpClient(config: WagdieElizaClientConfig): WagdieElizaHttpClient {
  return new WagdieElizaHttpClient(config)
}
