import 'dotenv/config'

import { access, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

type CharacterMetadata = Record<string, unknown>

type CharacterRow = {
  token_id: number
  metadata?: CharacterMetadata | null
  image_url?: string | null
  infection_status?: string | null
  infected?: boolean | null
}

type DownloadResult = {
  sourceUrl: string | null
  downloaded: boolean
  skipped: boolean
  error: string | null
}

type ManifestEntry = {
  token_id: number
  metadata_file: string
  image_file: string
  image_exists: boolean
  image_downloaded: boolean
  image_source_url: string | null
  image_error: string | null
}

type Summary = {
  generated_at: string
  table: string
  total_rows: number
  metadata_written: number
  images_already_present: number
  images_downloaded: number
  images_refreshed: number
  images_failed: number
  output: {
    metadata_dir: string
    image_dir: string
    manifest_path: string
    status_module_path: string
  }
}

const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://dweb.link/ipfs/',
] as const

const RETIRED_IPFS_GATEWAY_HOSTS = new Set(['cloudflare-ipfs.com'])

const tableName =
  process.env.CHARACTERS_TABLE ||
  process.env.NEXT_PUBLIC_CHARACTERS_TABLE ||
  'wagdie_characters'

const imageDir =
  process.env.LOCAL_IMAGE_DIR || path.join(process.cwd(), 'public/images/characters')
const metadataDir =
  process.env.LOCAL_METADATA_DIR || path.join(process.cwd(), 'public/metadata/characters')
const manifestPath =
  process.env.LOCAL_ASSET_MANIFEST || path.join(metadataDir, 'manifest.json')
const statusModulePath = path.join(
  process.cwd(),
  'lib/data/local-character-asset-status.ts'
)
const openseaChain = process.env.OPENSEA_CHAIN || 'ethereum'
const openseaContractAddress =
  process.env.WAGDIE_ADDRESS ||
  process.env.NEXT_PUBLIC_WAGDIE_ADDRESS ||
  '0x659a4bdaaacc62d2bd9cb18225d9c89b5b697a5a'
const pageSize = Number(process.env.LOCAL_ASSET_PAGE_SIZE || 500)
const concurrency = Number(process.env.LOCAL_ASSET_CONCURRENCY || 4)
const downloadMissingImages = !['0', 'false', 'no', 'off'].includes(
  (process.env.LOCAL_ASSET_DOWNLOAD_MISSING || 'true').toLowerCase()
)

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SERVICE_ROLE_KEY

if (!supabaseUrl) throw new Error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)')
if (!serviceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

let hasImageUrlColumn = true
const openSeaCandidateCache = new Map<number, Promise<string[]>>()

function getIpfsPath(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('ipfs://')) {
    return trimmed.slice('ipfs://'.length).replace(/^\/+/, '')
  }

  try {
    const url = new URL(trimmed)
    const marker = '/ipfs/'
    const markerIndex = url.pathname.indexOf(marker)
    if (markerIndex >= 0) {
      return decodeURIComponent(
        url.pathname.slice(markerIndex + marker.length).replace(/^\/+/, '')
      )
    }
  } catch {
    // Ignore parsing failures for non-URL inputs.
  }

  return null
}

function isIpfsLikeUrl(value: string | undefined | null): boolean {
  return typeof value === 'string' && Boolean(getIpfsPath(value))
}

function shouldIncludeOriginalIpfsGatewayUrl(value: string): boolean {
  try {
    return !RETIRED_IPFS_GATEWAY_HOSTS.has(new URL(value).hostname)
  } catch {
    return false
  }
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    if (!value || seen.has(value)) continue
    seen.add(value)
    result.push(value)
  }

  return result
}

function normalizeUrlCandidates(value: string | undefined | null): string[] {
  if (!value) return []
  const trimmed = value.trim()
  if (!trimmed) return []

  const ipfsPath = getIpfsPath(trimmed)
  if (!ipfsPath) {
    return [trimmed]
  }

  const gatewayUrls = IPFS_GATEWAYS.map((gateway) => `${gateway}${ipfsPath}`)
  return dedupe([
    ...(trimmed.startsWith('http') && shouldIncludeOriginalIpfsGatewayUrl(trimmed)
      ? [trimmed]
      : []),
    ...gatewayUrls,
  ])
}

function isCurrentlyInfected(row: CharacterRow): boolean {
  if (row.infection_status != null) {
    return row.infection_status === 'infected'
  }

  return row.infected === true
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function getNestedString(
  value: CharacterMetadata | null | undefined,
  pathParts: string[]
): string | null {
  let current: unknown = value

  for (const part of pathParts) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return null
    }
    current = (current as Record<string, unknown>)[part]
  }

  return stringOrNull(current)
}

