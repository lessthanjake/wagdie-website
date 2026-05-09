import { CHARACTERS_TABLE } from '@/lib/db/tables'
import {
  type CharacterRuntimeAssets,
  type CharacterTraitFilters,
  noopCharacterRuntimeAssets,
} from '@/lib/domain/character/character-runtime-assets'
import { getSupabaseAdmin, supabase } from '@/lib/supabase'
import { isBurnedOwner } from '@/lib/utils/blockchain'
import type {
  Character,
  CharacterConcord,
  CharacterFilters,
  CharactersResponse,
  Concord,
  EditableCharacterFields,
} from '@/types/character'

const TOKEN_ID_CHUNK_SIZE = 500

type CharacterQueryBuilder = ReturnType<NonNullable<typeof supabase>['from']>

function hasTraitFilters(filters: CharacterFilters): boolean {
  return Boolean(
    filters.origin ||
    filters.alignment ||
    filters.the17 ||
    filters.armor ||
    filters.back ||
    filters.mask
  )
}

function toTraitFilters(filters: CharacterFilters): CharacterTraitFilters {
  return {
    origin: filters.origin,
    alignment: filters.alignment,
    the17: filters.the17,
    armor: filters.armor,
    back: filters.back,
    mask: filters.mask,
  }
}

function normalizeCharacters(rows: Character[]): Character[] {
  return rows.map((row) => ({
    ...row,
    burned: isBurnedOwner(row.owner_address, row.burned),
  }))
}

function sortCharacters(characters: Character[], direction: CharacterFilters['sort']): Character[] {
  return [...characters].sort((left, right) => {
    return direction === 'asc'
      ? left.token_id - right.token_id
      : right.token_id - left.token_id
  })
}

function paginateCharacters(characters: Character[], filters: CharacterFilters): Character[] {
  const from = (filters.page - 1) * filters.perPage
  return characters.slice(from, from + filters.perPage)
}

function applyWalletFilter(query: CharacterQueryBuilder, filters: CharacterFilters): CharacterQueryBuilder {
  if (!filters.wallet) {
    return query
  }

  const walletLower = filters.wallet.toLowerCase()
  if (filters.tab === 'owned') {
    return query.or(`owner_address.eq.${walletLower},staker_address.eq.${walletLower}`)
  }

  return query.eq('owner_address', walletLower)
}

function applyTabFilter(query: CharacterQueryBuilder, filters: CharacterFilters): CharacterQueryBuilder {
  if (filters.tab === 'infected') {
    return query.eq('infection_status', 'infected')
  }

  if (filters.tab === 'cured') {
    return query.neq('infection_status', 'infected')
  }

  if (filters.tab === 'staked') {
    return query.not('location_id', 'is', null)
  }

  if (filters.tab === 'fallen') {
    return query.eq('burned', true)
  }

  return query
}

function applySearchFilter(query: CharacterQueryBuilder, filters: CharacterFilters): CharacterQueryBuilder {
  if (!filters.search) {
    return query
  }

  const searchTerm = filters.search.trim()
  const tokenIdSearch = parseInt(searchTerm, 10)
  if (!Number.isNaN(tokenIdSearch) && tokenIdSearch > 0) {
    return query.eq('token_id', tokenIdSearch)
  }

  return query.ilike('metadata->>name', `%${searchTerm}%`)
}

function applyHasSheetFilter(query: CharacterQueryBuilder, filters: CharacterFilters): CharacterQueryBuilder {
  if (!filters.hasSheet) {
    return query
  }

  return query.or(
    'name.not.is.null,' +
    'str.not.is.null,' +
    'level.gt.1,' +
    'background_story.not.is.null'
  )
}

function applyMetadataTraitFilters(query: CharacterQueryBuilder, filters: CharacterFilters): CharacterQueryBuilder {
  let nextQuery = query

  if (filters.origin) {
    nextQuery = nextQuery.contains('metadata', {
      attributes: [{ trait_type: 'Body', value: filters.origin }],
    })
  }

  if (filters.alignment) {
    nextQuery = nextQuery.contains('metadata', {
      attributes: [{ trait_type: 'Alignment', value: filters.alignment }],
    })
  }

  if (filters.the17) {
    nextQuery = nextQuery.contains('metadata', {
      attributes: [{ trait_type: 'The 17', value: filters.the17 }],
    })
  }

  if (filters.armor) {
    nextQuery = nextQuery.contains('metadata', {
      attributes: [{ trait_type: 'Armor', value: filters.armor }],
    })
  }

  if (filters.back) {
    nextQuery = nextQuery.contains('metadata', {
      attributes: [{ trait_type: 'Back', value: filters.back }],
    })
  }

  if (filters.mask) {
    nextQuery = nextQuery.contains('metadata', {
      attributes: [{ trait_type: 'Mask', value: filters.mask }],
    })
  }

  return nextQuery
}

function applyNonTraitFilters(query: CharacterQueryBuilder, filters: CharacterFilters): CharacterQueryBuilder {
  let nextQuery = query
  nextQuery = applyWalletFilter(nextQuery, filters)
  nextQuery = applyTabFilter(nextQuery, filters)
  nextQuery = applySearchFilter(nextQuery, filters)
  nextQuery = applyHasSheetFilter(nextQuery, filters)
  return nextQuery
}

