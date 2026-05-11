/**
 * @jest-environment node
 */

describe('Eliza client mode selection', () => {
  const originalMode = process.env.ELIZA_INTEGRATION_MODE
  const originalBaseUrl = process.env.ELIZAOS_BASE_URL

  afterEach(() => {
    jest.resetModules()
    jest.clearAllMocks()

    if (originalMode === undefined) delete process.env.ELIZA_INTEGRATION_MODE
    else process.env.ELIZA_INTEGRATION_MODE = originalMode

    if (originalBaseUrl === undefined) delete process.env.ELIZAOS_BASE_URL
    else process.env.ELIZAOS_BASE_URL = originalBaseUrl
  })

  it('defaults to the legacy gateway client', async () => {
    delete process.env.ELIZA_INTEGRATION_MODE

    const legacyClient = { kind: 'legacy' }
    const officialClient = { kind: 'official' }
    const createWagdieElizaHttpClient = jest.fn(() => legacyClient)
    const createOfficialWagdieElizaClient = jest.fn(() => officialClient)

    jest.doMock('@/lib/eliza/gateway/client', () => ({ createWagdieElizaHttpClient }))
    jest.doMock('@/lib/eliza/official/client', () => ({ createOfficialWagdieElizaClient }))

    const { getElizaClient } = await import('@/lib/eliza/client')

    expect(getElizaClient()).toBe(legacyClient)
    expect(createWagdieElizaHttpClient).toHaveBeenCalledTimes(1)
    expect(createOfficialWagdieElizaClient).not.toHaveBeenCalled()
  })

  it('uses official adapter only in official mode', async () => {
    process.env.ELIZA_INTEGRATION_MODE = 'official'
    process.env.ELIZAOS_BASE_URL = 'http://localhost:3001'

    const legacyClient = { kind: 'legacy' }
    const officialClient = { kind: 'official' }
    const createWagdieElizaHttpClient = jest.fn(() => legacyClient)
    const createOfficialWagdieElizaClient = jest.fn(() => officialClient)

    jest.doMock('@/lib/eliza/gateway/client', () => ({ createWagdieElizaHttpClient }))
    jest.doMock('@/lib/eliza/official/client', () => ({ createOfficialWagdieElizaClient }))

    const { getElizaClient } = await import('@/lib/eliza/client')

    expect(getElizaClient()).toBe(officialClient)
    expect(createOfficialWagdieElizaClient).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: 'http://localhost:3001' })
    )
    expect(createWagdieElizaHttpClient).not.toHaveBeenCalled()
  })

  it('keeps dual mode user-visible behavior on legacy client', async () => {
    process.env.ELIZA_INTEGRATION_MODE = 'dual'

    const legacyClient = { kind: 'legacy' }
    const createWagdieElizaHttpClient = jest.fn(() => legacyClient)
    const createOfficialWagdieElizaClient = jest.fn(() => ({ kind: 'official' }))

    jest.doMock('@/lib/eliza/gateway/client', () => ({ createWagdieElizaHttpClient }))
    jest.doMock('@/lib/eliza/official/client', () => ({ createOfficialWagdieElizaClient }))

    const { createUserClient } = await import('@/lib/eliza/client')

    expect(createUserClient('user-token')).toBe(legacyClient)
    expect(createWagdieElizaHttpClient).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'user-token' })
    )
    expect(createOfficialWagdieElizaClient).not.toHaveBeenCalled()
  })
})
