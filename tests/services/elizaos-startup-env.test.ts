/**
 * @jest-environment node
 */

import {
  StartupEnvValidationError,
  isLocalDevelopmentEnvironment,
  validateStartupEnvironment,
} from '../../services/elizaos/src/startup-env'

const REQUIRED_ENV = {
  ELIZA_SERVER_AUTH_TOKEN: 'eliza-token',
  WAGDIE_KNOWLEDGE_INGESTION_TOKEN: 'knowledge-token',
  SERVER_API_KEY: 'socket-token',
  VENICE_API_KEY: 'venice-token',
  DATABASE_URL: 'postgres://user:pass@example.test:5432/elizaos',
}

describe('ElizaOS startup env validation', () => {
  it('fails closed for hosted development when required secrets are missing', () => {
    expect(() => validateStartupEnvironment({ ELIZAOS_ENV: 'development' })).toThrow(
      StartupEnvValidationError
    )

    try {
      validateStartupEnvironment({ ELIZAOS_ENV: 'development' })
    } catch (error) {
      expect(error).toBeInstanceOf(StartupEnvValidationError)
      expect((error as StartupEnvValidationError).issues).toEqual([
        'missing required env vars: ELIZA_SERVER_AUTH_TOKEN, WAGDIE_KNOWLEDGE_INGESTION_TOKEN, SERVER_API_KEY, VENICE_API_KEY',
        'missing required database env var: DATABASE_URL or POSTGRES_URL',
      ])
    }
  })

  it('accepts production when all required service env vars are present', () => {
    const result = validateStartupEnvironment({
      ELIZAOS_ENV: 'production',
      ...REQUIRED_ENV,
    })

    expect(result).toEqual({
      environment: 'production',
      isLocalDevelopment: false,
      warnings: [],
    })
  })

  it('accepts POSTGRES_URL as the deployed database setting', () => {
    const { DATABASE_URL: _databaseUrl, ...envWithoutDatabaseUrl } = REQUIRED_ENV

    expect(() =>
      validateStartupEnvironment({
        ELIZAOS_ENV: 'staging',
        ...envWithoutDatabaseUrl,
        POSTGRES_URL: 'postgres://user:pass@example.test:5432/elizaos',
      })
    ).not.toThrow()
  })

  it('rejects unauthenticated local knowledge ingestion outside local development', () => {
    expect(() =>
      validateStartupEnvironment({
        ELIZAOS_ENV: 'staging',
        ...REQUIRED_ENV,
        WAGDIE_KNOWLEDGE_ALLOW_UNAUTHENTICATED_LOCAL: 'true',
      })
    ).toThrow('WAGDIE_KNOWLEDGE_ALLOW_UNAUTHENTICATED_LOCAL=true is only allowed for local development')
  })

  it('warns instead of throwing for local-only development without optional local secrets', () => {
    const result = validateStartupEnvironment({
      ELIZAOS_ENV: 'local',
      WAGDIE_KNOWLEDGE_ALLOW_UNAUTHENTICATED_LOCAL: 'true',
    })

    expect(result.isLocalDevelopment).toBe(true)
    expect(result.warnings).toEqual([
      'local development startup is missing ELIZA_SERVER_AUTH_TOKEN, WAGDIE_KNOWLEDGE_INGESTION_TOKEN, SERVER_API_KEY, VENICE_API_KEY; protected service paths or provider-backed chat may fail unless intentionally unused',
      'local development startup is missing DATABASE_URL/POSTGRES_URL; using local-only persistence is acceptable only for throwaway development',
      'WAGDIE_KNOWLEDGE_ALLOW_UNAUTHENTICATED_LOCAL=true permits unauthenticated knowledge ingestion only for local development when no ingestion/server token is configured',
    ])
  })

  it('treats explicit deployment markers as non-local even if NODE_ENV is not production', () => {
    expect(isLocalDevelopmentEnvironment({ NODE_ENV: 'development', VERCEL_ENV: 'preview' })).toBe(
      false
    )
  })

  it('treats APP_ENV staging/production markers as non-local', () => {
    expect(isLocalDevelopmentEnvironment({ APP_ENV: 'staging' })).toBe(false)
    expect(() => validateStartupEnvironment({ APP_ENV: 'production' })).toThrow(
      StartupEnvValidationError
    )
  })
})
