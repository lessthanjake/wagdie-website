import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Client as PgClient } from 'pg'
import { randomUUID } from 'crypto'

type ValidationResult = {
  name: string
  ok: boolean
  detail?: string
  skipped?: boolean
}

type TableSpec = {
  name: string
  trigger: string
  requiredColumns: string[]
  insertRow: (runId: string, tokenId: string) => Record<string, unknown>
  updatePatch: Record<string, unknown>
  deleteFilters: Array<[string, string]>
}

type Config = {
  databaseUrl: string
  supabaseUrl: string
  serviceRoleKey: string
  anonKey: string
  authenticatedJwt?: string
  tokenId: string
  runId: string
  failOnSkipped: boolean
  targetEnv: string
  expectedSupabaseRef?: string
}

const PRODUCTION_TARGET_ENVS = new Set(['prod', 'production', 'live'])
const KNOWN_NON_PRODUCTION_TARGET_ENVS = new Set([
  'dev',
  'development',
  'staging',
  'stage',
  'preview',
  'local',
  'test',
])

const TABLES: TableSpec[] = [
  {
    name: 'eliza_persona_migration_links',
    trigger: 'update_eliza_persona_migration_links_updated_at',
    requiredColumns: [
      'token_id',
      'legacy_character_id',
      'official_agent_id',
      'status',
      'last_error',
      'last_synced_at',
      'created_at',
      'updated_at',
    ],
    insertRow: (runId, tokenId) => ({
      token_id: tokenId,
      legacy_character_id: `smoke-legacy-${runId}`,
      official_agent_id: `smoke-agent-${runId}`,
      status: 'pending',
    }),
    updatePatch: { status: 'synced', last_error: null },
    deleteFilters: [
      ['token_id', '$tokenId'],
      ['legacy_character_id', '$legacyCharacterId'],
      ['official_agent_id', '$officialAgentId'],
    ],
  },
  {
    name: 'eliza_knowledge_sync_states',
    trigger: 'update_eliza_knowledge_sync_states_updated_at',
    requiredColumns: [
      'token_id',
      'document_id',
      'official_agent_id',
      'official_memory_id',
      'content_hash',
      'source_pointer',
      'status',
      'last_error',
      'last_synced_at',
      'deleted_at',
      'created_at',
      'updated_at',
    ],
    insertRow: (runId, tokenId) => ({
      token_id: tokenId,
      document_id: `smoke-doc-${runId}`,
      official_agent_id: `smoke-agent-${runId}`,
      official_memory_id: `smoke-memory-${runId}`,
      content_hash: `smoke-hash-${runId}`,
      source_pointer: { source: 'elizaos-db-validation', runId },
      status: 'pending',
    }),
    updatePatch: { status: 'indexed', last_error: null },
    deleteFilters: [
      ['token_id', '$tokenId'],
      ['document_id', '$documentId'],
    ],
  },
  {
    name: 'eliza_official_conversation_links',
    trigger: 'update_eliza_official_conversation_links_updated_at',
    requiredColumns: [
      'id',
      'wallet_address',
      'official_user_id',
      'token_id',
      'official_agent_id',
      'official_session_id',
      'status',
      'message_count',
      'last_message_at',
      'last_error',
      'deleted_at',
      'created_at',
      'updated_at',
    ],
    insertRow: (runId, tokenId) => ({
      id: randomUUID(),
      wallet_address: '0x0000000000000000000000000000000000000000',
      official_user_id: `smoke-user-${runId}`,
      token_id: tokenId,
      official_agent_id: `smoke-agent-${runId}`,
      official_session_id: `smoke-session-${runId}`,
      status: 'active',
      message_count: 0,
    }),
    updatePatch: { message_count: 1, status: 'active' },
    deleteFilters: [['official_session_id', '$officialSessionId']],
  },
]

