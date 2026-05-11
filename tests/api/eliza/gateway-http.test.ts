/**
 * @jest-environment node
 */

import { GatewayHttpClient, buildGatewayUrl, normalizeGatewayBaseUrl } from '@/lib/eliza/gateway/http'
import { WagdieElizaError } from '@/lib/eliza/gateway/errors'

describe('Eliza gateway HTTP foundation', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('normalizes base URLs and joins request paths', () => {
    expect(normalizeGatewayBaseUrl(' https://eliza.example/// ')).toBe('https://eliza.example')
    expect(buildGatewayUrl('https://eliza.example/', '/auth/nonce')).toBe(
      'https://eliza.example/auth/nonce'
    )
    expect(() => buildGatewayUrl('https://eliza.example', 'https://other.example/path')).toThrow(
      'Eliza gateway request paths must be relative'
    )
  })

  it('sends JSON requests with bearer auth and parses JSON responses', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    const client = new GatewayHttpClient({
      baseUrl: 'https://eliza.example/',
      apiKey: 'server-key',
      fetchImpl: fetchMock as typeof fetch,
    })

    const result = await client.post<{ ok: boolean }>('/characters', { externalId: '1' })

    expect(result).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://eliza.example/characters',
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
        body: JSON.stringify({ externalId: '1' }),
      })
    )

    const headers = fetchMock.mock.calls[0][1].headers as Headers
    expect(headers.get('authorization')).toBe('Bearer server-key')
    expect(headers.get('content-type')).toBe('application/json')
  })

  it('normalizes upstream JSON failures into app-owned gateway errors', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Too many requests' } }), {
        status: 429,
        headers: { 'content-type': 'application/json' },
      })
    )

    const client = new GatewayHttpClient({
      baseUrl: 'https://eliza.example',
      accessToken: 'user-token',
      fetchImpl: fetchMock as typeof fetch,
      retry: { maxRetries: 0, baseDelay: 0, retryServerErrors: true },
    })

    await expect(client.get('/conversations')).rejects.toMatchObject({
      code: 'RATE_LIMIT',
      statusCode: 429,
      isRetryable: true,
      message: 'Too many requests',
    } satisfies Partial<WagdieElizaError>)
  })
})
