/**
 * @jest-environment node
 */

import { createWagdieElizaHttpClient } from '@/lib/eliza/gateway/client'

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json', ...(init.headers as Record<string, string> | undefined) },
  })
}

function sseStream(lines: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(line))
      controller.close()
    },
  })
}

describe('WagdieElizaHttpClient', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('uses raw HTTP for auth nonce and verify', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ nonce: 'nonce-1', sessionId: 'session-1' }))
      .mockResolvedValueOnce(jsonResponse({ token: 'access-token', refreshToken: 'refresh-token', expiresIn: 60 }))

    global.fetch = fetchMock as typeof fetch

    const client = createWagdieElizaHttpClient({
      baseUrl: 'https://eliza.example',
      apiKey: 'server-key',
    })

    await expect(client.auth.getNonce()).resolves.toEqual({ nonce: 'nonce-1', sessionId: 'session-1' })
    await expect(client.auth.verify('message', 'signature', 'session-1')).resolves.toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })

    expect(fetchMock.mock.calls[0][0]).toBe('https://eliza.example/auth/nonce')
    expect(fetchMock.mock.calls[1][0]).toBe('https://eliza.example/auth/verify')
    expect(JSON.parse(fetchMock.mock.calls[1][1].body as string)).toEqual({
      message: 'message',
      signature: 'signature',
      sessionId: 'session-1',
    })
  })

  it('rejects malformed auth verify token responses', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse({ expiresIn: 60 }))
    global.fetch = fetchMock as typeof fetch

    const client = createWagdieElizaHttpClient({ baseUrl: 'https://eliza.example', apiKey: 'server-key' })

    await expect(client.auth.verify('message', 'signature', 'session-1')).rejects.toMatchObject({
      code: 'AUTH_ERROR',
      statusCode: 502,
    })
  })

  it('uses raw HTTP for custom character record operations', async () => {
    const record = {
      id: 'record-1',
      externalId: '123',
      character: { name: 'Ash' },
      createdAt: '2026-05-10T00:00:00.000Z',
      updatedAt: '2026-05-10T00:00:00.000Z',
    }

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(record))
      .mockResolvedValueOnce(jsonResponse(record))
      .mockResolvedValueOnce(jsonResponse({ ...record, character: { name: 'Bone' } }))
      .mockResolvedValueOnce(jsonResponse({ message: 'missing' }, { status: 404 }))

    global.fetch = fetchMock as typeof fetch

    const client = createWagdieElizaHttpClient({ baseUrl: 'https://eliza.example', apiKey: 'server-key' })

    await expect(client.characters.getRecordByExternalId('123')).resolves.toEqual(record)
    await expect(client.characters.createRecord({ externalId: '123', character: { name: 'Ash' } })).resolves.toEqual(record)
    await expect(client.characters.replaceRecord('record-1', { character: { name: 'Bone' } })).resolves.toMatchObject({
      character: { name: 'Bone' },
    })
    await expect(client.characters.getRecordByExternalId('missing')).resolves.toBeNull()

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      'https://eliza.example/characters/external/123',
      'https://eliza.example/characters',
      'https://eliza.example/characters/record-1',
      'https://eliza.example/characters/external/missing',
    ])
  })

  it('uses raw HTTP for user-scoped conversation APIs', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({
        conversations: [{ id: 'conv-1', characterId: 'record-1', messageCount: 1, createdAt: '2026-05-10T00:00:00.000Z' }],
        total: 1,
      }))
      .mockResolvedValueOnce(jsonResponse({
        id: 'conv-1',
        characterId: 'record-1',
        messages: [{ id: 'msg-1', role: 'user', content: 'Hi', createdAt: '2026-05-10T00:00:00.000Z' }],
        createdAt: '2026-05-10T00:00:00.000Z',
      }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    global.fetch = fetchMock as typeof fetch

    const client = createWagdieElizaHttpClient({ baseUrl: 'https://eliza.example', accessToken: 'user-token' })

    await expect(client.conversations.listForCharacter('record-1', { page: 2, pageSize: 5 })).resolves.toMatchObject({
      items: [{ id: 'conv-1', characterId: 'record-1', messageCount: 1 }],
      total: 1,
      page: 2,
      pageSize: 5,
    })
    await expect(client.conversations.get('conv-1')).resolves.toMatchObject({
      id: 'conv-1',
      messages: [{ id: 'msg-1', role: 'user', content: 'Hi', createdAt: '2026-05-10T00:00:00.000Z' }],
    })
    await expect(client.conversations.delete('conv-1')).resolves.toBeUndefined()

    const headers = fetchMock.mock.calls[0][1].headers as Headers
    expect(headers.get('authorization')).toBe('Bearer user-token')
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      'https://eliza.example/characters/record-1/conversations?page=2&pageSize=5',
      'https://eliza.example/conversations/conv-1',
      'https://eliza.example/conversations/conv-1',
    ])
  })

  it('uses Venice, not custom Eliza chat, for chat streaming', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      body: sseStream(['data: {"id":"chatcmpl-1","choices":[{"delta":{"content":"Ash"}}]}\n\n', 'data: [DONE]\n\n']),
      headers: new Headers({ 'content-type': 'text/event-stream' }),
    })

    global.fetch = fetchMock as typeof fetch

    const client = createWagdieElizaHttpClient({
      baseUrl: 'https://eliza.example',
      apiKey: 'server-key',
      inference: {
        baseUrl: 'https://api.venice.ai/api/v1',
        apiKey: 'venice-key',
        model: 'venice-model',
      },
    })

    const chunks: string[] = []
    const complete = jest.fn()

    await client.chat.sendMessageStream(
      {
        characterId: 'record-1',
        character: { name: 'Ash', bio: ['A watcher'] },
        message: 'Speak',
        conversationId: 'conv-1',
      },
      { onChunk: (chunk) => chunks.push(chunk), onComplete: complete }
    )

    expect(chunks).toEqual(['Ash'])
    expect(complete).toHaveBeenCalledWith(expect.objectContaining({ content: 'Ash' }), 'conv-1')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.venice.ai/api/v1/chat/completions')
  })
})
