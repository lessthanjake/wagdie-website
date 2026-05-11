/**
 * @jest-environment node
 */

/**
 * Unit tests for Import/Export API Routes
 * T055 [P3] [US6] Import/Export API tests
 *
 * Test Coverage:
 * - Export route returns valid JSON
 * - Export route handles missing character
 * - Export route converts message examples to Eliza format
 * - Import route validates input
 * - Import route handles valid import
 * - Import route skips knowledge documents with warning
 * - Import route converts Eliza message format to SDK format
 */

import { NextRequest } from 'next/server'
import { GET as exportHandler } from '@/app/api/eliza/characters/[tokenId]/export/route'
import { POST as importHandler } from '@/app/api/eliza/characters/[tokenId]/import/route'
import { getSession } from '@/lib/auth/session'
import { elizaConfig } from '@/lib/eliza/config'
import { recordPersonaMigrationSuccess, syncOfficialPersonaShadow } from '@/lib/eliza/personaMigration'
import { getCharacter } from '@/lib/services/character-service'

// Mock the Eliza client (canonical record APIs)
const mockGetRecordByExternalId = jest.fn()
const mockReplaceRecord = jest.fn()
const mockIsAdmin = jest.fn()

jest.mock('@/lib/auth/session', () => ({ getSession: jest.fn() }))
jest.mock('@/lib/services/character-service', () => ({ getCharacter: jest.fn() }))
jest.mock('@/lib/auth/admin', () => ({ isAdmin: (address: string) => mockIsAdmin(address) }))
jest.mock('@/lib/eliza/personaMigration', () => ({
  recordPersonaMigrationSuccess: jest.fn(),
  syncOfficialPersonaShadow: jest.fn(),
}))

jest.mock('@/lib/eliza/client', () => ({
  getElizaClient: () => ({
    characters: {
      getRecordByExternalId: mockGetRecordByExternalId,
      replaceRecord: mockReplaceRecord,
    },
  }),
}))

// Mock validation schema
jest.mock('@/lib/eliza/validation', () => ({
  elizaCharacterExportSchema: {
    safeParse: jest.fn((data) => {
      // Simple validation - just check required fields exist
      if (typeof data !== 'object' || data === null) {
        return {
          success: false,
          error: { errors: [{ path: [], message: 'Invalid data' }] },
        }
      }
      return { success: true, data }
    }),
  },
}))

describe('Export API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const createRequest = () => {
    return new NextRequest('http://localhost/api/eliza/characters/123/export')
  }

  const createParams = (tokenId: string) => ({
    params: Promise.resolve({ tokenId }),
  })

  describe('successful export', () => {
    it('should return character data as JSON with download headers', async () => {
      mockGetRecordByExternalId.mockResolvedValueOnce({
        id: 'record-123',
        character: {
          name: 'Test Character',
          bio: ['A brave warrior'],
          lore: ['Born in darkness'],
          topics: ['combat', 'honor'],
          adjectives: ['brave', 'strong'],
          style: { all: ['Be concise'], chat: [], post: [] },
          postExamples: ['Just another day...'],
          knowledge: [],
        },
      })

      const response = await exportHandler(createRequest(), createParams('123'))

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(response.headers.get('Content-Disposition')).toContain('test-character-character.json')

      const data = await response.json()
      expect(data.name).toBe('Test Character')
      expect(data.bio).toEqual(['A brave warrior'])
      expect(data.topics).toContain('combat')
    })

    it('should convert SDK message examples to Eliza format', async () => {
      mockGetRecordByExternalId.mockResolvedValueOnce({
        id: 'record-123',
        character: {
          name: 'Test',
          bio: ['Bio'],
          messageExamples: [
            [
              { name: '{{user1}}', content: { text: 'Hello there' } },
              { name: '{{char}}', content: { text: 'Greetings, traveler' } },
            ],
            [
              { name: '{{user1}}', content: { text: 'What do you do?' } },
              { name: '{{char}}', content: { text: 'I guard the realm' } },
            ],
          ],
        },
      })

      const response = await exportHandler(createRequest(), createParams('123'))
      const data = await response.json()

      // Should be converted to Eliza format (arrays of conversations)
      expect(data.messageExamples).toBeDefined()
      expect(data.messageExamples.length).toBe(2) // 2 conversations

      // First conversation
      expect(data.messageExamples[0][0].user).toBe('{{user1}}')
      expect(data.messageExamples[0][0].content.text).toBe('Hello there')
      expect(data.messageExamples[0][1].user).toBe('{{char}}')
      expect(data.messageExamples[0][1].content.text).toBe('Greetings, traveler')
    })

    it('should export knowledge documents with path and content', async () => {
      mockGetRecordByExternalId.mockResolvedValueOnce({
        id: 'record-123',
        character: {
          name: 'Test',
          bio: ['Bio'],
          knowledge: [
            { id: 'doc-1', path: 'lore.txt', content: 'Some lore content' },
            { id: 'doc-2', path: 'rules.md', content: 'Game rules here' },
          ],
        },
      })

      const response = await exportHandler(createRequest(), createParams('123'))
      const data = await response.json()

      expect(data.knowledge).toBeDefined()
      expect(data.knowledge.length).toBe(2)
      expect(data.knowledge[0].path).toBe('lore.txt')
      expect(data.knowledge[0].content).toBe('Some lore content')
    })
  })

  describe('error handling', () => {
    it('should return 400 if tokenId is missing', async () => {
      const response = await exportHandler(createRequest(), createParams(''))

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Token ID is required')
    })

    it('should return 404 if character not found', async () => {
      mockGetRecordByExternalId.mockResolvedValueOnce(null)

      const response = await exportHandler(createRequest(), createParams('nonexistent'))

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Character not found')
    })

    it('should return 500 on internal error', async () => {
      mockGetRecordByExternalId.mockRejectedValueOnce(new Error('Database error'))

      const response = await exportHandler(createRequest(), createParams('123'))

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to export character')
    })
  })
})

