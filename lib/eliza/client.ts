/**
 * Eliza gateway client singleton.
 *
 * Runtime implementation is selected server-side:
 * - legacy/dual: app-owned raw HTTP for the custom ELIZA_API_URL contract and
 *   Venice for chat inference.
 * - official: WAGDIE-hosted official ElizaOS service adapter.
 */

import { elizaConfig } from './config'
import { createWagdieElizaHttpClient } from './gateway/client'
import { createOfficialWagdieElizaClient } from './official/client'
import type { WagdieElizaClient, WagdieElizaClientConfig } from './gateway/types'

let serverClient: WagdieElizaClient | null = null

function buildClientConfig(auth: { apiKey?: string; accessToken?: string }): WagdieElizaClientConfig {
  return {
    baseUrl: elizaConfig.baseUrl,
    apiKey: auth.apiKey,
    accessToken: auth.accessToken,
    timeout: elizaConfig.timeout,
    retry: elizaConfig.retry,
    inference: {
      baseUrl: elizaConfig.inference.baseUrl,
      apiKey: elizaConfig.inference.apiKey,
      model: elizaConfig.inference.model,
      temperature: elizaConfig.inference.temperature,
      maxTokens: elizaConfig.inference.maxTokens,
    },
  }
}

function buildOfficialClientConfig(auth: {
  apiKey?: string
  accessToken?: string
  officialUserId?: string
  walletAddress?: string
}): WagdieElizaClientConfig {
  return {
    baseUrl: elizaConfig.official.baseUrl,
    apiKey: auth.apiKey,
    accessToken: auth.accessToken,
    officialUserId: auth.officialUserId,
    walletAddress: auth.walletAddress,
    timeout: elizaConfig.timeout,
    retry: elizaConfig.retry,
  }
}

export function createOfficialServerClient(): WagdieElizaClient {
  return createOfficialWagdieElizaClient(
    buildOfficialClientConfig({ apiKey: elizaConfig.official.apiKey })
  )
}

function createServerClient(): WagdieElizaClient {
  if (elizaConfig.mode === 'official') {
    return createOfficialServerClient()
  }

  return createWagdieElizaHttpClient(buildClientConfig({ apiKey: elizaConfig.apiKey }))
}

/**
 * Get the server-side Eliza gateway singleton.
 * Uses API-key authentication for custom Eliza server-to-server calls.
 */
export function getElizaClient(): WagdieElizaClient {
  if (typeof window !== 'undefined') {
    throw new Error('getElizaClient should only be called on the server side')
  }

  if (!serverClient) {
    serverClient = createServerClient()
  }

  return serverClient
}

/**
 * Create a gateway client with user-scoped Eliza authentication.
 * Used for conversation APIs that are scoped by user access token in legacy mode.
 * In official mode, accessToken is only the WAGDIE app authorization gate; pass
 * officialUserId when a route needs the hosted ElizaOS service to create sessions.
 */
export function createUserClient(
  accessTokenOrAuth: string | { accessToken: string; officialUserId?: string; walletAddress?: string }
): WagdieElizaClient {
  const auth =
    typeof accessTokenOrAuth === 'string'
      ? { accessToken: accessTokenOrAuth }
      : accessTokenOrAuth

  if (elizaConfig.mode === 'official') {
    return createOfficialWagdieElizaClient(
      buildOfficialClientConfig({
        apiKey: elizaConfig.official.apiKey,
        accessToken: auth.accessToken,
        officialUserId: auth.officialUserId,
        walletAddress: auth.walletAddress,
      })
    )
  }

  return createWagdieElizaHttpClient(buildClientConfig({ accessToken: auth.accessToken }))
}

/**
 * Reset the server client (useful for testing).
 */
export function resetElizaClient(): void {
  serverClient = null
}
