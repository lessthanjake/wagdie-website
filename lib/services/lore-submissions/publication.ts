import type { Json } from '@/lib/database.types';
import type { LoreSubmission, LoreSubmissionDetailDto, LoreSubmissionListItemDto } from '@/types/lore-submission';

export function toListItem(submission: LoreSubmission): LoreSubmissionListItemDto {
  return {
    id: submission.id,
    tokenId: submission.token_id,
    title: submission.curated_title ?? submission.title,
    summary: submission.curated_summary ?? submission.summary,
    status: submission.status,
    visibility: submission.visibility,
    publishedSlug: submission.published_slug,
    submittedAt: submission.submitted_at,
    updatedAt: submission.updated_at,
  };
}

export function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return slug || 'community-lore';
}

export function idSuffix(id: string): string {
  return id.replace(/[^a-fA-F0-9]/g, '').slice(0, 8).toLowerCase() || 'submission';
}

export function publicTitle(submission: LoreSubmission): string {
  return submission.curated_title ?? submission.title;
}

export function buildPublicationSnapshot(detail: LoreSubmissionDetailDto, capturedAt: string): Json {
  const { submission, links } = detail;
  return {
    title: submission.curated_title ?? submission.title,
    summary: submission.curated_summary ?? submission.summary,
    bodyMarkdown: submission.curated_body_markdown ?? submission.body_markdown,
    tags: submission.curated_tags ?? submission.tags,
    seasonId: submission.season_id,
    characterIds: submission.character_ids,
    locationIds: submission.location_ids,
    links: links.map((link) => ({
      id: link.id,
      role: link.role,
      linkType: link.link_type,
      originalUrl: link.original_url,
      normalizedUrl: link.normalized_url,
      displayTitle: link.display_title,
      platform: link.platform,
      archivedUrl: link.archived_url,
      attribution: link.attribution,
      metadata: link.metadata,
      sortOrder: link.sort_order,
    })),
    capturedAt,
  };
}