function usage(): string {
  return `ElizaOS migration table validation\n\nUsage:\n  bun run elizaos:db:validate\n\nRequired env vars:\n  ELIZA_DB_VALIDATION_TARGET_ENV or WAGDIE_SUPABASE_TARGET_ENV\n      Explicit target label. Use dev/development for the dev WAGDIE Supabase target.\n      production/prod/live are rejected unless ELIZA_DB_VALIDATION_ALLOW_PRODUCTION=true.\n  SUPABASE_DB_URL or DATABASE_URL or POSTGRES_URL\n      Direct Postgres connection for schema/RLS/trigger validation.\n  SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL\n      Supabase REST URL for role behavior checks.\n  SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY or SERVICE_ROLE_KEY\n      Service-role key used to prove server read/write access.\n  SUPABASE_ANON_KEY or ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY\n      Anon key used to prove public clients cannot read/write migration tables.\n\nOptional env vars:\n  ELIZA_DB_VALIDATION_EXPECT_SUPABASE_REF or WAGDIE_DEV_SUPABASE_PROJECT_REF\n      Expected dev Supabase project ref; when set, both SUPABASE_URL and the DB URL must contain it.\n  ELIZA_DB_VALIDATION_ALLOW_UNKNOWN_TARGET=true\n      Permit a non-production target label not listed by the script.\n  ELIZA_DB_VALIDATION_ALLOW_UNVERIFIED_TARGET=true\n      Permit a remote non-production target without an expected Supabase project-ref guard.\n      Use only while ops has not named the dev project ref.\n  ELIZA_DB_VALIDATION_ALLOW_PRODUCTION=true\n      Explicit override for approved production validation only; do not use for dev work.\n  SUPABASE_AUTHENTICATED_JWT\n      Real authenticated user JWT for REST-level authenticated denial probe.\n      Without it, SQL privilege checks still verify the authenticated database role.\n  ELIZA_DB_VALIDATION_TOKEN_ID\n      Disposable token id for writes; must be 0-6666. Default: 6666.\n  ELIZA_DB_VALIDATION_RUN_ID\n      Stable run id for repeatable cleanup. Default: random UUID.\n  ELIZA_DB_VALIDATION_FAIL_ON_SKIPPED=true\n      Treat optional skipped checks as failures.\n  PGSSLMODE=disable\n      Disable TLS for local Postgres. TLS is enabled by default.\n`
}

function requireEnv(names: string[]): string {
  for (const name of names) {
    const value = process.env[name]
    if (value?.trim()) return value.trim()
  }

  throw new Error(`Missing required env var. Set one of: ${names.join(', ')}. Run with --help for details.`)
}

function getOptionalEnv(names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]
    if (value?.trim()) return value.trim()
  }
  return undefined
}

function normalizeTargetEnv(value: string): string {
  return value.trim().toLowerCase()
}

function isLocalValidationUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase()
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === 'db' ||
      hostname === 'kong' ||
      hostname.endsWith('.local')
    )
  } catch {
    return false
  }
}

