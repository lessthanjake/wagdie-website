import { createHash } from 'crypto'
import { elizaConfig, type ElizaIntegrationMode } from '@/lib/eliza/config'
import type { CharacterRecord } from '@/lib/eliza/gateway/types'
import type { StoredKnowledgeDocument } from '@/lib/eliza/knowledge'
import {
  createOfficialKnowledgeClient,
  type OfficialKnowledgeClient,
  type OfficialKnowledgeSourcePointer,
} from '@/lib/eliza/official/knowledge-client'
import {
  knowledgeSyncStateRepository,
  type KnowledgeSyncState,
  type KnowledgeSyncStateRepository,
} from '@/lib/eliza/knowledgeSyncRepository'

export interface KnowledgeSyncResult {
  attempted: boolean
  ok: boolean
  state?: KnowledgeSyncState
  error?: string
}

export interface KnowledgeSyncParams {
  tokenId: string
  record: CharacterRecord
  document: StoredKnowledgeDocument
}

export interface KnowledgeDeleteSyncParams {
  tokenId: string
  record: CharacterRecord
  document: StoredKnowledgeDocument
}

interface ResolveOfficialAgentParams {
  mode: Exclude<ElizaIntegrationMode, 'legacy'>
  tokenId: string
  record: CharacterRecord
}

interface KnowledgeSyncDeps {
  mode?: ElizaIntegrationMode
  repository?: KnowledgeSyncStateRepository
  officialKnowledgeClient?: OfficialKnowledgeClient
  resolveOfficialAgentId?: (params: ResolveOfficialAgentParams) => Promise<string | null>
}

function isOfficialKnowledgeSyncMode(mode: ElizaIntegrationMode): mode is Exclude<ElizaIntegrationMode, 'legacy'> {
  return mode === 'dual' || mode === 'official'
}

export function hashKnowledgeContent(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.slice(0, 1000)
  }

  return 'Official ElizaOS knowledge sync failed'
}

function buildSourcePointer(input: {
  tokenId: string
  documentId: string
  officialAgentId: string
  path: string
  contentHash: string
}): OfficialKnowledgeSourcePointer {
  return {
    tokenId: input.tokenId,
    documentId: input.documentId,
    officialAgentId: input.officialAgentId,
    path: input.path,
    contentHash: input.contentHash,
    version: `sha256:${input.contentHash}`,
  }
}

async function resolveOfficialAgentId(
  params: ResolveOfficialAgentParams
): Promise<string | null> {
  if (params.mode === 'official') {
    return params.record.id
  }

  const { syncOfficialPersonaShadow } = await import('@/lib/eliza/personaMigration')
  const result = await syncOfficialPersonaShadow({
    tokenId: params.tokenId,
    legacyCharacterId: params.record.id,
    character: params.record.character,
  })

  return result.link?.officialAgentId ?? null
}

async function recordError(
  repository: KnowledgeSyncStateRepository,
  params: {
    tokenId: string
    documentId: string
    officialAgentId?: string | null
    officialMemoryId?: string | null
    contentHash?: string | null
    sourcePointer?: Record<string, unknown>
  },
  error: unknown
): Promise<KnowledgeSyncResult> {
  const message = normalizeErrorMessage(error)

  try {
    const state = await repository.upsert({
      tokenId: params.tokenId,
      documentId: params.documentId,
      officialAgentId: params.officialAgentId ?? null,
      officialMemoryId: params.officialMemoryId ?? null,
      contentHash: params.contentHash ?? null,
      sourcePointer: params.sourcePointer ?? {},
      status: 'error',
      lastError: message,
      lastSyncedAt: null,
      deletedAt: null,
    })

    return { attempted: true, ok: false, state, error: message }
  } catch (recordFailure) {
    console.error('[Eliza Knowledge Sync] Failed to record official sync error:', recordFailure)
    return { attempted: true, ok: false, error: message }
  }
}