function isSeared(row: CharacterRow): boolean {
  const metadata = row.metadata || null
  return (
    metadata?.isSeared === true ||
    Boolean(stringOrNull(metadata?.searImage)) ||
    Boolean(getNestedString(metadata, ['searing_materialization', 'seared_image_url']))
  )
}

function shouldRefreshCurrentImage(row: CharacterRow): boolean {
  return isCurrentlyInfected(row) || isSeared(row)
}

function getImageCandidates(row: CharacterRow): string[] {
  const metadata = row.metadata || null
  const infectedCandidates = isCurrentlyInfected(row)
    ? dedupe([
        ...normalizeUrlCandidates(stringOrNull(metadata?.infectedImage)),
        ...normalizeUrlCandidates(stringOrNull(metadata?.infected_image_url)),
        ...normalizeUrlCandidates(getNestedString(metadata, ['infection', 'image_url'])),
        ...normalizeUrlCandidates(getNestedString(metadata, ['infection', 'image'])),
      ])
    : []

  const imageUrlCandidates = normalizeUrlCandidates(row.image_url || null)
  const imageUrlIsIpfsLike = isIpfsLikeUrl(row.image_url || null)

  return dedupe([
    ...infectedCandidates,
    ...normalizeUrlCandidates(stringOrNull(metadata?.searImage)),
    ...normalizeUrlCandidates(
      getNestedString(metadata, ['searing_materialization', 'seared_image_url'])
    ),
    ...(imageUrlIsIpfsLike ? [] : imageUrlCandidates),
    ...(imageUrlIsIpfsLike ? imageUrlCandidates : []),
    ...normalizeUrlCandidates(stringOrNull(metadata?.image)),
    ...normalizeUrlCandidates(stringOrNull(metadata?.image_url)),
  ])
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function fetchImage(url: string): Promise<Buffer> {
  const headers: Record<string, string> = {
    'user-agent': 'Mozilla/5.0',
  }

  if (/\.seadn\.io$/i.test(new URL(url).hostname)) {
    headers.referer = 'https://opensea.io/'
  }

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.startsWith('image/')) {
    throw new Error(`Unexpected content-type: ${contentType || 'unknown'}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

async function getOpenSeaCachedImageCandidates(tokenId: number): Promise<string[]> {
  const cached = openSeaCandidateCache.get(tokenId)
  if (cached) {
    return cached
  }

  const promise = (async () => {
    const assetUrl = `https://opensea.io/item/${openseaChain}/${openseaContractAddress}/${tokenId}`

    try {
      const response = await fetch(assetUrl, {
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
        signal: AbortSignal.timeout(20_000),
      })

      if (!response.ok) {
        return []
      }

      const html = await response.text()
      const matches = html.match(
        /"image":"(https:\/\/(?:i2c|i2|raw2?)\.seadn\.io[^"]+)"/g
      )

      if (!matches || matches.length === 0) {
        return []
      }

      return dedupe(
        matches.map((match) =>
          match
            .replace(/^"image":"/, '')
            .replace(/"$/, '')
            .replace(/\\u002F/g, '/')
            .replace(/\\\//g, '/')
        )
      )
    } catch {
      return []
    }
  })()

  openSeaCandidateCache.set(tokenId, promise)
  return promise
}

async function downloadImage(
  tokenId: number,
  candidates: string[],
  destinationPath: string
): Promise<DownloadResult> {
  if (!downloadMissingImages) {
    return {
      sourceUrl: null,
      downloaded: false,
      skipped: true,
      error: null,
    }
  }

  let lastError: string | null = null
  const attemptedCandidates = new Set<string>()

  for (const candidate of candidates) {
    attemptedCandidates.add(candidate)
    try {
      const bytes = await fetchImage(candidate)
      await writeFile(destinationPath, bytes)
      return {
        sourceUrl: candidate,
        downloaded: true,
        skipped: false,
        error: null,
      }
    } catch (error) {
      lastError = `${candidate} :: ${error instanceof Error ? error.message : String(error)}`
    }
  }

  const openSeaCandidates = await getOpenSeaCachedImageCandidates(tokenId)
  for (const candidate of openSeaCandidates) {
    if (attemptedCandidates.has(candidate)) {
      continue
    }

    try {
      const bytes = await fetchImage(candidate)
      await writeFile(destinationPath, bytes)
      return {
        sourceUrl: candidate,
        downloaded: true,
        skipped: false,
        error: null,
      }
    } catch (error) {
      lastError = `${candidate} :: ${error instanceof Error ? error.message : String(error)}`
    }
  }

  return {
    sourceUrl: null,
    downloaded: false,
    skipped: false,
    error: lastError || 'No usable image candidates',
  }
}

async function loadRows(): Promise<CharacterRow[]> {
  const rows: CharacterRow[] = []
  let from = 0

  while (true) {
    const selectColumns = hasImageUrlColumn
      ? 'token_id, metadata, image_url, infection_status, infected'
      : 'token_id, metadata, infection_status, infected'

    const { data, error } = await supabase
      .from(tableName)
      .select(selectColumns)
      .order('token_id', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) {
      if (hasImageUrlColumn && error.message.includes('image_url')) {
        hasImageUrlColumn = false
        continue
      }

      throw new Error(`Failed to load ${tableName}: ${error.message}`)
    }

    const page = (data || []) as unknown as CharacterRow[]
    if (page.length === 0) {
      break
    }

    rows.push(...page)
    from += page.length

    if (page.length < pageSize) {
      break
    }
  }

  return rows
}

async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let index = 0

  async function run(): Promise<void> {
    while (true) {
      const current = index
      index += 1
      if (current >= items.length) return
      await worker(items[current])
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, limit) }, () => run()))
}