function assertSafeMigrationTarget(config: Config): void {
  const targetEnv = normalizeTargetEnv(config.targetEnv)
  const hasExpectedRefGuard = Boolean(config.expectedSupabaseRef)
  const appearsRemote =
    !isLocalValidationUrl(config.supabaseUrl) || !isLocalValidationUrl(config.databaseUrl)

  if (PRODUCTION_TARGET_ENVS.has(targetEnv) && process.env.ELIZA_DB_VALIDATION_ALLOW_PRODUCTION !== 'true') {
    throw new Error(
      `Refusing to validate production-like Supabase target "${config.targetEnv}". ` +
        'Use the dev WAGDIE Supabase target for this run, or set ELIZA_DB_VALIDATION_ALLOW_PRODUCTION=true only after promotion approval.'
    )
  }

  if (
    !PRODUCTION_TARGET_ENVS.has(targetEnv) &&
    !KNOWN_NON_PRODUCTION_TARGET_ENVS.has(targetEnv) &&
    process.env.ELIZA_DB_VALIDATION_ALLOW_UNKNOWN_TARGET !== 'true'
  ) {
    throw new Error(
      `Unknown Supabase target env "${config.targetEnv}". ` +
        `Use one of ${Array.from(KNOWN_NON_PRODUCTION_TARGET_ENVS).join(', ')} or set ELIZA_DB_VALIDATION_ALLOW_UNKNOWN_TARGET=true.`
    )
  }

  if (
    appearsRemote &&
    !hasExpectedRefGuard &&
    process.env.ELIZA_DB_VALIDATION_ALLOW_UNVERIFIED_TARGET !== 'true'
  ) {
    throw new Error(
      'Remote Supabase validation targets require ELIZA_DB_VALIDATION_EXPECT_SUPABASE_REF or WAGDIE_DEV_SUPABASE_PROJECT_REF. ' +
        'If ops has not named the dev project ref yet, set ELIZA_DB_VALIDATION_ALLOW_UNVERIFIED_TARGET=true intentionally.'
    )
  }

  if (config.expectedSupabaseRef) {
    const expected = config.expectedSupabaseRef.toLowerCase()
    const supabaseUrl = config.supabaseUrl.toLowerCase()
    const databaseUrl = config.databaseUrl.toLowerCase()

    if (!supabaseUrl.includes(expected) || !databaseUrl.includes(expected)) {
      throw new Error(
        `Supabase target ref guard failed for "${config.expectedSupabaseRef}". ` +
          'Both SUPABASE_URL and SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL must point at the named dev project.'
      )
    }
  }
}

function getConfig(): Config {
  const tokenId = process.env.ELIZA_DB_VALIDATION_TOKEN_ID || '6666'
  const tokenNumber = Number(tokenId)

  if (!Number.isInteger(tokenNumber) || tokenNumber < 0 || tokenNumber > 6666) {
    throw new Error('ELIZA_DB_VALIDATION_TOKEN_ID must be an integer between 0 and 6666')
  }

  const config = {
    databaseUrl: requireEnv(['SUPABASE_DB_URL', 'DATABASE_URL', 'POSTGRES_URL']),
    supabaseUrl: requireEnv(['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']),
    serviceRoleKey: requireEnv(['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY', 'SERVICE_ROLE_KEY']),
    anonKey: requireEnv(['SUPABASE_ANON_KEY', 'ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']),
    authenticatedJwt: getOptionalEnv(['SUPABASE_AUTHENTICATED_JWT']),
    tokenId,
    runId: process.env.ELIZA_DB_VALIDATION_RUN_ID || randomUUID(),
    failOnSkipped: process.env.ELIZA_DB_VALIDATION_FAIL_ON_SKIPPED === 'true',
    targetEnv: requireEnv(['ELIZA_DB_VALIDATION_TARGET_ENV', 'WAGDIE_SUPABASE_TARGET_ENV']),
    expectedSupabaseRef: getOptionalEnv([
      'ELIZA_DB_VALIDATION_EXPECT_SUPABASE_REF',
      'WAGDIE_DEV_SUPABASE_PROJECT_REF',
    ]),
  }

  assertSafeMigrationTarget(config)

  return config
}

function pass(name: string, detail?: string): ValidationResult {
  return { name, ok: true, detail }
}

function fail(name: string, detail: string): ValidationResult {
  return { name, ok: false, detail }
}

function skip(name: string, detail: string): ValidationResult {
  return { name, ok: true, skipped: true, detail }
}

function pgClient(config: Config): PgClient {
  return new PgClient({
    connectionString: config.databaseUrl,
    ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
  })
}