export async function syncKnowledgeDocumentToOfficial(
  params: KnowledgeSyncParams,
  deps: KnowledgeSyncDeps = {}
): Promise<KnowledgeSyncResult> {
  const mode = deps.mode ?? elizaConfig.mode

  if (!isOfficialKnowledgeSyncMode(mode)) {
    return { attempted: false, ok: true }
  }

  const repository = deps.repository ?? knowledgeSyncStateRepository
  const resolveAgentId = deps.resolveOfficialAgentId ?? resolveOfficialAgentId
  const content = params.document.content ?? ''
  const contentHash = hashKnowledgeContent(content)
  const previousState = await repository.findByDocument(params.tokenId, params.document.id).catch(() => null)
  let officialAgentId: string | null = previousState?.officialAgentId ?? null
  let sourcePointer: OfficialKnowledgeSourcePointer | undefined

  try {
    officialAgentId = await resolveAgentId({
      mode,
      tokenId: params.tokenId,
      record: params.record,
    })

    if (!officialAgentId) {
      throw new Error('Official ElizaOS agent id is required for knowledge sync')
    }

    const officialClient = deps.officialKnowledgeClient ?? createOfficialKnowledgeClient()

    sourcePointer = buildSourcePointer({
      tokenId: params.tokenId,
      documentId: params.document.id,
      officialAgentId,
      path: params.document.path,
      contentHash,
    })

    await repository.upsert({
      tokenId: params.tokenId,
      documentId: params.document.id,
      officialAgentId,
      officialMemoryId: previousState?.officialMemoryId ?? null,
      contentHash,
      sourcePointer,
      status: 'pending',
      lastError: null,
      lastSyncedAt: null,
      deletedAt: null,
    })

    const response = await officialClient.indexDocument({
      tokenId: params.tokenId,
      documentId: params.document.id,
      officialAgentId,
      path: params.document.path,
      content,
      contentHash,
      sourcePointer,
    })

    const state = await repository.upsert({
      tokenId: params.tokenId,
      documentId: params.document.id,
      officialAgentId,
      officialMemoryId: response.memoryId,
      contentHash,
      sourcePointer,
      status: 'indexed',
      lastError: null,
      lastSyncedAt: new Date().toISOString(),
      deletedAt: null,
    })

    return { attempted: true, ok: true, state }
  } catch (error) {
    return recordError(
      repository,
      {
        tokenId: params.tokenId,
        documentId: params.document.id,
        officialAgentId,
        officialMemoryId: previousState?.officialMemoryId ?? null,
        contentHash,
        sourcePointer,
      },
      error
    )
  }
}

export async function deleteKnowledgeDocumentFromOfficial(
  params: KnowledgeDeleteSyncParams,
  deps: KnowledgeSyncDeps = {}
): Promise<KnowledgeSyncResult> {
  const mode = deps.mode ?? elizaConfig.mode

  if (!isOfficialKnowledgeSyncMode(mode)) {
    return { attempted: false, ok: true }
  }

  const repository = deps.repository ?? knowledgeSyncStateRepository
  const content = params.document.content ?? ''
  const contentHash = hashKnowledgeContent(content)

  try {
    const previousState = await repository.findByDocument(params.tokenId, params.document.id)
    const officialAgentId = previousState?.officialAgentId ?? (mode === 'official' ? params.record.id : null)
    const officialMemoryId = previousState?.officialMemoryId ?? null

    if (officialMemoryId || officialAgentId) {
      const officialClient = deps.officialKnowledgeClient ?? createOfficialKnowledgeClient()
      await officialClient.deleteDocument({
        tokenId: params.tokenId,
        documentId: params.document.id,
        officialAgentId,
        officialMemoryId,
        contentHash: previousState?.contentHash ?? contentHash,
      })
    }

    const state = await repository.upsert({
      tokenId: params.tokenId,
      documentId: params.document.id,
      officialAgentId,
      officialMemoryId,
      contentHash: previousState?.contentHash ?? contentHash,
      sourcePointer:
        previousState?.sourcePointer ??
        (officialAgentId
          ? buildSourcePointer({
              tokenId: params.tokenId,
              documentId: params.document.id,
              officialAgentId,
              path: params.document.path,
              contentHash,
            })
          : {}),
      status: 'deleted',
      lastError: null,
      lastSyncedAt: new Date().toISOString(),
      deletedAt: new Date().toISOString(),
    })

    return { attempted: true, ok: true, state }
  } catch (error) {
    const previousState = await repository.findByDocument(params.tokenId, params.document.id).catch(() => null)
    return recordError(
      repository,
      {
        tokenId: params.tokenId,
        documentId: params.document.id,
        officialAgentId: previousState?.officialAgentId ?? (mode === 'official' ? params.record.id : null),
        officialMemoryId: previousState?.officialMemoryId ?? null,
        contentHash: previousState?.contentHash ?? contentHash,
        sourcePointer: previousState?.sourcePointer ?? {},
      },
      error
    )
  }
}
