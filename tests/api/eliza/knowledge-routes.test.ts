/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { GET as listKnowledge, POST as uploadKnowledge } from '@/app/api/eliza/characters/[tokenId]/knowledge/route'
import { GET as getKnowledge, DELETE as deleteKnowledge } from '@/app/api/eliza/characters/[tokenId]/knowledge/[documentId]/route'
import { getSession } from '@/lib/auth/session'
import { getCharacter } from '@/lib/services/character-service'

const mockGetRecordByExternalId = jest.fn()
const mockReplaceRecord = jest.fn()
const mockIsAdmin = jest.fn()

jest.mock('@/lib/auth/session', () => ({ getSession: jest.fn() }))
jest.mock('@/lib/services/character-service', () => ({ getCharacter: jest.fn() }))
jest.mock('@/lib/auth/admin', () => ({ isAdmin: (address: string) => mockIsAdmin(address) }))
jest.mock('@/lib/eliza/client', () => ({
  getElizaClient: () => ({
    characters: {
      getRecordByExternalId: mockGetRecordByExternalId,
      replaceRecord: mockReplaceRecord,
    },
  }),
}))

function getRequest(url = 'http://localhost/api/eliza/characters/123/knowledge') {
  return new NextRequest(url, { method: 'GET' })
}

function tokenParams(tokenId = '123') {
  return { params: Promise.resolve({ tokenId }) }
}

function docParams(tokenId = '123', documentId = 'doc-1') {
  return { params: Promise.resolve({ tokenId, documentId }) }
}