async function validateSchema(client: PgClient, table: TableSpec): Promise<ValidationResult[]> {
  const results: ValidationResult[] = []
  const tableResult = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS exists`,
    [table.name]
  )

  if (!tableResult.rows[0]?.exists) {
    return [fail(`${table.name} exists`, 'table is missing from public schema')]
  }

  results.push(pass(`${table.name} exists`))

  const columns = await client.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [table.name]
  )
  const actualColumns = new Set(columns.rows.map((row) => row.column_name))
  const missingColumns = table.requiredColumns.filter((column) => !actualColumns.has(column))
  results.push(
    missingColumns.length === 0
      ? pass(`${table.name} required columns exist`)
      : fail(`${table.name} required columns exist`, `missing columns: ${missingColumns.join(', ')}`)
  )

  const rls = await client.query<{ relrowsecurity: boolean }>(
    `SELECT c.relrowsecurity
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = $1`,
    [table.name]
  )
  results.push(
    rls.rows[0]?.relrowsecurity
      ? pass(`${table.name} RLS enabled`)
      : fail(`${table.name} RLS enabled`, 'row level security is not enabled')
  )

  const trigger = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT 1
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_proc p ON p.oid = t.tgfoid
      WHERE n.nspname = 'public'
        AND c.relname = $1
        AND t.tgname = $2
        AND p.proname = 'update_updated_at_column'
        AND NOT t.tgisinternal
    ) AS exists`,
    [table.name, table.trigger]
  )
  results.push(
    trigger.rows[0]?.exists
      ? pass(`${table.name} updated_at trigger exists`)
      : fail(`${table.name} updated_at trigger exists`, `missing trigger ${table.trigger}`)
  )

  const privileges = await client.query<{
    anon_select: boolean
    anon_insert: boolean
    anon_update: boolean
    anon_delete: boolean
    authenticated_select: boolean
    authenticated_insert: boolean
    authenticated_update: boolean
    authenticated_delete: boolean
  }>(
    `SELECT
      has_table_privilege('anon', $1, 'SELECT') AS anon_select,
      has_table_privilege('anon', $1, 'INSERT') AS anon_insert,
      has_table_privilege('anon', $1, 'UPDATE') AS anon_update,
      has_table_privilege('anon', $1, 'DELETE') AS anon_delete,
      has_table_privilege('authenticated', $1, 'SELECT') AS authenticated_select,
      has_table_privilege('authenticated', $1, 'INSERT') AS authenticated_insert,
      has_table_privilege('authenticated', $1, 'UPDATE') AS authenticated_update,
      has_table_privilege('authenticated', $1, 'DELETE') AS authenticated_delete`,
    [`public.${table.name}`]
  )
  const granted = Object.entries(privileges.rows[0] ?? {})
    .filter(([, value]) => value)
    .map(([name]) => name)
  results.push(
    granted.length === 0
      ? pass(`${table.name} anon/authenticated table privileges revoked`)
      : fail(`${table.name} anon/authenticated table privileges revoked`, `unexpected grants: ${granted.join(', ')}`)
  )

  return results
}

