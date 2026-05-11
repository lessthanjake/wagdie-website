import { randomUUID } from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase'
import type {
  GatewayPaginatedResponse,
  GatewayPaginationParams,
} from '@/lib/eliza/gateway/types'

export type OfficialConversationStatus = 'active' | 'deleted' | 'error'

export interface OfficialConversationLink {
  id: string
  walletAddress: string
  officialUserId: string
  tokenId: string | null
  officialAgentId: string
  officialSessionId: string
  status: OfficialConversationStatus
  messageCount: number
  lastMessageAt: string
  lastError: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateOfficialConversationLinkInput {
  id?: string
  walletAddress?: string | null
  officialUserId: string
  tokenId?: string | null
  officialAgentId: string
  officialSessionId: string
}

export interface ListOfficialConversationLinksParams extends GatewayPaginationParams {
  officialUserId: string
  officialAgentId?: string | null
}

type OfficialConversationRow = {
  id: string
  wallet_address: string
  official_user_id: string
  token_id: string | null
  official_agent_id: string
  official_session_id: string
  status: OfficialConversationStatus
  message_count: number
  last_message_at: string
  last_error: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

type QueryResult<T> = Promise<{ data: T | null; error: { message: string } | null; count?: number | null }>

type QueryChain = {
  eq: (column: string, value: string) => QueryChain
  neq: (column: string, value: string) => QueryChain
  order: (column: string, options: { ascending: boolean }) => QueryChain
  range: (from: number, to: number) => QueryResult<OfficialConversationRow[]>
  maybeSingle: () => QueryResult<OfficialConversationRow>
}

type OfficialConversationTable = {
  select: (columns: string, options?: { count?: 'exact' }) => QueryChain
  insert: (values: Record<string, unknown>) => {
    select: (columns: string) => {
      single: () => QueryResult<OfficialConversationRow>
    }
  }
  update: (values: Record<string, unknown>) => {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        select: (columns: string) => {
          single: () => QueryResult<OfficialConversationRow>
        }
      }
    }
  }
}

const TABLE_NAME = 'eliza_official_conversation_links'
const LINK_COLUMNS =
  'id, wallet_address, official_user_id, token_id, official_agent_id, official_session_id, status, message_count, last_message_at, last_error, deleted_at, created_at, updated_at'

function getLinkTable(): OfficialConversationTable {
  const client = getSupabaseAdmin()
  if (!client) {
    throw new Error('Supabase admin client not configured')
  }

  return client.from(TABLE_NAME as never) as unknown as OfficialConversationTable
}

function mapRow(row: OfficialConversationRow): OfficialConversationLink {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    officialUserId: row.official_user_id,
    tokenId: row.token_id,
    officialAgentId: row.official_agent_id,
    officialSessionId: row.official_session_id,
    status: row.status,
    messageCount: row.message_count,
    lastMessageAt: row.last_message_at,
    lastError: row.last_error,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function normalizeWalletAddress(value?: string | null): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export interface OfficialConversationRepository {
  create(input: CreateOfficialConversationLinkInput): Promise<OfficialConversationLink>
  findForUser(conversationId: string, officialUserId: string): Promise<OfficialConversationLink | null>
  listForUser(
    params: ListOfficialConversationLinksParams
  ): Promise<GatewayPaginatedResponse<OfficialConversationLink>>
  rebindSession(
    conversationId: string,
    officialUserId: string,
    officialSessionId: string
  ): Promise<OfficialConversationLink>
  markActivity(
    conversationId: string,
    officialUserId: string,
    params?: { incrementBy?: number; at?: string }
  ): Promise<OfficialConversationLink>
  recordError(conversationId: string, officialUserId: string, error: unknown): Promise<OfficialConversationLink>
  markDeleted(conversationId: string, officialUserId: string): Promise<OfficialConversationLink>
}

function routeSafeError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.slice(0, 1000)
  }

  return 'Official ElizaOS conversation operation failed'
}

