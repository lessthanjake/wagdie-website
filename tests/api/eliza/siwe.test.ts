/**
 * @jest-environment node
 */

import { createSIWEMessage } from '@/lib/eliza/siwe'

describe('app-owned Eliza SIWE helper', () => {
  it('builds the exact EIP-4361 message format used by the former SDK helper', () => {
    const message = createSIWEMessage({
      domain: 'wagdie.example',
      address: '0x1234567890abcdef1234567890ABCDEF12345678',
      statement: 'Sign in to Eliza AI',
      uri: 'https://wagdie.example',
      chainId: 1,
      nonce: 'nonce-123',
      issuedAt: '2026-05-10T12:00:00.000Z',
    })

    expect(message).toBe(
      [
        'wagdie.example wants you to sign in with your Ethereum account:',
        '0x1234567890abcdef1234567890ABCDEF12345678',
        '',
        'Sign in to Eliza AI',
        '',
        'URI: https://wagdie.example',
        'Version: 1',
        'Chain ID: 1',
        'Nonce: nonce-123',
        'Issued At: 2026-05-10T12:00:00.000Z',
      ].join('\n')
    )
  })

  it('includes optional SIWE fields in the same order', () => {
    const message = createSIWEMessage({
      domain: 'wagdie.example',
      address: '0x1234567890abcdef1234567890ABCDEF12345678',
      uri: 'https://wagdie.example',
      chainId: 1,
      nonce: 'nonce-123',
      issuedAt: '2026-05-10T12:00:00.000Z',
      expirationTime: '2026-05-10T12:05:00.000Z',
      notBefore: '2026-05-10T11:59:00.000Z',
      requestId: 'request-1',
      resources: ['urn:wagdie:eliza'],
    })

    expect(message).toContain('Expiration Time: 2026-05-10T12:05:00.000Z')
    expect(message).toContain('Not Before: 2026-05-10T11:59:00.000Z')
    expect(message).toContain('Request ID: request-1')
    expect(message).toContain(['Resources:', '- urn:wagdie:eliza'].join('\n'))
  })

  it('rejects invalid Ethereum addresses before creating a signable message', () => {
    expect(() =>
      createSIWEMessage({
        domain: 'wagdie.example',
        address: 'not-an-address',
        uri: 'https://wagdie.example',
        chainId: 1,
        nonce: 'nonce-123',
      })
    ).toThrow('Invalid Ethereum address format')
  })
})
