import { randomUUID } from 'crypto'
import { createOfficialWalletUserId } from '@/lib/eliza/official/ids'

const DEFAULT_APP_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000
const MIN_APP_TOKEN_TTL_MS = 5 * 60 * 1000

export function createWagdieElizaAppAccessToken(): string {
  return `wagdie_eliza_${randomUUID()}`
}

export function getOfficialElizaUserIdForWallet(address: string): string {
  return createOfficialWalletUserId(address)
}

export function getOfficialElizaAppTokenExpiresAt(sessionExpires?: number): number | null {
  const fallback = Date.now() + DEFAULT_APP_TOKEN_TTL_MS

  if (typeof sessionExpires !== 'number' || !Number.isFinite(sessionExpires)) {
    return fallback
  }

  const expiresAtMs = sessionExpires < 4102444800 ? sessionExpires * 1000 : sessionExpires

  if (expiresAtMs <= Date.now() + MIN_APP_TOKEN_TTL_MS) {
    return null
  }

  return expiresAtMs
}