describe('Import API Route', () => {
  const originalMode = elizaConfig.mode

  beforeEach(() => {
    jest.clearAllMocks()
    elizaConfig.mode = 'legacy'
    mockIsAdmin.mockReturnValue(false)
    ;(getSession as jest.Mock).mockResolvedValue({ address: '0xOwner' })
    ;(getCharacter as jest.Mock).mockResolvedValue({
      token_id: 123,
      name: 'Ash',
      owner_address: '0xowner',
      staker_address: null,
    })
  })

  afterAll(() => {
    elizaConfig.mode = originalMode
  })

  const createRequest = (body: unknown) => {
    return new NextRequest('http://localhost/api/eliza/characters/123/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  const createParams = (tokenId: string) => ({
    params: Promise.resolve({ tokenId }),
  })

  describe('successful import', () => {
    it('should import valid character data', async () => {
      mockGetRecordByExternalId.mockResolvedValueOnce({
        id: 'record-123',
        character: { existingKey: 'keep-me' },
      })
      mockReplaceRecord.mockResolvedValueOnce({})

      const importData = {
        name: 'Imported Character',
        bio: ['A mysterious figure'],
        lore: ['From ancient times'],
        topics: ['mystery', 'magic'],
        adjectives: ['mysterious', 'powerful'],
        style: { all: ['Speak cryptically'], chat: [], post: [] },
        postExamples: ['The shadows whisper...'],
      }

      const response = await importHandler(createRequest(importData), createParams('123'))

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.imported).toContain('bio')
      expect(data.imported).toContain('lore')
      expect(data.imported).toContain('topics')
      expect(data.imported).toContain('adjectives')
      expect(data.imported).toContain('style')
      expect(data.imported).toContain('postExamples')

      expect(mockReplaceRecord).toHaveBeenCalledTimes(1)
      expect(mockReplaceRecord).toHaveBeenCalledWith(
        'record-123',
        expect.objectContaining({
          character: expect.objectContaining({
            existingKey: 'keep-me',
            bio: ['A mysterious figure'],
            lore: ['From ancient times'],
            topics: ['mystery', 'magic'],
            adjectives: ['mysterious', 'powerful'],
            postExamples: ['The shadows whisper...'],
          }),
        })
      )
    })

    it('should allow a current staker to import character data', async () => {
      ;(getSession as jest.Mock).mockResolvedValueOnce({ address: '0xStaker' })
      ;(getCharacter as jest.Mock).mockResolvedValueOnce({
        token_id: 123,
        owner_address: '0xowner',
        staker_address: '0xstaker',
      })
      mockGetRecordByExternalId.mockResolvedValueOnce({
        id: 'record-123',
        character: { existingKey: 'keep-me' },
      })
      mockReplaceRecord.mockResolvedValueOnce({})

      const response = await importHandler(
        createRequest({ name: 'Imported Character', bio: ['Staker bio'] }),
        createParams('123')
      )

      expect(response.status).toBe(200)
      expect(mockReplaceRecord).toHaveBeenCalledWith(
        'record-123',
        expect.objectContaining({
          character: expect.objectContaining({ bio: ['Staker bio'] }),
        })
      )
    })

    it('should allow admins to import character data without owner/staker match', async () => {
      mockIsAdmin.mockReturnValueOnce(true)
      ;(getSession as jest.Mock).mockResolvedValueOnce({ address: '0xAdmin' })
      ;(getCharacter as jest.Mock).mockResolvedValueOnce({
        token_id: 123,
        owner_address: '0xowner',
        staker_address: '0xstaker',
      })
      mockGetRecordByExternalId.mockResolvedValueOnce({
        id: 'record-123',
        character: { existingKey: 'keep-me' },
      })
      mockReplaceRecord.mockResolvedValueOnce({})

      const response = await importHandler(
        createRequest({ name: 'Imported Character', bio: ['Admin bio'] }),
        createParams('123')
      )

      expect(response.status).toBe(200)
      expect(mockReplaceRecord).toHaveBeenCalledWith(
        'record-123',
        expect.objectContaining({
          character: expect.objectContaining({ bio: ['Admin bio'] }),
        })
      )
    })

    it('dual-writes imported persona to official mode without changing import response', async () => {
      elizaConfig.mode = 'dual'

      const updatedRecord = {
        id: 'legacy-record-123',
        character: { existingKey: 'keep-me', bio: ['Imported bio'] },
      }
      mockGetRecordByExternalId.mockResolvedValueOnce({
        id: 'legacy-record-123',
        character: { existingKey: 'keep-me' },
      })
      mockReplaceRecord.mockResolvedValueOnce(updatedRecord)
      ;(syncOfficialPersonaShadow as jest.Mock).mockResolvedValueOnce({ attempted: true, ok: true })

      const response = await importHandler(
        createRequest({ name: 'Imported Character', bio: ['Imported bio'], lore: [] }),
        createParams('123')
      )

      expect(response.status).toBe(200)
      expect(syncOfficialPersonaShadow).toHaveBeenCalledWith({
        tokenId: '123',
        legacyCharacterId: 'legacy-record-123',
        character: updatedRecord.character,
      })
      expect(recordPersonaMigrationSuccess).not.toHaveBeenCalled()
    })

    it('should convert Eliza message format to SDK format', async () => {
      mockGetRecordByExternalId.mockResolvedValueOnce({
        id: 'record-123',
        character: {},
      })
      mockReplaceRecord.mockResolvedValueOnce({})

      const importData = {
        bio: ['Bio'],
        messageExamples: [
          [
            { user: '{{user1}}', content: { text: 'Hello' } },
            { user: '{{char}}', content: { text: 'Hi there' } },
          ],
        ],
      }

      const response = await importHandler(createRequest(importData), createParams('123'))

      expect(response.status).toBe(200)
      expect(mockReplaceRecord).toHaveBeenCalledTimes(1)

      const replaceArgs = mockReplaceRecord.mock.calls[0]
      expect(replaceArgs[0]).toBe('record-123')

      const updatedCharacter = (replaceArgs[1] as any).character
      expect(updatedCharacter).toBeDefined()
      expect(updatedCharacter.messageExamples).toBeDefined()
      expect(Array.isArray(updatedCharacter.messageExamples)).toBe(true)

      // Ensure conversion preserved the message contents in canonical structure
      expect(updatedCharacter.messageExamples[0][0].content.text).toBe('Hello')
      expect(updatedCharacter.messageExamples[0][1].content.text).toBe('Hi there')
    })

    it('should skip knowledge with warning', async () => {
      mockGetRecordByExternalId.mockResolvedValueOnce({
        id: 'record-123',
        character: {},
      })
      mockReplaceRecord.mockResolvedValueOnce({})

      const importData = {
        bio: ['Bio'],
        knowledge: [{ id: 'doc-1', path: 'file.txt', content: 'Content' }],
      }

      const response = await importHandler(createRequest(importData), createParams('123'))

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.skipped).toContain('knowledge')
      expect(data.warnings.some((w: string) => w.includes('Knowledge documents'))).toBe(true)
    })

    it('should warn about ignored name', async () => {
      mockGetRecordByExternalId.mockResolvedValueOnce({
        id: 'record-123',
        character: {},
      })
      mockReplaceRecord.mockResolvedValueOnce({})

      const importData = {
        name: 'Different Name',
        bio: ['Bio'],
      }

      const response = await importHandler(createRequest(importData), createParams('123'))

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.warnings.some((w: string) => w.includes('name'))).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should return 400 if tokenId is missing', async () => {
      const response = await importHandler(createRequest({}), createParams(''))

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Token ID is required')
    })

    it.each(['123abc', '00123', '1e3'])(
      'should return 400 for non-canonical token id %s before authorization',
      async (tokenId) => {
        const response = await importHandler(createRequest({ bio: ['Bio'] }), createParams(tokenId))

        expect(response.status).toBe(400)
        expect(getSession).not.toHaveBeenCalled()
        expect(getCharacter).not.toHaveBeenCalled()
        expect(mockReplaceRecord).not.toHaveBeenCalled()
      }
    )

    it('should return 401 when importing without a wallet session', async () => {
      ;(getSession as jest.Mock).mockResolvedValueOnce({})

      const response = await importHandler(createRequest({ bio: ['Bio'] }), createParams('123'))

      expect(response.status).toBe(401)
      expect(getCharacter).not.toHaveBeenCalled()
      expect(mockReplaceRecord).not.toHaveBeenCalled()
    })

    it('should return 403 when importing as a non-owner, non-staker wallet', async () => {
      ;(getSession as jest.Mock).mockResolvedValueOnce({ address: '0xIntruder' })
      ;(getCharacter as jest.Mock).mockResolvedValueOnce({
        token_id: 123,
        owner_address: '0xowner',
        staker_address: '0xstaker',
      })

      const response = await importHandler(createRequest({ bio: ['Bio'] }), createParams('123'))

      expect(response.status).toBe(403)
      expect(mockReplaceRecord).not.toHaveBeenCalled()
    })

    it('should return 404 when importing for an unknown WAGDIE character', async () => {
      ;(getCharacter as jest.Mock).mockResolvedValueOnce(null)

      const response = await importHandler(createRequest({ bio: ['Bio'] }), createParams('123'))

      expect(response.status).toBe(404)
      expect(mockReplaceRecord).not.toHaveBeenCalled()
    })

    it('should return 400 for invalid JSON body', async () => {
      const request = new NextRequest('http://localhost/api/eliza/characters/123/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json{',
      })

      const response = await importHandler(request, createParams('123'))

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid JSON in request body')
    })

    it('should return 500 on update failure', async () => {
      mockGetRecordByExternalId.mockResolvedValueOnce({
        id: 'record-123',
        character: {},
      })
      mockReplaceRecord.mockRejectedValueOnce(new Error('Update failed'))

      const response = await importHandler(createRequest({ bio: ['Bio'] }), createParams('123'))

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to import character')
    })
  })

  describe('selective import', () => {
    it('should only import provided fields', async () => {
      mockGetRecordByExternalId.mockResolvedValueOnce({
        id: 'record-123',
        character: { existingKey: 'keep-me' },
      })
      mockReplaceRecord.mockResolvedValueOnce({})

      const importData = {
        bio: ['New bio'],
        topics: ['topic1', 'topic2'],
        // No lore, adjectives, style, etc.
      }

      const response = await importHandler(createRequest(importData), createParams('123'))

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.imported).toContain('bio')
      expect(data.imported).toContain('topics')
      expect(data.imported).not.toContain('lore')
      expect(data.imported).not.toContain('adjectives')

      expect(mockReplaceRecord).toHaveBeenCalledWith(
        'record-123',
        expect.objectContaining({
          character: expect.objectContaining({
            existingKey: 'keep-me',
            bio: ['New bio'],
            topics: ['topic1', 'topic2'],
          }),
        })
      )
    })

    it('should skip empty arrays', async () => {
      mockGetRecordByExternalId.mockResolvedValueOnce({
        id: 'record-123',
        character: {},
      })
      mockReplaceRecord.mockResolvedValueOnce({})

      const importData = {
        bio: ['Bio'],
        lore: [], // Empty
        topics: [], // Empty
      }

      const response = await importHandler(createRequest(importData), createParams('123'))

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.imported).toContain('bio')
      expect(data.imported).not.toContain('lore')
      expect(data.imported).not.toContain('topics')
    })
  })
})