export const officialConversationRepository: OfficialConversationRepository = {
  async create(input: CreateOfficialConversationLinkInput): Promise<OfficialConversationLink> {
    const now = new Date().toISOString()
    const { data, error } = await getLinkTable()
      .insert({
        id: input.id ?? randomUUID(),
        wallet_address: normalizeWalletAddress(input.walletAddress),
        official_user_id: input.officialUserId,
        token_id: input.tokenId ?? null,
        official_agent_id: input.officialAgentId,
        official_session_id: input.officialSessionId,
        status: 'active',
        message_count: 0,
        last_message_at: now,
        last_error: null,
        deleted_at: null,
      })
      .select(LINK_COLUMNS)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    if (!data) {
      throw new Error('Official conversation link insert returned no row')
    }

    return mapRow(data)
  },

  async findForUser(conversationId: string, officialUserId: string): Promise<OfficialConversationLink | null> {
    if (!isUuid(conversationId)) {
      return null
    }

    const { data, error } = await getLinkTable()
      .select(LINK_COLUMNS)
      .eq('id', conversationId)
      .eq('official_user_id', officialUserId)
      .neq('status', 'deleted')
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    return data ? mapRow(data) : null
  },

  async listForUser(
    params: ListOfficialConversationLinksParams
  ): Promise<GatewayPaginatedResponse<OfficialConversationLink>> {
    const page = Math.max(1, params.page ?? 1)
    const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 20))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = getLinkTable()
      .select(LINK_COLUMNS, { count: 'exact' })
      .eq('official_user_id', params.officialUserId)
      .eq('status', 'active')

    if (params.officialAgentId) {
      query = query.eq('official_agent_id', params.officialAgentId)
    }

    const { data, error, count } = await query
      .order('last_message_at', { ascending: false })
      .range(from, to)

    if (error) {
      throw new Error(error.message)
    }

    const total = count ?? data?.length ?? 0

    return {
      items: (data ?? []).map(mapRow),
      total,
      page,
      pageSize,
      hasMore: from + pageSize < total,
    }
  },

  async rebindSession(
    conversationId: string,
    officialUserId: string,
    officialSessionId: string
  ): Promise<OfficialConversationLink> {
    const { data, error } = await getLinkTable()
      .update({
        official_session_id: officialSessionId,
        status: 'active',
        last_error: null,
      })
      .eq('id', conversationId)
      .eq('official_user_id', officialUserId)
      .select(LINK_COLUMNS)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    if (!data) {
      throw new Error('Official conversation session update returned no row')
    }

    return mapRow(data)
  },

  async markActivity(
    conversationId: string,
    officialUserId: string,
    params: { incrementBy?: number; at?: string } = {}
  ): Promise<OfficialConversationLink> {
    const existing = await this.findForUser(conversationId, officialUserId)
    if (!existing) {
      throw new Error('Official conversation link not found')
    }

    const { data, error } = await getLinkTable()
      .update({
        status: 'active',
        message_count: existing.messageCount + (params.incrementBy ?? 0),
        last_message_at: params.at ?? new Date().toISOString(),
        last_error: null,
      })
      .eq('id', conversationId)
      .eq('official_user_id', officialUserId)
      .select(LINK_COLUMNS)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    if (!data) {
      throw new Error('Official conversation activity update returned no row')
    }

    return mapRow(data)
  },

  async recordError(conversationId: string, officialUserId: string, error: unknown): Promise<OfficialConversationLink> {
    if (!isUuid(conversationId)) {
      throw new Error('Official conversation link not found')
    }

    const { data, error: updateError } = await getLinkTable()
      .update({
        status: 'active',
        last_error: routeSafeError(error),
      })
      .eq('id', conversationId)
      .eq('official_user_id', officialUserId)
      .select(LINK_COLUMNS)
      .single()

    if (updateError) {
      throw new Error(updateError.message)
    }

    if (!data) {
      throw new Error('Official conversation error update returned no row')
    }

    return mapRow(data)
  },

  async markDeleted(conversationId: string, officialUserId: string): Promise<OfficialConversationLink> {
    if (!isUuid(conversationId)) {
      throw new Error('Official conversation link not found')
    }

    const now = new Date().toISOString()
    const { data, error } = await getLinkTable()
      .update({
        status: 'deleted',
        deleted_at: now,
        last_message_at: now,
      })
      .eq('id', conversationId)
      .eq('official_user_id', officialUserId)
      .select(LINK_COLUMNS)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    if (!data) {
      throw new Error('Official conversation delete update returned no row')
    }

    return mapRow(data)
  },
}
