import { createHash } from 'crypto';
import { isLocalDevelopmentEnvironment } from './startup-env.js';

type UUID = string;

type RouteRequest = {
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type RouteResponse = {
  status: (code: number) => RouteResponse;
  json: (data: unknown) => RouteResponse;
};

type Memory = {
  id?: UUID;
  entityId: UUID;
  agentId?: UUID;
  roomId: UUID;
  createdAt?: number;
  unique?: boolean;
  content: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

type Runtime = {
  getMemoryById(id: UUID): Promise<Memory | null>;
  updateMemory(memory: Memory): Promise<boolean>;
  createMemory(memory: Memory, tableName: string, unique?: boolean): Promise<UUID>;
  deleteMemory(memoryId: UUID): Promise<void>;
  queueEmbeddingGeneration(memory: Memory, priority?: 'high' | 'normal' | 'low'): Promise<void>;
  ensureConnection(input: {
    entityId: UUID;
    roomId: UUID;
    worldId: UUID;
    worldName?: string;
    userName?: string;
    name?: string;
    source?: string;
    type?: string;
    channelId?: string;
    messageServerId?: UUID;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
};

type PluginRoute = {
  type: 'POST';
  path: string;
  name: string;
  handler: (req: RouteRequest, res: RouteResponse, runtime: Runtime) => Promise<void>;
};

type Plugin = {
  name: string;
  description: string;
  routes: PluginRoute[];
};

interface KnowledgeIndexBody {
  tokenId: string;
  documentId: string;
  officialAgentId: string;
  path: string;
  content: string;
  contentHash: string;
  sourcePointer: {
    tokenId: string;
    documentId: string;
    officialAgentId: string;
    path: string;
    contentHash: string;
    version: string;
  };
}

interface KnowledgeDeleteBody {
  tokenId: string;
  documentId: string;
  officialAgentId?: string | null;
  officialMemoryId?: string | null;
  contentHash?: string | null;
}

function json(res: RouteResponse, status: number, body: unknown): void {
  res.status(status).json(body);
}

function getHeader(req: RouteRequest, name: string): string | undefined {
  const wanted = name.toLowerCase();
  const entry = Object.entries(req.headers ?? {}).find(([key]) => key.toLowerCase() === wanted);
  const value = entry?.[1];

  if (Array.isArray(value)) {
    return value[0];
  }

  return typeof value === 'string' ? value : undefined;
}

function configuredIngestionToken(): string | undefined {
  return process.env.WAGDIE_KNOWLEDGE_INGESTION_TOKEN || process.env.ELIZA_SERVER_AUTH_TOKEN;
}

function isAuthorized(req: RouteRequest): boolean {
  const expected = configuredIngestionToken();

  if (!expected) {
    return (
      isLocalDevelopmentEnvironment() &&
      process.env.WAGDIE_KNOWLEDGE_ALLOW_UNAUTHENTICATED_LOCAL === 'true'
    );
  }

  const apiKey = getHeader(req, 'x-api-key');
  const authorization = getHeader(req, 'authorization');
  const bearer = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : undefined;

  return apiKey === expected || bearer === expected;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function parseIndexBody(body: unknown): KnowledgeIndexBody | null {
  if (!isRecord(body)) {
    return null;
  }

  const sourcePointer = body.sourcePointer;

  if (
    typeof body.tokenId !== 'string' ||
    typeof body.documentId !== 'string' ||
    typeof body.officialAgentId !== 'string' ||
    typeof body.path !== 'string' ||
    typeof body.content !== 'string' ||
    typeof body.contentHash !== 'string' ||
    !isRecord(sourcePointer) ||
    typeof sourcePointer.version !== 'string'
  ) {
    return null;
  }

  return {
    tokenId: body.tokenId,
    documentId: body.documentId,
    officialAgentId: body.officialAgentId,
    path: body.path,
    content: body.content,
    contentHash: body.contentHash,
    sourcePointer: {
      tokenId: String(sourcePointer.tokenId ?? body.tokenId),
      documentId: String(sourcePointer.documentId ?? body.documentId),
      officialAgentId: String(sourcePointer.officialAgentId ?? body.officialAgentId),
      path: String(sourcePointer.path ?? body.path),
      contentHash: String(sourcePointer.contentHash ?? body.contentHash),
      version: sourcePointer.version,
    },
  };
}

function parseDeleteBody(body: unknown): KnowledgeDeleteBody | null {
  if (!isRecord(body) || typeof body.tokenId !== 'string' || typeof body.documentId !== 'string') {
    return null;
  }

  return {
    tokenId: body.tokenId,
    documentId: body.documentId,
    officialAgentId: typeof body.officialAgentId === 'string' ? body.officialAgentId : null,
    officialMemoryId: typeof body.officialMemoryId === 'string' ? body.officialMemoryId : null,
    contentHash: typeof body.contentHash === 'string' ? body.contentHash : null,
  };
}

function uuidFromString(value: string): UUID {
  const hex = createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 32);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    `${((Number.parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${hex.slice(18, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}

function memoryIdFor(input: { officialAgentId: string; tokenId: string; documentId: string }): UUID {
  return uuidFromString(
    `wagdie-knowledge-memory:${input.officialAgentId}:${input.tokenId}:${input.documentId}`
  );
}

function toMemory(input: KnowledgeIndexBody, memoryId: UUID): Memory {
  const agentId = input.officialAgentId as UUID;
  const now = Date.now();

  return {
    id: memoryId,
    entityId: agentId,
    agentId,
    roomId: agentId,
    createdAt: now,
    unique: true,
    content: {
      text: input.content,
      source: 'wagdie',
      metadata: {
        filename: input.path,
        tokenId: input.tokenId,
        documentId: input.documentId,
        contentHash: input.contentHash,
      },
    },
    metadata: {
      type: 'document',
      source: 'wagdie',
      sourceId: memoryId,
      scope: 'shared',
      timestamp: now,
      tags: ['wagdie', 'knowledge', `token:${input.tokenId}`, `document:${input.documentId}`],
      wagdie: input.sourcePointer,
    },
  };
}

async function ensureKnowledgeMemoryContext(
  runtime: Runtime,
  body: KnowledgeIndexBody,
  memory: Memory
): Promise<void> {
  const name = `WAGDIE knowledge ${body.tokenId}`;

  await runtime.ensureConnection({
    entityId: memory.entityId,
    roomId: memory.roomId,
    worldId: memory.roomId,
    worldName: name,
    userName: name,
    name,
    source: 'wagdie-knowledge',
    type: 'SELF',
    channelId: `wagdie-knowledge:${body.tokenId}`,
    messageServerId: memory.agentId,
    metadata: {
      tokenId: body.tokenId,
      documentId: body.documentId,
      officialAgentId: body.officialAgentId,
      source: 'wagdie',
    },
  });
}

async function indexKnowledgeDocument(
  req: RouteRequest,
  res: RouteResponse,
  runtime: Runtime
): Promise<void> {
  if (!isAuthorized(req)) {
    json(res, 401, { error: 'Unauthorized' });
    return;
  }

  const body = parseIndexBody(req.body);
  if (!body) {
    json(res, 400, { error: 'Invalid knowledge index payload' });
    return;
  }

  const memoryId = memoryIdFor(body);
  const memory = toMemory(body, memoryId);

  try {
    await ensureKnowledgeMemoryContext(runtime, body, memory);

    const existing = await runtime.getMemoryById(memoryId);

    if (existing) {
      const updated = await runtime.updateMemory(memory);
      if (!updated) {
        throw new Error('ElizaOS memory update did not apply');
      }
    } else {
      await runtime.createMemory(memory, 'documents', true);
    }

    await runtime.queueEmbeddingGeneration(memory, 'high');

    json(res, 200, {
      memoryId,
      status: 'indexed',
    });
  } catch (error) {
    console.error('[wagdie-knowledge] Failed to index document:', error);
    json(res, 500, { error: 'Failed to index knowledge document' });
  }
}

async function deleteKnowledgeDocument(
  req: RouteRequest,
  res: RouteResponse,
  runtime: Runtime
): Promise<void> {
  if (!isAuthorized(req)) {
    json(res, 401, { error: 'Unauthorized' });
    return;
  }

  const body = parseDeleteBody(req.body);
  if (!body) {
    json(res, 400, { error: 'Invalid knowledge delete payload' });
    return;
  }

  const memoryId = (body.officialMemoryId ||
    (body.officialAgentId
      ? memoryIdFor({
          officialAgentId: body.officialAgentId,
          tokenId: body.tokenId,
          documentId: body.documentId,
        })
      : null)) as UUID | null;

  if (!memoryId) {
    json(res, 200, { memoryId: null, status: 'deleted' });
    return;
  }

  try {
    const existing = await runtime.getMemoryById(memoryId);

    if (existing) {
      await runtime.deleteMemory(memoryId);
    }

    json(res, 200, {
      memoryId,
      status: 'deleted',
    });
  } catch (error) {
    console.error('[wagdie-knowledge] Failed to delete document:', error);
    json(res, 500, { error: 'Failed to delete knowledge document' });
  }
}

export const wagdieKnowledgePlugin: Plugin = {
  name: 'wagdie-knowledge',
  description: 'Authenticated WAGDIE server-to-server knowledge ingestion for official ElizaOS memory.',
  routes: [
    {
      type: 'POST',
      path: '/index',
      name: 'WAGDIE knowledge index',
      handler: indexKnowledgeDocument,
    },
    {
      type: 'POST',
      path: '/delete',
      name: 'WAGDIE knowledge delete',
      handler: deleteKnowledgeDocument,
    },
  ],
};
