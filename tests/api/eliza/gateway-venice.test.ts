/**
 * @jest-environment node
 */

import { streamOpenAICompatibleChat } from '@/lib/eliza/gateway/venice'

function sseStream(lines: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line))
      }
      controller.close()
    },
  })
}

describe('Venice/OpenAI-compatible gateway streaming', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('emits callback tokens from delta and message content chunks without browser SSE events', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      body: sseStream([
        'data: {"id":"chatcmpl-1","choices":[{"delta":{"content":"Ash"}}]}\n\n',
        'data: {"choices":[{"message":{"content":" falls"}}]}\n\n',
      ]),
      headers: new Headers({ 'content-type': 'text/event-stream' }),
    })
    global.fetch = fetchMock as typeof fetch

    const chunks: string[] = []
    const onComplete = jest.fn()
    const onError = jest.fn()

    await streamOpenAICompatibleChat(
      {
        baseUrl: 'https://api.venice.ai/api/v1/chat/completions',
        apiKey: 'venice-key',
        model: 'venice-model',
        conversationId: 'conv-1',
        messages: [{ role: 'user', content: 'Speak.' }],
      },
      {
        onChunk: (chunk) => chunks.push(chunk),
        onComplete,
        onError,
      }
    )

    expect(chunks).toEqual(['Ash', ' falls'])
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'chatcmpl-1', role: 'assistant', content: 'Ash falls' }),
      'conv-1'
    )
    expect(onError).not.toHaveBeenCalled()
  })

  it('emits onError for provider stream error chunks', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      body: sseStream(['data: {"error":{"message":"model overloaded"}}\n\n']),
      headers: new Headers({ 'content-type': 'text/event-stream' }),
    })
    global.fetch = fetchMock as typeof fetch

    const onComplete = jest.fn()
    const onError = jest.fn()

    await streamOpenAICompatibleChat(
      {
        baseUrl: 'https://api.venice.ai/api/v1',
        apiKey: 'venice-key',
        model: 'venice-model',
        messages: [{ role: 'user', content: 'Speak.' }],
      },
      { onComplete, onError }
    )

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'model overloaded' }))
    expect(onComplete).not.toHaveBeenCalled()
  })
})