function chunkTokenIds(tokenIds: number[]): number[][] {
  const chunks: number[][] = []

  for (let index = 0; index < tokenIds.length; index += TOKEN_ID_CHUNK_SIZE) {
    chunks.push(tokenIds.slice(index, index + TOKEN_ID_CHUNK_SIZE))
  }

  return chunks
}

/**
 * Handles core character listing, lookup, updates, and concord queries.
 */
export class CharacterQueryRepository {
  constructor(
    private readonly runtimeAssets: CharacterRuntimeAssets = noopCharacterRuntimeAssets
  ) {}

  private async findManyByLocalTraitFilters(filters: CharacterFilters): Promise<CharactersResponse> {
    const matchedTokenIds = await this.runtimeAssets.getTokenIdsForTraitFilters(toTraitFilters(filters))
    if (!matchedTokenIds || matchedTokenIds.size === 0) {
      return { characters: [], hasMore: false, totalCount: 0 }
    }

    const rows: Character[] = []

    for (const tokenIdChunk of chunkTokenIds(Array.from(matchedTokenIds))) {
      let query = supabase!
        .from(CHARACTERS_TABLE)
        .select('*')
        .in('token_id', tokenIdChunk)

      query = applyNonTraitFilters(query, filters)

      const { data, error } = await query
      if (error) {
        console.error('Error fetching locally-filtered characters:', error)
        throw new Error(`Failed to fetch characters: ${error.message}`)
      }

      rows.push(...((data || []) as unknown as Character[]))
    }

    const normalized = sortCharacters(normalizeCharacters(rows), filters.sort)
    const totalCount = normalized.length
    const pagedCharacters = paginateCharacters(normalized, filters)
    const hydratedCharacters = await this.runtimeAssets.hydrateCharacters(pagedCharacters)

    return {
      characters: hydratedCharacters,
      hasMore: totalCount > filters.page * filters.perPage,
      totalCount,
    }
  }

  /**
   * Find characters with filtering, pagination, and sorting
   */
  async findMany(filters: CharacterFilters): Promise<CharactersResponse> {
    if (filters.tab === 'owned' && !filters.wallet) {
      return { characters: [], hasMore: false, totalCount: 0 }
    }

    if (hasTraitFilters(filters)) {
      const localTokenIds = await this.runtimeAssets.getTokenIdsForTraitFilters(toTraitFilters(filters))
      if (localTokenIds) {
        return this.findManyByLocalTraitFilters(filters)
      }
    }

    let query = supabase!
      .from(CHARACTERS_TABLE)
      .select('*', { count: 'exact' })

    query = applyNonTraitFilters(query, filters)
    query = applyMetadataTraitFilters(query, filters)
    query = query.order('token_id', { ascending: filters.sort === 'asc' })

    const from = (filters.page - 1) * filters.perPage
    const to = from + filters.perPage - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching characters:', error)
      throw new Error(`Failed to fetch characters: ${error.message}`)
    }

    const normalizedCharacters = normalizeCharacters((data || []) as unknown as Character[])
    const hydratedCharacters = await this.runtimeAssets.hydrateCharacters(normalizedCharacters)
    const totalCount = count || 0

    return {
      characters: hydratedCharacters,
      hasMore: totalCount > filters.page * filters.perPage,
      totalCount,
    }
  }

  /**
   * Find a single character by token ID
   */
  async findById(tokenId: number): Promise<Character | null> {
    const { data, error } = await supabase!
      .from(CHARACTERS_TABLE)
      .select('*')
      .eq('token_id', tokenId)
      .single()

    if (error) {
      console.error(`Error fetching character ${tokenId}:`, error)
      return null
    }

    const [hydratedCharacter] = await this.runtimeAssets.hydrateCharacters(
      normalizeCharacters([data as unknown as Character])
    )

    return hydratedCharacter || null
  }

  /**
   * Update character data
   * Uses admin client (service role) to bypass RLS since auth is handled at API route level
   */
  async update(
    tokenId: number,
    updates: Partial<Pick<Character, EditableCharacterFields>>
  ): Promise<Character | null> {
    const client = getSupabaseAdmin()
    if (!client) {
      console.error('[Repository] Supabase admin client not initialized (missing service role key)')
      throw new Error('Database client not configured. Please check server configuration.')
    }

    const query = client.from(CHARACTERS_TABLE) as unknown as {
      update: (values: Record<string, unknown>) => {
        eq: (column: string, value: number) => {
          select: () => {
            single: () => Promise<{ data: unknown; error: { message: string } | null }>
          }
        }
      }
    }
    const { data, error } = await query
      .update(updates as Record<string, unknown>)
      .eq('token_id', tokenId)
      .select()
      .single()

    if (error) {
      console.error(`[Repository] Error updating character ${tokenId}:`, error.message)
      throw new Error(`Failed to update character: ${error.message}`)
    }

    const [hydratedCharacter] = await this.runtimeAssets.hydrateCharacters(
      normalizeCharacters([data as Character])
    )

    return hydratedCharacter || null
  }

  /**
   * Find concords owned by a character
   */
  async findConcords(tokenId: number): Promise<Array<CharacterConcord & { concord: Concord }>> {
    const { data, error } = await supabase!
      .from('character_concords')
      .select(`
        *,
        concord:concords(*)
      `)
      .eq('token_id', tokenId)

    if (error) {
      console.error(`Error fetching concords for character ${tokenId}:`, error)
      throw new Error(`Failed to fetch character concords: ${error.message}`)
    }

    return data as Array<CharacterConcord & { concord: Concord }>
  }
}
