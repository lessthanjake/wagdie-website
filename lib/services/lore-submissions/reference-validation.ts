import type { LoreBaseDataset } from '@/lib/lore/base-dataset';
import { loreSubmissionSourceId } from '@/lib/lore/submissions/adapter';
import type { CanonizationStep } from '@/lib/lore/types';
import type { CreateLoreSubmissionInput, LoreSubmissionDetailDto } from '@/types/lore-submission';

export function dedupeStrings(values: string[] | undefined): string[] | undefined {
  if (!values) return undefined;
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function getSubmissionSourceIds(detail: LoreSubmissionDetailDto | undefined): Set<string> {
  return new Set((detail?.links ?? []).flatMap((link) => (
    link.role === 'source' || link.role === 'source_media'
      ? [loreSubmissionSourceId(detail!.submission.id, link.id)]
      : []
  )));
}

export function getCharacterIdsForTokenId(dataset: LoreBaseDataset, tokenId: string): string[] {
  const parsedTokenId = Number(tokenId);
  if (!Number.isInteger(parsedTokenId)) return [];

  const datasetCharacterIds = dataset.characters
    .filter((character) => character.tokenId === parsedTokenId)
    .map((character) => character.id);

  return datasetCharacterIds.length > 0 ? datasetCharacterIds : [`character-${tokenId}`];
}

export function enrichCreateInputWithLoreRefs(
  input: CreateLoreSubmissionInput,
  dataset: LoreBaseDataset,
): CreateLoreSubmissionInput {
  const tokenCharacterIds = getCharacterIdsForTokenId(dataset, input.tokenId);

  return {
    ...input,
    characterIds: [...new Set([...input.characterIds, ...tokenCharacterIds])],
    locationIds: [...new Set(input.locationIds)],
  };
}

export function validateCanonPathSourceReferences(
  canonPath: CanonizationStep[] | undefined,
  dataset: LoreBaseDataset,
  fieldPrefix: string,
  submissionSourceIds: Set<string> = new Set(),
): string[] {
  const errors: string[] = [];

  (canonPath ?? []).forEach((step, index) => {
    step.sourceIds?.forEach((sourceId) => {
      if (!dataset.indexes.sourcesById.has(sourceId) && !submissionSourceIds.has(sourceId)) {
        errors.push(`${fieldPrefix}[${index}].sourceIds references missing source: ${sourceId}`);
      }
    });
  });

  return errors;
}

function isSubmissionTokenCharacterId(characterId: string): boolean {
  return /^character-[1-9]\d*$/.test(characterId);
}

export function validateLoreReferenceIds(
  dataset: LoreBaseDataset,
  refs: {
    seasonId?: string | null;
    characterIds?: string[] | null;
    locationIds?: string[] | null;
    canonPath?: CanonizationStep[];
  },
  submissionSourceIds: Set<string> = new Set(),
): string[] {
  const errors: string[] = [];

  if (refs.seasonId && !dataset.indexes.seasonsById.has(refs.seasonId)) {
    errors.push(`seasonId references missing season: ${refs.seasonId}`);
  }

  (refs.characterIds ?? []).forEach((characterId) => {
    if (!dataset.indexes.charactersById.has(characterId) && !isSubmissionTokenCharacterId(characterId)) {
      errors.push(`characterIds references missing character: ${characterId}`);
    }
  });

  (refs.locationIds ?? []).forEach((locationId) => {
    if (!dataset.indexes.locationsById.has(locationId)) {
      errors.push(`locationIds references missing location: ${locationId}`);
    }
  });

  errors.push(...validateCanonPathSourceReferences(refs.canonPath, dataset, 'canonPath', submissionSourceIds));
  return errors;
}