function serviceClient(config: Config): SupabaseClient {
  return createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function anonClient(config: Config): SupabaseClient {
  return createClient(config.supabaseUrl, config.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function authenticatedClient(config: Config): SupabaseClient | null {
  if (!config.authenticatedJwt) return null
  return createClient(config.supabaseUrl, config.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${config.authenticatedJwt}` } },
  })
}

function applyFilters(query: any, table: TableSpec, row: Record<string, unknown>, tokenId: string) {
  let next = query
  for (const [column, value] of table.deleteFilters) {
    if (value === '$tokenId') {
      next = next.eq(column, tokenId)
    } else if (value === '$documentId') {
      next = next.eq(column, row.document_id)
    } else if (value === '$officialSessionId') {
      next = next.eq(column, row.official_session_id)
    } else if (value === '$legacyCharacterId') {
      next = next.eq(column, row.legacy_character_id)
    } else if (value === '$officialAgentId') {
      next = next.eq(column, row.official_agent_id)
    } else {
      next = next.eq(column, value)
    }
  }
  return next
}

async function cleanupRow(
  client: SupabaseClient,
  table: TableSpec,
  row: Record<string, unknown>,
  tokenId: string
): Promise<void> {
  await applyFilters(client.from(table.name).delete(), table, row, tokenId)
}

async function validateServiceRoleWrite(
  client: SupabaseClient,
  table: TableSpec,
  config: Config
): Promise<ValidationResult[]> {
  const row = table.insertRow(config.runId, config.tokenId)
  await cleanupRow(client, table, row, config.tokenId)

  const insert = await client.from(table.name).insert(row).select('*').single()
  if (insert.error) {
    return [
      fail(
        `${table.name} service-role insert/read`,
        `${insert.error.message}. If this is a primary-key conflict, set ELIZA_DB_VALIDATION_TOKEN_ID to an unused disposable token id.`
      ),
    ]
  }

  try {
    const update = await applyFilters(
      client.from(table.name).update(table.updatePatch),
      table,
      row,
      config.tokenId
    )
      .select('*')
      .single()
    if (update.error) {
      return [
        pass(`${table.name} service-role insert/read`),
        fail(`${table.name} service-role update`, update.error.message),
      ]
    }

    return [
      pass(`${table.name} service-role insert/read`),
      pass(`${table.name} service-role update`),
    ]
  } finally {
    await cleanupRow(client, table, row, config.tokenId)
  }
}

async function expectDenied(
  client: SupabaseClient,
  table: TableSpec,
  config: Config,
  roleName: 'anon' | 'authenticated'
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = []
  const select = await client.from(table.name).select('*').limit(1)
  results.push(
    select.error
      ? pass(`${table.name} ${roleName} read denied`)
      : fail(
          `${table.name} ${roleName} read denied`,
          'select succeeded; migration tables must not be client-readable'
        )
  )

  const row = table.insertRow(`${config.runId}-${roleName}`, config.tokenId)
  const insert = await client.from(table.name).insert(row).select('*')
  results.push(
    insert.error
      ? pass(`${table.name} ${roleName} write denied`)
      : fail(
          `${table.name} ${roleName} write denied`,
          'insert succeeded; migration tables must not be client-writable'
        )
  )

  if (!insert.error) {
    await cleanupRow(serviceClient(config), table, row, config.tokenId)
  }

  return results
}

async function run(): Promise<ValidationResult[]> {
  const config = getConfig()
  const results: ValidationResult[] = [
    pass('Supabase validation target accepted', `target=${config.targetEnv}`),
  ]
  const pg = pgClient(config)

  await pg.connect()
  try {
    const functionResult = await pg.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'update_updated_at_column'
      ) AS exists`
    )
    results.push(
      functionResult.rows[0]?.exists
        ? pass('update_updated_at_column() exists')
        : fail('update_updated_at_column() exists', 'missing public.update_updated_at_column function')
    )

    for (const table of TABLES) {
      results.push(...(await validateSchema(pg, table)))
    }
  } finally {
    await pg.end()
  }

  const service = serviceClient(config)
  const anon = anonClient(config)
  const authenticated = authenticatedClient(config)

  for (const table of TABLES) {
    results.push(...(await validateServiceRoleWrite(service, table, config)))
    results.push(...(await expectDenied(anon, table, config, 'anon')))

    if (authenticated) {
      results.push(...(await expectDenied(authenticated, table, config, 'authenticated')))
    } else {
      results.push(
        skip(
          `${table.name} authenticated REST denial probe`,
          'SUPABASE_AUTHENTICATED_JWT not set; SQL role privilege checks still ran'
        )
      )
    }
  }

  if (config.failOnSkipped && results.some((result) => result.skipped)) {
    results.push(fail('skipped checks policy', 'ELIZA_DB_VALIDATION_FAIL_ON_SKIPPED=true'))
  }

  return results
}

function printResults(results: ValidationResult[]): void {
  for (const result of results) {
    const marker = result.skipped ? '-' : result.ok ? '✓' : '✗'
    console.log(`${marker} ${result.name}`)
    if (result.detail) console.log(`  ${result.detail}`)
  }
}

async function main(): Promise<void> {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(usage())
    return
  }

  const results = await run()
  printResults(results)

  const failed = results.filter((result) => !result.ok)
  if (failed.length > 0) {
    throw new Error(`${failed.length} ElizaOS migration validation check(s) failed`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
