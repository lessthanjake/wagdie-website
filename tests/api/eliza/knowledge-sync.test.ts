/**
 * @jest-environment node
 */

import type { CharacterRecord } from '@/lib/eliza/gateway/types'
import {
  deleteKnowledgeDocumentFromOfficial,
  hashKnowledgeContent,
  syncKnowledgeDocumentToOfficial,
} from '@/lib/eliza/knowledgeSync'
import { createOfficialKnowledgeClient } from '@/lib/eliza/official/knowledge-client'
import type { KnowledgeSyncState, KnowledgeSyncStateRepository } from '@/lib/eliza/knowledgeSyncRepository'
import type { OfficialKnowledgeClient } from '@/lib/eliza/official/knowledge-client'

function makeRecord(id = 'official-agent-1'): CharacterRecord {
  return {
    id,
    externalId: '123',
    character: {
      name: 'Ash',
      knowledge: [],
    },
    createdAt: '2026-05-10T00:00:00.000Z',
    updatedAt: '2026-05-10T00:00:00.000Z',
  }
}

function makeState(input: Partial<KnowledgeSyncState> = {}): KnowledgeSyncState {
  return {
    tokenId: '123',
    documentId: 'doc-1',
    officialAgentId: 'official-agent-1',
    officialMemoryId: 'memory-1',
    contentHash: hashKnowledgeContent('Full lore'),
    sourcePointer: {},
    status: 'indexed',
    lastError: null,
    lastSyncedAt: null,
    deletedAt: null,
    ...input,
  }
}

function makeRepository(previousState: KnowledgeSyncState | null = null) {
  const states: KnowledgeSyncState[] = []
  const repository: KnowledgeSyncStateRepository = {
    findByDocument: jest.fn(async () => previousState),
    upsert: jest.fn(async (input) => {
      const state = makeState({
        tokenId: input.tokenId,
        documentId: input.documentId,
        officialAgentId: input.officialAgentId ?? null,
        officialMemoryId: input.officialMemoryId ?? null,
        contentHash: input.contentHash ?? null,
        sourcePointer: input.sourcePointer ?? {},
        status: input.status,
        lastError: input.lastError ?? null,
        lastSyncedAt: input.lastSyncedAt ?? null,
        deletedAt: input.deletedAt ?? null,
      })
      states.push(state)
      return state
    }),
  }

  return { repository, states }
}

function makeOfficialClient(): jest.Mocked<OfficialKnowledgeClient> {
  return {
    indexDocument: jest.fn(async () => ({ memoryId: 'memory-1', status: 'indexed' })),
    deleteDocument: jest.fn(async () => ({ memoryId: 'memory-1', status: 'deleted' })),
  }
}

