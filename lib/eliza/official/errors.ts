import { ApiError } from '@elizaos/api-client'
import {
  WagdieElizaError,
  getGatewayErrorCode,
  isRetryableGatewayStatus,
  type WagdieElizaErrorCode,
} from '@/lib/eliza/gateway/errors'

export function unsupportedOfficialFeature(
  feature: string,
  details?: Record<string, unknown>
): WagdieElizaError {
  return new WagdieElizaError(`${feature} is not supported by the official ElizaOS adapter yet`, {
    code: 'VALIDATION_ERROR',
    statusCode: 501,
    details: {
      adapter: 'official-elizaos',
      ...details,
    },
  })
}

export function normalizeOfficialElizaError(
  error: unknown,
  fallbackMessage = 'Official ElizaOS request failed'
): WagdieElizaError {
  if (error instanceof WagdieElizaError) {
    return error
  }

  if (error instanceof ApiError) {
    const statusCode = error.status ?? 500
    const code: WagdieElizaErrorCode =
      error.code === 'TIMEOUT'
        ? 'NETWORK_ERROR'
        : error.code === 'NETWORK_ERROR'
          ? 'NETWORK_ERROR'
          : getGatewayErrorCode(statusCode)

    return new WagdieElizaError(fallbackMessage, {
      code,
      statusCode,
      isRetryable: isRetryableGatewayStatus(statusCode),
      details: {
        officialCode: error.code,
        statusCode,
      },
      cause: error,
    })
  }

  if (error instanceof Error) {
    return new WagdieElizaError(fallbackMessage, {
      code: 'NETWORK_ERROR',
      statusCode: 0,
      isRetryable: true,
      cause: error,
    })
  }

  return new WagdieElizaError(fallbackMessage, {
    code: 'API_ERROR',
    statusCode: 500,
    details: { originalError: error },
  })
}
