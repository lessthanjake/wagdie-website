/**
 * App-owned SIWE message construction for Eliza auth.
 *
 * This preserves the previous EIP-4361 message formatting so WAGDIE routes
 * no longer depend on external SDK helper behavior.
 */

export interface SIWEMessageParams {
  domain: string
  address: string
  statement?: string
  uri: string
  chainId: number
  nonce: string
  issuedAt?: string
  expirationTime?: string
  notBefore?: string
  requestId?: string
  resources?: string[]
}

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/
const SIWE_VERSION_LINE = 'Version: 1'

function assertRequired(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

export function createSIWEMessage(params: SIWEMessageParams): string {
  const {
    domain,
    address,
    statement,
    uri,
    chainId,
    nonce,
    issuedAt = new Date().toISOString(),
    expirationTime,
    notBefore,
    requestId,
    resources,
  } = params

  assertRequired(domain, 'domain is required')
  assertRequired(address, 'address is required')
  assertRequired(uri, 'uri is required')
  assertRequired(chainId, 'chainId is required')
  assertRequired(nonce, 'nonce is required')

  if (!ETH_ADDRESS_REGEX.test(address)) {
    throw new Error('Invalid Ethereum address format')
  }

  const lines = [`${domain} wants you to sign in with your Ethereum account:`, address, '']

  if (statement) {
    lines.push(statement, '')
  }

  lines.push(`URI: ${uri}`)
  lines.push(SIWE_VERSION_LINE)
  lines.push(`Chain ID: ${chainId}`)
  lines.push(`Nonce: ${nonce}`)
  lines.push(`Issued At: ${issuedAt}`)

  if (expirationTime) {
    lines.push(`Expiration Time: ${expirationTime}`)
  }

  if (notBefore) {
    lines.push(`Not Before: ${notBefore}`)
  }

  if (requestId) {
    lines.push(`Request ID: ${requestId}`)
  }

  if (resources && resources.length > 0) {
    lines.push('Resources:')
    for (const resource of resources) {
      lines.push(`- ${resource}`)
    }
  }

  return lines.join('\n')
}