describe('official knowledge sync', () => {
  it('does nothing in legacy mode', async () => {
    const { repository } = makeRepository()
    const officialKnowledgeClient = makeOfficialClient()

    const result = await syncKnowledgeDocumentToOfficial(
      {
        tokenId: '123',
        record: makeRecord('legacy-record-1'),
        document: { id: 'doc-1', path: 'lore.md', content: 'Full lore' },
      },
      {
        mode: 'legacy',
        repository,
        officialKnowledgeClient,
      }
    )

    expect(result).toEqual({ attempted: false, ok: true })
    expect(repository.upsert).not.toHaveBeenCalled()
    expect(officialKnowledgeClient.indexDocument).not.toHaveBeenCalled()
  })

  it('indexes uploaded knowledge in dual mode and records durable source pointers', async () => {
    const { repository, states } = makeRepository()
    const officialKnowledgeClient = makeOfficialClient()

    const result = await syncKnowledgeDocumentToOfficial(
      {
        tokenId: '123',
        record: makeRecord('legacy-record-1'),
        document: { id: 'doc-1', path: 'lore.md', content: 'Full lore' },
      },
      {
        mode: 'dual',
        repository,
        officialKnowledgeClient,
        resolveOfficialAgentId: async () => 'official-agent-1',
      }
    )

    const contentHash = hashKnowledgeContent('Full lore')

    expect(result.ok).toBe(true)
    expect(officialKnowledgeClient.indexDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenId: '123',
        documentId: 'doc-1',
        officialAgentId: 'official-agent-1',
        path: 'lore.md',
        content: 'Full lore',
        contentHash,
        sourcePointer: expect.objectContaining({
          tokenId: '123',
          documentId: 'doc-1',
          officialAgentId: 'official-agent-1',
          version: `sha256:${contentHash}`,
        }),
      })
    )
    expect(states.map((state) => state.status)).toEqual(['pending', 'indexed'])
    expect(states[1]).toMatchObject({
      officialMemoryId: 'memory-1',
      contentHash,
      lastError: null,
    })
  })

  it('records sync failure without throwing for dual mode callers', async () => {
    const previousState = makeState({ officialMemoryId: 'previous-memory-1' })
    const { repository, states } = makeRepository(previousState)
    const officialKnowledgeClient = makeOfficialClient()
    officialKnowledgeClient.indexDocument.mockRejectedValueOnce(new Error('Service unavailable'))

    const result = await syncKnowledgeDocumentToOfficial(
      {
        tokenId: '123',
        record: makeRecord('legacy-record-1'),
        document: { id: 'doc-1', path: 'lore.md', content: 'Full lore' },
      },
      {
        mode: 'dual',
        repository,
        officialKnowledgeClient,
        resolveOfficialAgentId: async () => 'official-agent-1',
      }
    )

    expect(result).toMatchObject({ attempted: true, ok: false, error: 'Service unavailable' })
    expect(states.map((state) => state.status)).toEqual(['pending', 'error'])
    expect(states[1]).toMatchObject({
      lastError: 'Service unavailable',
      officialAgentId: 'official-agent-1',
      officialMemoryId: 'previous-memory-1',
    })
  })

  it('uses the official record id as the official agent id in official mode', async () => {
    const { repository } = makeRepository()
    const officialKnowledgeClient = makeOfficialClient()

    await syncKnowledgeDocumentToOfficial(
      {
        tokenId: '123',
        record: makeRecord('official-agent-from-record'),
        document: { id: 'doc-1', path: 'lore.md', content: 'Full lore' },
      },
      {
        mode: 'official',
        repository,
        officialKnowledgeClient,
      }
    )

    expect(officialKnowledgeClient.indexDocument).toHaveBeenCalledWith(
      expect.objectContaining({ officialAgentId: 'official-agent-from-record' })
    )
  })

  it('falls back to deterministic official invalidation when only an agent id exists', async () => {
    const previousState = makeState({
      officialAgentId: 'official-agent-1',
      officialMemoryId: null,
      sourcePointer: { tokenId: '123', documentId: 'doc-1' },
    })
    const { repository } = makeRepository(previousState)
    const officialKnowledgeClient = makeOfficialClient()

    await deleteKnowledgeDocumentFromOfficial(
      {
        tokenId: '123',
        record: makeRecord('legacy-record-1'),
        document: { id: 'doc-1', path: 'lore.md', content: 'Full lore' },
      },
      {
        mode: 'dual',
        repository,
        officialKnowledgeClient,
      }
    )

    expect(officialKnowledgeClient.deleteDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenId: '123',
        documentId: 'doc-1',
        officialAgentId: 'official-agent-1',
        officialMemoryId: null,
      })
    )
  })

  it('invalidates official memory on delete when a memory id exists', async () => {
    const previousState = makeState({
      officialAgentId: 'official-agent-1',
      officialMemoryId: 'memory-1',
      contentHash: hashKnowledgeContent('Full lore'),
      sourcePointer: { tokenId: '123', documentId: 'doc-1' },
    })
    const { repository, states } = makeRepository(previousState)
    const officialKnowledgeClient = makeOfficialClient()

    const result = await deleteKnowledgeDocumentFromOfficial(
      {
        tokenId: '123',
        record: makeRecord('legacy-record-1'),
        document: { id: 'doc-1', path: 'lore.md', content: 'Full lore' },
      },
      {
        mode: 'dual',
        repository,
        officialKnowledgeClient,
      }
    )

    expect(result.ok).toBe(true)
    expect(officialKnowledgeClient.deleteDocument).toHaveBeenCalledWith({
      tokenId: '123',
      documentId: 'doc-1',
      officialAgentId: 'official-agent-1',
      officialMemoryId: 'memory-1',
      contentHash: hashKnowledgeContent('Full lore'),
    })
    expect(states).toHaveLength(1)
    expect(states[0]).toMatchObject({
      status: 'deleted',
      officialMemoryId: 'memory-1',
      lastError: null,
    })
  })

  it('rejects malformed official index responses instead of recording missing memory ids', async () => {
    const fetchImpl = jest.fn(async () =>
      new Response(JSON.stringify({ status: 'indexed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    ) as jest.MockedFunction<typeof fetch>
    const client = createOfficialKnowledgeClient({
      baseUrl: 'http://localhost:3001',
      apiKey: 'test-token',
      fetchImpl,
    })

    await expect(
      client.indexDocument({
        tokenId: '123',
        documentId: 'doc-1',
        officialAgentId: 'official-agent-1',
        path: 'lore.md',
        content: 'Full lore',
        contentHash: hashKnowledgeContent('Full lore'),
        sourcePointer: {
          tokenId: '123',
          documentId: 'doc-1',
          officialAgentId: 'official-agent-1',
          path: 'lore.md',
          contentHash: hashKnowledgeContent('Full lore'),
          version: `sha256:${hashKnowledgeContent('Full lore')}`,
        },
      })
    ).rejects.toThrow('invalid response')
  })
})
