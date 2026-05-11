/**
 * Minimal app-owned HTTP foundation for the custom Eliza API contract.
 */

import {
  WagdieElizaError,
  WagdieElizaNetworkError,
  getGatewayErrorCode,
  isRetryableGatewayStatus,
} from './errors'

export type GatewayFetch = typeof fetch

export interface GatewayHttpRetryConfig {
  maxRetries: number
  baseDelay: number
  retryServerErrors: boolean
}

export interface GatewayHttpClientOptions {
  baseUrl: string
  apiKey?: string
  accessToken?: string
  timeout?: number
  retry?: GatewayHttpRetryConfig
  fetchImpl?: GatewayFetch
}

export interface GatewayHttpRequestOptions {
  method?: string
  headers?: HeadersInit
  body?: unknown
  signal?: AbortSignal
  auth?: 'default' | 'none'
  skipRetry?: boolean
}

const DEFAULT_RETRY_CONFIG: GatewayHttpRetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  retryServerErrors: true,
}

export function normalizeGatewayBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim()
  if (!trimmed) {
    throw new WagdieElizaError('Eliza gateway baseUrl is required', {
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    })
  }
  return trimmed.replace(/\/+$/, '')
}

export function buildGatewayUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) {
    throw new WagdieElizaError('Eliza gateway request paths must be relative', {
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    })
  }

  const normalizedBaseUrl = normalizeGatewayBaseUrl(baseUrl)
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBaseUrl}${normalizedPath}`
}

function extractMessageFromBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return null
  }

  const record = body as Record<string, unknown>
  if (typeof record.message === 'string') return record.message
  if (typeof record.error === 'string') return record.error

  const error = record.error
  if (error && typeof error === 'object') {
    const errorRecord = error as Record<string, unknown>
    if (typeof errorRecord.message === 'string') return errorRecord.message
  }

  return null
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined
  }

  const text = await response.text()
  if (!text) {
    return undefined
  }

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  return text
}

export async function parseGatewayErrorResponse(response: Response): Promise<WagdieElizaError> {
  const body = await readResponseBody(response)
  const message =
    extractMessageFromBody(body) ||
    (typeof body === 'string' && body.trim() ? body.trim() : null) ||
    `Eliza gateway request failed with ${response.status}`

  return new WagdieElizaError(message, {
    code: getGatewayErrorCode(response.status),
    statusCode: response.status,
    isRetryable: isRetryableGatewayStatus(response.status),
    details: typeof body === 'object' && body ? { body } : undefined,
  })
}

function isJsonBody(body: unknown): boolean {
  return (
    body !== undefined &&
    body !== null &&
    typeof body !== 'string' &&
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer)
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class GatewayHttpClient {
  readonly baseUrl: string
  private readonly apiKey?: string
  private readonly accessToken?: string
  private readonly timeout?: number
  private readonly retry: GatewayHttpRetryConfig
  private readonly fetchImpl: GatewayFetch

  constructor(options: GatewayHttpClientOptions) {
    this.baseUrl = normalizeGatewayBaseUrl(options.baseUrl)
    this.apiKey = options.apiKey
    this.accessToken = options.accessToken
    this.timeout = options.timeout
    this.retry = { ...DEFAULT_RETRY_CONFIG, ...options.retry }
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  private shouldRetry(error: WagdieElizaError, attempt: number): boolean {
    if (attempt >= this.retry.maxRetries) {
      return false
    }

    if (error.statusCode >= 500 && !this.retry.retryServerErrors) {
      return false
    }

    return error.isRetryable
  }

  private retryDelay(attempt: number): number {
    const exponentialDelay = this.retry.baseDelay * Math.pow(2, attempt)
    const jitter = Math.random() * 0.3 * exponentialDelay
    return Math.min(exponentialDelay + jitter, 30000)
  }

  async request<T>(path: string, options: GatewayHttpRequestOptions = {}): Promise<T> {
    const headers = new Headers(options.headers)
    const authToken = this.accessToken || this.apiKey

    if (options.auth !== 'none' && authToken && !headers.has('authorization')) {
      headers.set('Authorization', `Bearer ${authToken}`)
    }

    let body: BodyInit | undefined
    if (isJsonBody(options.body)) {
      if (!headers.has('content-type')) {
        headers.set('Content-Type', 'application/json')
      }
      body = JSON.stringify(options.body)
    } else if (options.body !== undefined && options.body !== null) {
      body = options.body as BodyInit
    }

    const maxAttempts = options.skipRetry ? 1 : this.retry.maxRetries + 1
    let lastError: WagdieElizaError | null = null

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const controller = new AbortController()
      const timeoutId = this.timeout ? setTimeout(() => controller.abort(), this.timeout) : undefined
      const abortFromExternalSignal = () => controller.abort()

      if (options.signal) {
        if (options.signal.aborted) {
          controller.abort()
        } else {
          options.signal.addEventListener('abort', abortFromExternalSignal, { once: true })
        }
      }

      try {
        const response = await this.fetchImpl(buildGatewayUrl(this.baseUrl, path), {
          method: options.method ?? 'GET',
          headers,
          body,
          signal: controller.signal,
        })

        if (!response.ok) {
          throw await parseGatewayErrorResponse(response)
        }

        return (await readResponseBody(response)) as T
      } catch (error) {
        lastError =
          error instanceof WagdieElizaError
            ? error
            : new WagdieElizaNetworkError(
                error instanceof Error ? error.message : 'Eliza gateway network request failed',
                undefined,
                error
              )

        if (!this.shouldRetry(lastError, attempt)) {
          throw lastError
        }

        await sleep(this.retryDelay(attempt))
      } finally {
        options.signal?.removeEventListener('abort', abortFromExternalSignal)
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
      }
    }

    throw lastError ?? new WagdieElizaNetworkError('Eliza gateway network request failed')
  }

  get<T>(path: string, options: Omit<GatewayHttpRequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' })
  }

  post<T>(path: string, body?: unknown, options: Omit<GatewayHttpRequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body })
  }

  put<T>(path: string, body?: unknown, options: Omit<GatewayHttpRequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PUT', body })
  }

  delete<T = void>(path: string, options: Omit<GatewayHttpRequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' })
  }
}
