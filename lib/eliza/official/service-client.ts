/**
 * Server-only helper for direct official ElizaOS service calls.
 *
 * Main `/api/eliza/*` behavior is selected through `lib/eliza/client.ts`; this
 * helper remains useful for health checks and other service-level JSON calls.
 */

import { ElizaClient } from '@elizaos/api-client';
import { elizaConfig } from '../config';

function getOfficialElizaServiceHeaders(): Record<string, string> | undefined {
  if (!elizaConfig.official.apiKey) {
    return undefined;
  }

  return { 'X-API-KEY': elizaConfig.official.apiKey };
}

export function createOfficialElizaServiceClient(): ElizaClient {
  if (typeof window !== 'undefined') {
    throw new Error('createOfficialElizaServiceClient should only run on the server');
  }

  if (!elizaConfig.official.baseUrl) {
    throw new Error('ELIZAOS_BASE_URL is required for official ElizaOS mode');
  }

  return ElizaClient.create({
    baseUrl: elizaConfig.official.baseUrl,
    apiKey: elizaConfig.official.apiKey || undefined,
    timeout: elizaConfig.timeout,
  });
}

export async function checkOfficialElizaServiceHealth(): Promise<unknown> {
  if (elizaConfig.official.healthPath === '/api/server/health') {
    return createOfficialElizaServiceClient().server.checkHealth();
  }

  const response = await fetch(
    `${elizaConfig.official.baseUrl.replace(/\/$/, '')}${elizaConfig.official.healthPath}`,
    { headers: getOfficialElizaServiceHeaders() }
  );

  if (!response.ok) {
    throw new Error(`Official ElizaOS health check failed with ${response.status}`);
  }

  return response.json().catch(() => ({ ok: true }));
}