function renderStatusModule(missingTokenIds: number[]): string {
  const values = missingTokenIds.join(', ')

  return `export const MISSING_LOCAL_CHARACTER_IMAGE_TOKEN_IDS = [${values}] as const

const MISSING_LOCAL_CHARACTER_IMAGE_TOKEN_ID_SET = new Set<number>(MISSING_LOCAL_CHARACTER_IMAGE_TOKEN_IDS)

export function hasLocalCharacterImage(tokenId: number): boolean {
  if (!Number.isInteger(tokenId) || tokenId < 1 || tokenId > 6666) {
    return false
  }

  return !MISSING_LOCAL_CHARACTER_IMAGE_TOKEN_ID_SET.has(tokenId)
}
`
}

async function main(): Promise<void> {
  await mkdir(imageDir, { recursive: true })
  await mkdir(metadataDir, { recursive: true })
  await mkdir(path.dirname(statusModulePath), { recursive: true })

  const rows = await loadRows()
  const manifest: ManifestEntry[] = []

  const summary: Summary = {
    generated_at: new Date().toISOString(),
    table: tableName,
    total_rows: rows.length,
    metadata_written: 0,
    images_already_present: 0,
    images_downloaded: 0,
    images_refreshed: 0,
    images_failed: 0,
    output: {
      metadata_dir: metadataDir,
      image_dir: imageDir,
      manifest_path: manifestPath,
      status_module_path: statusModulePath,
    },
  }

  await mapWithConcurrency(rows, concurrency, async (row) => {
    const metadataFile = path.join(metadataDir, `${row.token_id}.json`)
    const imageFile = path.join(imageDir, `${row.token_id}.png`)
    const refreshCurrentImage = shouldRefreshCurrentImage(row)
    const hadLocalImage = await exists(imageFile)

    await writeFile(metadataFile, JSON.stringify(row.metadata || {}, null, 2))
    summary.metadata_written += 1

    if (hadLocalImage && !refreshCurrentImage) {
      summary.images_already_present += 1
      manifest.push({
        token_id: row.token_id,
        metadata_file: path.relative(process.cwd(), metadataFile),
        image_file: path.relative(process.cwd(), imageFile),
        image_exists: true,
        image_downloaded: false,
        image_source_url: null,
        image_error: null,
      })
      return
    }

    const result = await downloadImage(row.token_id, getImageCandidates(row), imageFile)

    if (result.downloaded) {
      summary.images_downloaded += 1
      if (hadLocalImage) {
        summary.images_refreshed += 1
      }
    } else if (!result.skipped) {
      summary.images_failed += 1
    }

    const hasUsableLocalImage = result.downloaded || (hadLocalImage && !refreshCurrentImage)

    manifest.push({
      token_id: row.token_id,
      metadata_file: path.relative(process.cwd(), metadataFile),
      image_file: path.relative(process.cwd(), imageFile),
      image_exists: hasUsableLocalImage,
      image_downloaded: result.downloaded,
      image_source_url: result.sourceUrl,
      image_error: result.error,
    })
  })

  manifest.sort((left, right) => left.token_id - right.token_id)

  const missingTokenIds = manifest
    .filter((entry) => !entry.image_exists)
    .map((entry) => entry.token_id)

  await writeFile(
    manifestPath,
    JSON.stringify({ summary, items: manifest }, null, 2)
  )
  await writeFile(statusModulePath, renderStatusModule(missingTokenIds))

  console.log(JSON.stringify({
    ...summary,
    missing_local_images: missingTokenIds.length,
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
