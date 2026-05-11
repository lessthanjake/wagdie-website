/**
 * App-owned gateway errors for custom Eliza API and Venice inference calls.
 */

export type WagdieElizaErrorCode =
  | 'API_ERROR'
  | 'AUTH_ERROR'
  | 'NETWORK_ERROR'
  | 'RATE_LIMIT'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'

export interface WagdieElizaErrorOptions {
  code?: WagdieElizaErrorCode
  statusCode?: number
  isRetryable?: boolean
  details?: Record<string, unknown>
  cause?: unknown
}

export class WagdieElizaError extends Error {
  readonly code: WagdieElizaErrorCode
  readonly statusCode: number
  readonly isRetryable: boolean
  readonly details?: Record<string, unknown>

  constructor(message: string, options: WagdieElizaErrorOptions = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined)
    this.name = this.constructor.name
    this.code = options.code ?? 'API_ERROR'
    this.statusCode = options.statusCode ?? 500
    this.isRetryable = options.isRetryable ?? false
    this.details = options.details
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      statusCode: this.statusCode,
      message: this.message,
      isRetryable: this.isRetryable,
      ...(this.details ? { details: this.details } : {}),
    }
  }
}

/**
 * Backwards-compatible app-owned alias for older route/type imports.
 */
export class ElizaError extends WagdieElizaError {}

export class WagdieElizaAuthError extends WagdieElizaError {
  constructor(message = 'Authentication failed', details?: Record<string, unknown>) {
    super(message, { code: 'AUTH_ERROR', statusCode: 401, details })
  }
}

export class WagdieElizaRateLimitError extends WagdieElizaError {
  constructor(message = 'Rate limit exceeded', details?: Record<string, unknown>) {
    super(message, { code: 'RATE_LIMIT', statusCode: 429, isRetryable: true, details })
  }
}

export class WagdieElizaNetworkError extends WagdieElizaError {
  constructor(message = 'Network request failed', details?: Record<string, unknown>, cause?: unknown) {
    super(message, { code: 'NETWORK_ERROR', statusCode: 0, isRetryable: true, details, cause })
  }
}

export class WagdieElizaValidationError extends WagdieElizaError {
  constructor(message = 'Validation failed', details?: Record<string, unknown>) {
    super(message, { code: 'VALIDATION_ERROR', statusCode: 400, details })
  }
}

export function isWagdieElizaError(error: unknown): error is WagdieElizaError {
  if (error instanceof WagdieElizaError) {
    return true
  }

  if (!error || typeof error !== 'object') {
    return false
  }

  const candidate = error as Record<string, unknown>
  return (
    typeof candidate.message === 'string' &&
    typeof candidate.code === 'string' &&
    typeof candidate.statusCode === 'number'
  )
}

export function isElizaError(error: unknown): error is WagdieElizaError {
  return isWagdieElizaError(error)
}

export function getGatewayErrorCode(statusCode: number): WagdieElizaErrorCode {
  if (statusCode === 400 || statusCode === 422) return 'VALIDATION_ERROR'
  if (statusCode === 401 || statusCode === 403) return 'AUTH_ERROR'
  if (statusCode === 404) return 'NOT_FOUND'
  if (statusCode === 429) return 'RATE_LIMIT'
  return 'API_ERROR'
}

export function isRetryableGatewayStatus(statusCode: number): boolean {
  return statusCode === 408 || statusCode === 429 || statusCode >= 500
}

export function normalizeGatewayError(
  error: unknown,
  fallbackMessage = 'Eliza gateway request failed'
): WagdieElizaError {
  if (isWagdieElizaError(error)) {
    return error
  }

  if (error instanceof Error) {
    return new WagdieElizaNetworkError(error.message || fallbackMessage, undefined, error)
  }

  return new WagdieElizaError(fallbackMessage, {
    code: 'API_ERROR',
    statusCode: 500,
    details: { originalError: error },
  })
}
