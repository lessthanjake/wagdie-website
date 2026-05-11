import { getSupabaseAdmin } from '@/lib/supabase'

export type KnowledgeSyncStatus = 'pending' | 'indexed' | 'deleted' | 'error'

export interface KnowledgeSyncState {
  tokenId: string
  documentId: string
  officialAgentId: string | null
  officialMemoryId: string | null
  contentHash: string | null
  sourcePointer: Record<string, unknown>
  status: KnowledgeSyncStatus
  lastError: string | null
  lastSyncedAt: string | null
  deletedAt: string | null
  createdAt?: string
  updatedAt?: string
}

export interface KnowledgeSyncStateUpsert {
  tokenId: string
  documentId: string
  officialAgentId?: string | null
  officialMemoryId?: string | null
  contentHash?: string | null
  sourcePointer?: Record<string, unknown>
  status: KnowledgeSyncStatus
  lastError?: string | null
  lastSyncedAt?: string | null
  deletedAt?: string | null
}

type KnowledgeSyncRow = {
  token_id: string
  document_id: string
  official_agent_id: string | null
  official_memory_id: string | null
  content_hash: string | null
  source_pointer: Record<string, unknown> | null
  status: KnowledgeSyncStatus
  last_error: string | null
  last_synced_at: string | null
  deleted_at: string | null
  created_at?: string
  updated_at?: string
}

type QueryResult<T> = Promise<{ data: T | null; error: { message: string } | null }>

type SelectEqChain = {
  eq: (column: string, value: string) => SelectEqChain
  maybeSingle: () => QueryResult<KnowledgeSyncRow>
}

type KnowledgeSyncTable = {
  select: (columns: string) => SelectEqChain
  upsert: (
    values: Record<string, unknown>,
    options: { onConflict: string }
  ) => {
    select: (columns: string) => {
      single: () => QueryResult<KnowledgeSyncRow>
    }
  }
}

const TABLE_NAME = 'eliza_knowledge_sync_states'
const STATE_COLUMNS =
  'token_id, document_id, official_agent_id, official_memory_id, content_hash, source_pointer, status, last_error, last_synced_at, deleted_at, created_at, updated_at'

function getKnowledgeSyncTable(): KnowledgeSyncTable {
  const client = getSupabaseAdmin()
  if (!client) {
    throw new Error('Supabase admin client not configured')
  }

  return client.from(TABLE_NAME as never) as unknown as KnowledgeSyncTable
}

function mapRow(row: KnowledgeSyncRow): KnowledgeSyncState {
  return {
    tokenId: row.token_id,
    documentId: row.document_id,
    officialAgentId: row.official_agent_id,
    officialMemoryId: row.official_memory_id,
    contentHash: row.content_hash,
    sourcePointer: row.source_pointer ?? {},
    status: row.status,
    lastError: row.last_error,
    lastSyncedAt: row.last_synced_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toRow(input: KnowledgeSyncStateUpsert): Record<string, unknown> {
  return {
    token_id: input.tokenId,
    document_id: input.documentId,
    official_agent_id: input.officialAgentId ?? null,
    official_memory_id: input.officialMemoryId ?? null,
    content_hash: input.contentHash ?? null,
    source_pointer: input.sourcePointer ?? {},
    status: input.status,
    last_error: input.lastError ?? null,
    last_synced_at: input.lastSyncedAt ?? null,
    deleted_at: input.deletedAt ?? null,
  }
}

export interface KnowledgeSyncStateRepository {
  findByDocument(tokenId: string, documentId: string): Promise<KnowledgeSyncState | null>
  upsert(input: KnowledgeSyncStateUpsert): Promise<KnowledgeSyncState>
}

export const knowledgeSyncStateRepository: KnowledgeSyncStateRepository = {
  async findByDocument(tokenId: string, documentId: string): Promise<KnowledgeSyncState | null> {
    const { data, error } = await getKnowledgeSyncTable()
      .select(STATE_COLUMNS)
      .eq('token_id', tokenId)
      .eq('document_id', documentId)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    return data ? mapRow(data) : null
  },

  async upsert(input: KnowledgeSyncStateUpsert): Promise<KnowledgeSyncState> {
    const { data, error } = await getKnowledgeSyncTable()
      .upsert(toRow(input), { onConflict: 'token_id,document_id' })
      .select(STATE_COLUMNS)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    if (!data) {
      throw new Error('Knowledge sync state upsert returned no row')
    }

    return mapRow(data)
  },
}
