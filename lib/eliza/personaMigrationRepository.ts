import { getSupabaseAdmin } from '@/lib/supabase'

export type PersonaMigrationStatus = 'pending' | 'synced' | 'error'

export interface PersonaMigrationLink {
  tokenId: string
  legacyCharacterId: string | null
  officialAgentId: string | null
  status: PersonaMigrationStatus
  lastError: string | null
  lastSyncedAt: string | null
  createdAt?: string
  updatedAt?: string
}

export interface PersonaMigrationLinkUpsert {
  tokenId: string
  legacyCharacterId?: string | null
  officialAgentId?: string | null
  status: PersonaMigrationStatus
  lastError?: string | null
  lastSyncedAt?: string | null
}

type PersonaMigrationRow = {
  token_id: string
  legacy_character_id: string | null
  official_agent_id: string | null
  status: PersonaMigrationStatus
  last_error: string | null
  last_synced_at: string | null
  created_at?: string
  updated_at?: string
}

type QueryResult<T> = Promise<{ data: T | null; error: { message: string } | null }>

type LinkTable = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      maybeSingle: () => QueryResult<PersonaMigrationRow>
    }
  }
  upsert: (
    values: Record<string, unknown>,
    options: { onConflict: string }
  ) => {
    select: (columns: string) => {
      single: () => QueryResult<PersonaMigrationRow>
    }
  }
}

const TABLE_NAME = 'eliza_persona_migration_links'
const LINK_COLUMNS =
  'token_id, legacy_character_id, official_agent_id, status, last_error, last_synced_at, created_at, updated_at'

function getLinkTable(): LinkTable {
  const client = getSupabaseAdmin()
  if (!client) {
    throw new Error('Supabase admin client not configured')
  }

  return client.from(TABLE_NAME as never) as unknown as LinkTable
}

function mapRow(row: PersonaMigrationRow): PersonaMigrationLink {
  return {
    tokenId: row.token_id,
    legacyCharacterId: row.legacy_character_id,
    officialAgentId: row.official_agent_id,
    status: row.status,
    lastError: row.last_error,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toRow(input: PersonaMigrationLinkUpsert): Record<string, unknown> {
  return {
    token_id: input.tokenId,
    legacy_character_id: input.legacyCharacterId ?? null,
    official_agent_id: input.officialAgentId ?? null,
    status: input.status,
    last_error: input.lastError ?? null,
    last_synced_at: input.lastSyncedAt ?? null,
  }
}

export interface PersonaMigrationLinkRepository {
  findByTokenId(tokenId: string): Promise<PersonaMigrationLink | null>
  upsert(input: PersonaMigrationLinkUpsert): Promise<PersonaMigrationLink>
}

export const personaMigrationLinkRepository: PersonaMigrationLinkRepository = {
  async findByTokenId(tokenId: string): Promise<PersonaMigrationLink | null> {
    const { data, error } = await getLinkTable()
      .select(LINK_COLUMNS)
      .eq('token_id', tokenId)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    return data ? mapRow(data) : null
  },

  async upsert(input: PersonaMigrationLinkUpsert): Promise<PersonaMigrationLink> {
    const { data, error } = await getLinkTable()
      .upsert(toRow(input), { onConflict: 'token_id' })
      .select(LINK_COLUMNS)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    if (!data) {
      throw new Error('Persona migration link upsert returned no row')
    }

    return mapRow(data)
  },
}
