/**
 * Eliza Auth Token Status
 * GET /api/eliza/auth
 *
 * Read-only endpoint that returns the current session token or 401 when missing/expired.
 * Removes insecure use of session.siwe.signature for Eliza auth - forces explicit Eliza SIWE flow.
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { requireWalletSession, requireElizaUserToken } from '@/lib/eliza/sessionAuth'
import type { TokenResponse, ErrorResponse } from '@/types/eliza'

export async function GET(): Promise<NextResponse<TokenResponse | ErrorResponse>> {
  try {
    const session = await getSession()

    const walletResult = requireWalletSession(session)
    if (walletResult instanceof NextResponse) {
      return walletResult
    }

    const tokenResult = requireElizaUserToken(session)
    if (tokenResult instanceof NextResponse) {
      return tokenResult
    }

    return NextResponse.json({
      accessToken: tokenResult.accessToken,
      expiresAt: new Date(tokenResult.expiresAtMs).toISOString(),
    })
  } catch (error) {
    console.error('[Eliza Auth] Token status check failed:', error)

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to check token status' },
      { status: 500 }
    )
  }
}
