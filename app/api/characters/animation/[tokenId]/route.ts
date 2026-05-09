import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextRequest } from 'next/server'
import { parseTokenIdParam } from '@/lib/api/params'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const METADATA_DIR = path.join(process.cwd(), 'public/metadata/characters')
const HTML_CACHE_CONTROL = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

type CharacterAnimationMetadata = {
  name?: unknown
  description?: unknown
  image?: unknown
  attributes?: unknown
}

function htmlHeaders(headers?: HeadersInit): Headers {
  const nextHeaders = new Headers(headers)

  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    nextHeaders.set(key, value)
  }

  return nextHeaders
}

function isFileNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeAssetUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) {
    return null
  }

  if (value.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${value.slice('ipfs://'.length)}`
  }

  return value
}

function getAttributeValue(metadata: CharacterAnimationMetadata, traitType: string): string | null {
  if (!Array.isArray(metadata.attributes)) {
    return null
  }

  const attribute = metadata.attributes.find((candidate) => {
    return typeof candidate === 'object' &&
      candidate !== null &&
      'trait_type' in candidate &&
      candidate.trait_type === traitType
  })

  if (!attribute || typeof attribute !== 'object' || !('value' in attribute)) {
    return null
  }

  return String(attribute.value)
}

function renderAnimationHtml(tokenId: number, metadata: CharacterAnimationMetadata): string {
  const name = escapeHtml(metadata.name || `WAGDIE #${tokenId}`)
  const description = escapeHtml(metadata.description || 'We are All Going to Die')
  const imageUrl = normalizeAssetUrl(metadata.image)
  const imageMarkup = imageUrl
    ? `<img class="character-image" src="${escapeHtml(imageUrl)}" alt="${name}" />`
    : '<div class="image-placeholder">WAGDIE</div>'
  const traits = ['Origin', 'Class', 'Alignment', 'Health']
    .map((trait) => [trait, getAttributeValue(metadata, trait)] as const)
    .filter(([, value]) => value)
    .map(([trait, value]) => `
      <div class="trait">
        <span>${escapeHtml(trait)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>`)
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${name}</title>
  <style>
    html, body {
      margin: 0;
      min-height: 100%;
      background: #050304;
      color: #e7dcc8;
      font-family: Georgia, 'Times New Roman', serif;
    }

    body {
      display: grid;
      place-items: center;
      padding: 24px;
      box-sizing: border-box;
    }

    .card {
      width: min(760px, 100%);
      border: 1px solid rgba(185, 142, 80, 0.38);
      background: radial-gradient(circle at top, rgba(139, 38, 53, 0.24), rgba(5, 3, 4, 0.96) 46%);
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.65);
      padding: 28px;
      text-align: center;
    }

    .eyebrow {
      margin: 0 0 10px;
      color: #b98e50;
      font-size: 12px;
      letter-spacing: 0.34em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0 0 22px;
      font-size: clamp(30px, 7vw, 60px);
      line-height: 0.95;
    }

    .character-image,
    .image-placeholder {
      display: block;
      width: min(420px, 100%);
      aspect-ratio: 1;
      margin: 0 auto 24px;
      object-fit: cover;
      border: 1px solid rgba(231, 220, 200, 0.18);
      background: #000;
    }

    .image-placeholder {
      display: grid;
      place-items: center;
      color: #b98e50;
      letter-spacing: 0.2em;
    }

    .description {
      margin: 0 auto 24px;
      max-width: 60ch;
      color: rgba(231, 220, 200, 0.74);
      line-height: 1.55;
      white-space: pre-wrap;
    }

    .traits {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 10px;
    }

    .trait {
      border: 1px solid rgba(231, 220, 200, 0.14);
      background: rgba(0, 0, 0, 0.28);
      padding: 12px;
    }

    .trait span,
    .trait strong {
      display: block;
    }

    .trait span {
      margin-bottom: 4px;
      color: #b98e50;
      font-size: 11px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <main class="card">
    <p class="eyebrow">We Are All Going To Die</p>
    <h1>${name}</h1>
    ${imageMarkup}
    <p class="description">${description}</p>
    ${traits ? `<section class="traits" aria-label="Character traits">${traits}</section>` : ''}
  </main>
</body>
</html>`
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: htmlHeaders(),
  })
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ tokenId: string }> }
) {
  const params = await context.params
  const tokenId = parseTokenIdParam(params.tokenId, { min: 1 })

  if (tokenId === null) {
    return new Response('Invalid token ID', {
      status: 400,
      headers: htmlHeaders({
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      }),
    })
  }

  try {
    const metadataPath = path.join(METADATA_DIR, `${tokenId}.json`)
    const metadataRaw = await readFile(metadataPath, 'utf8')
    const metadata = JSON.parse(metadataRaw) as CharacterAnimationMetadata

    return new Response(renderAnimationHtml(tokenId, metadata), {
      status: 200,
      headers: htmlHeaders({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': HTML_CACHE_CONTROL,
      }),
    })
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return new Response('Metadata not found', {
        status: 404,
        headers: htmlHeaders({
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
        }),
      })
    }

    console.error('Failed to render character animation metadata:', error)
    return new Response('Failed to load metadata', {
      status: 500,
      headers: htmlHeaders({
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      }),
    })
  }
}