describe('Eliza knowledge routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsAdmin.mockReturnValue(false)
    ;(getSession as jest.Mock).mockResolvedValue({ address: '0xOwner' })
    ;(getCharacter as jest.Mock).mockResolvedValue({
      token_id: 123,
      owner_address: '0xowner',
      staker_address: null,
    })
  })

  it('lists knowledge documents stored on the character record', async () => {
    mockGetRecordByExternalId.mockResolvedValueOnce({
      id: 'record-123',
      character: {
        name: 'Ash',
        knowledge: [{ id: 'doc-1', path: 'lore.md', content: 'Long lore text' }],
      },
    })

    const response = await listKnowledge(getRequest(), tokenParams())

    expect(response.status).toBe(200)
    expect(mockGetRecordByExternalId).toHaveBeenCalledWith('123')
    const data = await response.json()
    expect(data.documents).toEqual([{ id: 'doc-1', path: 'lore.md', preview: 'Long lore text', size: 14 }])
  })

  it('uploads knowledge by replacing the character record through the gateway', async () => {
    mockGetRecordByExternalId.mockResolvedValueOnce({
      id: 'record-123',
      character: {
        name: 'Ash',
        knowledge: [],
      },
    })
    mockReplaceRecord.mockResolvedValueOnce({})

    const formData = new FormData()
    formData.set('file', new File(['New lore'], 'lore.md', { type: 'text/markdown' }))

    const response = await uploadKnowledge(
      new NextRequest('http://localhost/api/eliza/characters/123/knowledge', { method: 'POST', body: formData }),
      tokenParams()
    )

    expect(response.status).toBe(201)
    expect(mockReplaceRecord).toHaveBeenCalledWith(
      'record-123',
      expect.objectContaining({
        character: expect.objectContaining({
          knowledge: [expect.objectContaining({ path: 'lore.md', content: 'New lore' })],
        }),
      })
    )
  })

  it('rejects knowledge uploads without a wallet session', async () => {
    ;(getSession as jest.Mock).mockResolvedValueOnce({})

    const formData = new FormData()
    formData.set('file', new File(['New lore'], 'lore.md', { type: 'text/markdown' }))

    const response = await uploadKnowledge(
      new NextRequest('http://localhost/api/eliza/characters/123/knowledge', { method: 'POST', body: formData }),
      tokenParams()
    )

    expect(response.status).toBe(401)
    expect(getCharacter).not.toHaveBeenCalled()
    expect(mockReplaceRecord).not.toHaveBeenCalled()
  })

  it('rejects knowledge uploads from non-owner, non-staker wallets', async () => {
    ;(getSession as jest.Mock).mockResolvedValueOnce({ address: '0xIntruder' })
    ;(getCharacter as jest.Mock).mockResolvedValueOnce({
      token_id: 123,
      owner_address: '0xowner',
      staker_address: '0xstaker',
    })

    const formData = new FormData()
    formData.set('file', new File(['New lore'], 'lore.md', { type: 'text/markdown' }))

    const response = await uploadKnowledge(
      new NextRequest('http://localhost/api/eliza/characters/123/knowledge', { method: 'POST', body: formData }),
      tokenParams()
    )

    expect(response.status).toBe(403)
    expect(mockReplaceRecord).not.toHaveBeenCalled()
  })

  it('allows the current staker to upload knowledge', async () => {
    ;(getSession as jest.Mock).mockResolvedValueOnce({ address: '0xStaker' })
    ;(getCharacter as jest.Mock).mockResolvedValueOnce({
      token_id: 123,
      owner_address: '0xowner',
      staker_address: '0xstaker',
    })
    mockGetRecordByExternalId.mockResolvedValueOnce({
      id: 'record-123',
      character: {
        name: 'Ash',
        knowledge: [],
      },
    })
    mockReplaceRecord.mockResolvedValueOnce({})

    const formData = new FormData()
    formData.set('file', new File(['Staker lore'], 'lore.md', { type: 'text/markdown' }))

    const response = await uploadKnowledge(
      new NextRequest('http://localhost/api/eliza/characters/123/knowledge', { method: 'POST', body: formData }),
      tokenParams()
    )

    expect(response.status).toBe(201)
    expect(mockReplaceRecord).toHaveBeenCalledWith(
      'record-123',
      expect.objectContaining({
        character: expect.objectContaining({
          knowledge: [expect.objectContaining({ path: 'lore.md', content: 'Staker lore' })],
        }),
      })
    )
  })

  it('gets and deletes a single knowledge document through character record replacement', async () => {
    const record = {
      id: 'record-123',
      character: {
        name: 'Ash',
        knowledge: [{ id: 'doc-1', path: 'lore.md', content: 'Full lore' }],
      },
    }

    mockGetRecordByExternalId.mockResolvedValueOnce(record)

    const getResponse = await getKnowledge(
      getRequest('http://localhost/api/eliza/characters/123/knowledge/doc-1'),
      docParams()
    )

    expect(getResponse.status).toBe(200)
    await expect(getResponse.json()).resolves.toMatchObject({
      id: 'doc-1',
      filename: 'lore.md',
      content: 'Full lore',
    })

    mockGetRecordByExternalId.mockResolvedValueOnce(record)
    mockReplaceRecord.mockResolvedValueOnce({})

    const deleteResponse = await deleteKnowledge(
      new NextRequest('http://localhost/api/eliza/characters/123/knowledge/doc-1', { method: 'DELETE' }),
      docParams()
    )

    expect(deleteResponse.status).toBe(200)
    expect(mockReplaceRecord).toHaveBeenCalledWith(
      'record-123',
      expect.objectContaining({ character: expect.objectContaining({ knowledge: [] }) })
    )
  })

  it('rejects knowledge deletes without a wallet session', async () => {
    ;(getSession as jest.Mock).mockResolvedValueOnce({})

    const response = await deleteKnowledge(
      new NextRequest('http://localhost/api/eliza/characters/123/knowledge/doc-1', { method: 'DELETE' }),
      docParams()
    )

    expect(response.status).toBe(401)
    expect(getCharacter).not.toHaveBeenCalled()
    expect(mockReplaceRecord).not.toHaveBeenCalled()
  })

  it('rejects knowledge deletes from non-owner, non-staker wallets', async () => {
    ;(getSession as jest.Mock).mockResolvedValueOnce({ address: '0xIntruder' })
    ;(getCharacter as jest.Mock).mockResolvedValueOnce({
      token_id: 123,
      owner_address: '0xowner',
      staker_address: '0xstaker',
    })

    const response = await deleteKnowledge(
      new NextRequest('http://localhost/api/eliza/characters/123/knowledge/doc-1', { method: 'DELETE' }),
      docParams()
    )

    expect(response.status).toBe(403)
    expect(mockReplaceRecord).not.toHaveBeenCalled()
  })

  it('allows the current staker to delete knowledge', async () => {
    ;(getSession as jest.Mock).mockResolvedValueOnce({ address: '0xStaker' })
    ;(getCharacter as jest.Mock).mockResolvedValueOnce({
      token_id: 123,
      owner_address: '0xowner',
      staker_address: '0xstaker',
    })

    mockGetRecordByExternalId.mockResolvedValueOnce({
      id: 'record-123',
      character: {
        name: 'Ash',
        knowledge: [{ id: 'doc-1', path: 'lore.md', content: 'Full lore' }],
      },
    })
    mockReplaceRecord.mockResolvedValueOnce({})

    const response = await deleteKnowledge(
      new NextRequest('http://localhost/api/eliza/characters/123/knowledge/doc-1', { method: 'DELETE' }),
      docParams()
    )

    expect(response.status).toBe(200)
    expect(mockReplaceRecord).toHaveBeenCalledWith(
      'record-123',
      expect.objectContaining({ character: expect.objectContaining({ knowledge: [] }) })
    )
  })

  it('allows admins to delete knowledge without owner/staker match', async () => {
    mockIsAdmin.mockReturnValueOnce(true)
    ;(getSession as jest.Mock).mockResolvedValueOnce({ address: '0xAdmin' })
    ;(getCharacter as jest.Mock).mockResolvedValueOnce({
      token_id: 123,
      owner_address: '0xowner',
      staker_address: '0xstaker',
    })

    mockGetRecordByExternalId.mockResolvedValueOnce({
      id: 'record-123',
      character: {
        name: 'Ash',
        knowledge: [{ id: 'doc-1', path: 'lore.md', content: 'Full lore' }],
      },
    })
    mockReplaceRecord.mockResolvedValueOnce({})

    const response = await deleteKnowledge(
      new NextRequest('http://localhost/api/eliza/characters/123/knowledge/doc-1', { method: 'DELETE' }),
      docParams()
    )

    expect(response.status).toBe(200)
    expect(mockReplaceRecord).toHaveBeenCalledWith(
      'record-123',
      expect.objectContaining({ character: expect.objectContaining({ knowledge: [] }) })
    )
  })
})
