import { CHARACTERS_TABLE } from '@/lib/db/tables'
import {
  type CharacterRuntimeAssets,
  noopCharacterRuntimeAssets,
} from '@/lib/domain/character/character-runtime-assets'
import { supabase } from '@/lib/supabase'
import type {
  AlignmentCount,
  AlignmentsResponse,
  OriginCount,
  OriginsResponse,
  TraitCount,
  TraitCountsResponse,
} from '@/types/character'

type MetadataTraitRow = {
  metadata: { attributes?: Array<{ trait_type: string; value: string | number }> } | null
}

function countTraitValues(
  rows: MetadataTraitRow[],
  traitType: string
): Map<string, number> {
  const traitCounts = new Map<string, number>()

  for (const row of rows) {
    const metadata = row.metadata
    if (!metadata?.attributes || !Array.isArray(metadata.attributes)) {
      continue
    }

    const traitAttr = metadata.attributes.find(
      (attr: { trait_type: string; value: string | number }) => attr.trait_type === traitType
    )

    if (!traitAttr?.value) {
      continue
    }

    const value = String(traitAttr.value)
    traitCounts.set(value, (traitCounts.get(value) || 0) + 1)
  }

  return traitCounts
}

async function loadAllMetadataRows(): Promise<{ rows: MetadataTraitRow[]; totalCharacters: number }> {
  const { data, error, count } = await supabase!
    .from(CHARACTERS_TABLE)
    .select('metadata', { count: 'exact' })

  if (error) {
    throw new Error(error.message)
  }

  return {
    rows: (data || []) as unknown as MetadataTraitRow[],
    totalCharacters: count || 0,
  }
}

/**
 * Handles metadata trait aggregations for filter dropdowns.
 */
export class CharacterTraitsRepository {
  constructor(
    private readonly runtimeAssets: CharacterRuntimeAssets = noopCharacterRuntimeAssets
  ) {}

  private async getLocalTraitCounts(traitType: string): Promise<{
    counts: Map<string, number>
    totalCharacters: number
  } | null> {
    const counts = await this.runtimeAssets.getTraitCounts(traitType)
    if (!counts) {
      return null
    }

    const totalCharacters = await this.runtimeAssets.getTotalCharacters()

    return {
      counts,
      totalCharacters: totalCharacters ?? 0,
    }
  }

  /**
   * Get all unique origins with character counts
   * Extracts Body trait from metadata JSONB
   */
  async getOrigins(): Promise<OriginsResponse> {
    const local = await this.getLocalTraitCounts('Body')
    if (local) {
      const origins: OriginCount[] = Array.from(local.counts.entries())
        .map(([origin, count]) => ({ origin, count }))
        .sort((left, right) => right.count - left.count)

      return {
        origins,
        totalCharacters: local.totalCharacters,
      }
    }

    const { rows, totalCharacters } = await loadAllMetadataRows()
    const originCounts = countTraitValues(rows, 'Body')
    const origins: OriginCount[] = Array.from(originCounts.entries())
      .map(([origin, count]) => ({ origin, count }))
      .sort((left, right) => right.count - left.count)

    return {
      origins,
      totalCharacters,
    }
  }

  /**
   * Get all unique alignments with character counts
   * Extracts Alignment trait from metadata JSONB
   */
  async getAlignments(): Promise<AlignmentsResponse> {
    const local = await this.getLocalTraitCounts('Alignment')
    if (local) {
      const alignments: AlignmentCount[] = Array.from(local.counts.entries())
        .map(([alignment, count]) => ({ alignment, count }))
        .sort((left, right) => left.alignment.localeCompare(right.alignment))

      return {
        alignments,
        totalCharacters: local.totalCharacters,
      }
    }

    const { rows, totalCharacters } = await loadAllMetadataRows()
    const alignmentCounts = countTraitValues(rows, 'Alignment')
    const alignments: AlignmentCount[] = Array.from(alignmentCounts.entries())
      .map(([alignment, count]) => ({ alignment, count }))
      .sort((left, right) => left.alignment.localeCompare(right.alignment))

    return {
      alignments,
      totalCharacters,
    }
  }

  /**
   * Get counts for any trait type in metadata JSONB
   * Generic method to support Armor, Back, Mask, and other trait filters
   */
  async getTraitCounts(traitType: string): Promise<TraitCountsResponse> {
    const local = await this.getLocalTraitCounts(traitType)
    if (local) {
      const traits: TraitCount[] = Array.from(local.counts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((left, right) => right.count - left.count)

      return {
        traitType,
        traits,
        totalCharacters: local.totalCharacters,
      }
    }

    const { rows, totalCharacters } = await loadAllMetadataRows()
    const traitCounts = countTraitValues(rows, traitType)
    const traits: TraitCount[] = Array.from(traitCounts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((left, right) => right.count - left.count)

    return {
      traitType,
      traits,
      totalCharacters,
    }
  }
}
