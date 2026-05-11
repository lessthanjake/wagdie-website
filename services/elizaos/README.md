# WAGDIE-hosted official ElizaOS service spike

This directory is the deployment/run skeleton for a WAGDIE-hosted official ElizaOS service. WAGDIE Next.js still owns public `/api/eliza/*` route contracts and calls this service server-to-server.

## Verified package/API shape (2026-05-10)

- `@elizaos/server@1.7.2` is the current npm package verified with `npm view` and exposes `AgentServer` plus REST/Socket.IO infrastructure.
- `@elizaos/api-client@1.7.2` is the current npm package verified with `npm view`; the WAGDIE app now has a server-only helper at `lib/eliza/official/service-client.ts`.
- `@elizaos/plugin-venice@1.0.13` is the current Venice plugin verified with `npm view`; it owns `VENICE_*` provider/env config in this service.
- Official docs confirm:
  - agents can be created with `POST /api/agents` using `characterPath` or `characterJson`;
  - rooms exist under `/api/agents/{agentId}/rooms`;
  - health is available at `/api/server/health` plus package-level `/healthz`/`/health`;
  - streaming exists via SSE/WebSocket, but see compatibility notes below.

References:

- https://docs.elizaos.ai/rest-reference
- https://docs.elizaos.ai/guides/streaming-responses
- https://docs.elizaos.ai/rest-reference/system/health-check-endpoint
- https://docs.elizaos.ai/runtime/memory
- https://www.jsdelivr.com/package/npm/%40elizaos/api-client
- https://www.jsdelivr.com/package/npm/%40elizaos/server

## Local run path

```bash
cd services/elizaos
cp .env.example .env
# Fill VENICE_API_KEY for provider-backed chat/embedding tests.
# Keep ELIZA_SERVER_AUTH_TOKEN/SERVER_API_KEY set for non-local environments.
bun install
bun run start
```

From the repo root, smoke-test a local/staging service without production secrets:

```bash
ELIZAOS_BASE_URL=http://localhost:3001 \
ELIZAOS_API_KEY="$ELIZA_SERVER_AUTH_TOKEN" \
bun run elizaos:smoke
```

## Deployment skeleton

- Target: separate long-running service/container, not Next.js route handlers.
- Default dev artifact: root `docker-compose.yml` on the dev host, per the 2026-05-10 plan assumption.
- Services: `elizaos` plus dedicated `elizaos-db` Postgres. This database is ElizaOS persistence only and is separate from the WAGDIE Supabase app database.
- Container: `services/elizaos/Dockerfile`.
- Build context: `services/elizaos`.
- Start command: `bun run start`.
- Host validation URL: `http://localhost:3001` when Compose publishes port `3001`.
- Compose-internal WAGDIE app URL: `http://elizaos:3001`.
- Health checks:
  - Compose/load balancer and WAGDIE cutover gate: `GET /api/server/health`;
  - package-level fallback: `GET /healthz` or `GET /health`;
  - sessions: `GET /api/messaging/sessions/health`.
- Persistence:
  - dev Compose uses the `elizaos-db-data` volume with Postgres and an `elizaos-data` service data volume;
  - local spike may use `SQLITE_PATH` only with `ELIZAOS_ENV=local`;
  - hosted dev/prod should use `DATABASE_URL`/`POSTGRES_URL`.

### Dev Compose runtime

Create service-side secrets in the dev host secret store or an untracked root `.env` consumed by Docker Compose. Do not put Venice/provider secrets in `.env.docker`, because `.env.docker` is also loaded by the WAGDIE app container.

Required service-side values for Compose:

```bash
ELIZA_POSTGRES_USER=elizaos
ELIZA_POSTGRES_PASSWORD=<elizaos-postgres-password>
ELIZA_POSTGRES_DB=elizaos
ELIZA_SERVER_AUTH_TOKEN=<long-random-service-auth-token>
WAGDIE_KNOWLEDGE_INGESTION_TOKEN=<separate-long-random-ingestion-token>
SERVER_API_KEY=<separate-elizaos-runtime-secret>
VENICE_API_KEY=<venice-provider-key>
```

Then start the dev service artifact:

```bash
docker compose up -d elizaos-db elizaos
curl -fsS http://localhost:3001/api/server/health
```

When running the WAGDIE app inside the same Compose project, `docker-compose.yml` maps `ELIZAOS_API_KEY` to `ELIZA_SERVER_AUTH_TOKEN` and points `ELIZAOS_BASE_URL` at `http://elizaos:3001`. The app defaults to `ELIZA_INTEGRATION_MODE=legacy` during service-only validation; set `ELIZA_INTEGRATION_MODE=official` for the Work Item 5 app cutover after direct service smoke passes.

## Env ownership

WAGDIE Next.js app:

- `ELIZA_INTEGRATION_MODE=legacy|dual|official` (defined in `lib/eliza/config.ts`; `official` is selected server-side through `lib/eliza/client.ts`)
- `ELIZAOS_BASE_URL`
- `ELIZAOS_API_KEY` (must equal the service `ELIZA_SERVER_AUTH_TOKEN`; never use `SERVER_API_KEY` or `VENICE_API_KEY` in the app)
- `ELIZAOS_HEALTH_PATH=/api/server/health`

ElizaOS service:

- `ELIZA_SERVER_AUTH_TOKEN` (`X-API-KEY` for REST; matches `ELIZAOS_API_KEY` in WAGDIE; required outside local development)
- `WAGDIE_KNOWLEDGE_INGESTION_TOKEN` (required outside local development for `/wagdie-knowledge/*` ingestion; local route code can fall back to `ELIZA_SERVER_AUTH_TOKEN` only for throwaway local work)
- `WAGDIE_KNOWLEDGE_ALLOW_UNAUTHENTICATED_LOCAL=false` (only set `true` for throwaway local development without a token; startup rejects it in hosted/dev/prod environments)
- `SERVER_API_KEY` (Socket.IO auth if enabled; required outside local development)
- `VENICE_API_KEY` (required outside local development)
- `VENICE_BASE_URL`
- `VENICE_SMALL_MODEL`
- `VENICE_LARGE_MODEL`
- `VENICE_EMBEDDING_MODEL`
- `VENICE_EMBEDDING_DIMENSIONS`
- `DATABASE_URL`/`POSTGRES_URL` (required outside local development) or local-only `SQLITE_PATH`

Do not place Venice keys in the WAGDIE Next.js app after official cutover. In Compose, keep `VENICE_API_KEY` in the host secret store/root `.env` used for service interpolation, not in `.env.docker`.

## Startup environment validation

`src/server.ts` calls `validateStartupEnvironment()` before `AgentServer.start()`.

- Hosted/dev/prod environments must provide `ELIZA_SERVER_AUTH_TOKEN`, `WAGDIE_KNOWLEDGE_INGESTION_TOKEN`, `SERVER_API_KEY`, `VENICE_API_KEY`, and either `DATABASE_URL` or `POSTGRES_URL`.
- `WAGDIE_KNOWLEDGE_ALLOW_UNAUTHENTICATED_LOCAL=true` is accepted only for local development and is rejected before startup elsewhere.
- Local-only development (`ELIZAOS_ENV=local` or no deployment markers with non-production `NODE_ENV`) warns instead of failing so developers can run throwaway SQLite/no-provider flows intentionally.
- For hosted dev/prod, set an explicit environment marker such as `ELIZAOS_ENV=development`, `staging`, or `production` so startup uses the fail-closed path.

`ELIZA_INTEGRATION_MODE` runtime tunability is host-dependent and is not proven by this repo. Until the deployment platform confirms live env-var mutation without restart, assume rollback from `official` to `legacy` requires a WAGDIE app redeploy/restart.

## Compatibility findings

| Area | Finding | Status for migration |
| --- | --- | --- |
| Streaming | Official docs show HTTP streaming/SSE and WebSocket chunk/complete/error semantics. `@elizaos/server@1.7.2` package code emits SSE events named `user_message`, `chunk`, `done`, `error` for messaging/session transports. | Compatible in principle, but WAGDIE adapter must normalize `chunk`→`token` and `done`→`complete`. |
| `@elizaos/api-client` streaming | The 1.7.2 client request helper parses JSON responses and has no typed stream reader for SSE. | Use `@elizaos/api-client` for JSON endpoints; use raw server-side `fetch` for SSE. |
| Per-call user identity | Sessions accept `agentId`, `userId`, and metadata. Messages accept metadata. Room/memory reads also inspect `x-entity-id` in server code. | Promising, but production conversation migration still needs an isolation/dedupe test with WAGDIE wallet-derived stable UUIDs. |
| Memory push/index | Runtime docs support creating `DOCUMENT` memory and document operations with source pointers; REST/api-client exposes memory read/update/delete/clear, but no direct create/index method in `MemoryService`. | Implemented pragmatically through the WAGDIE-owned `wagdie-knowledge` plugin route: `POST /wagdie-knowledge/index` creates/updates `documents` memory and queues embedding generation. |
| Delete/invalidate | REST/api-client supports delete memory, clear room memories, and clear all agent memories. Runtime docs support delete/clear operations. | Implemented for known WAGDIE-tracked memory ids through `POST /wagdie-knowledge/delete`. Official cutover remains blocked if indexed memory lacks a recorded `official_memory_id`. |
| Service auth | `@elizaos/api-client` sends `X-API-KEY`; `@elizaos/server` validates `ELIZA_SERVER_AUTH_TOKEN` for REST when configured. | Compatible for WAGDIE server-to-server auth; never expose to browser. |
| Provider config | ElizaOS v1 uses plugins/env; Venice plugin owns `VENICE_*` env and supports text plus embeddings. | Compatible with decision that ElizaOS owns Venice config. |
| Health checks | Docs/package expose `/api/server/health`, `/healthz`, `/health`, and sessions health. | Compatible for deployment/cutover gates. |
| Rollback | `ELIZA_INTEGRATION_MODE` defaults to `legacy`; adapter work can use `legacy`/`dual`/`official`. | Compatible; current user-visible behavior is unchanged. |

## WAGDIE knowledge ingestion route

Work Item 5 adds `src/wagdie-knowledge-plugin.ts`, registered with the hosted runtime.

- `POST /wagdie-knowledge/index`
  - Auth: `X-API-KEY` or `Authorization: Bearer` matching `WAGDIE_KNOWLEDGE_INGESTION_TOKEN` or `ELIZA_SERVER_AUTH_TOKEN`; unauthenticated access requires explicit `WAGDIE_KNOWLEDGE_ALLOW_UNAUTHENTICATED_LOCAL=true` and is limited to local development.
  - Payload: `tokenId`, `documentId`, `officialAgentId`, `path`, `content`, `contentHash`, and a durable `sourcePointer`.
  - Behavior: deterministic memory id per `(officialAgentId, tokenId, documentId)`, create/update in the `documents` table, queue embedding generation.
- `POST /wagdie-knowledge/delete`
  - Auth: same as index.
  - Payload: `tokenId`, `documentId`, optional `officialAgentId`, optional `officialMemoryId`.
  - Behavior: delete the tracked official memory id if present, otherwise derive the deterministic memory id from `(officialAgentId, tokenId, documentId)`; missing memory is treated as already invalidated.

## Dev validation tooling

From the repo root, Work Items 3-4 validation is run with:

```bash
bun run elizaos:db:validate
bun run elizaos:smoke
# Restart the ElizaOS service/container, then:
bun run elizaos:smoke:post-restart
```

See `docs/runbooks/elizaos-dev-validation.md` for required environment variables, two-pass fresh/restart instructions, and coverage notes.

## Stop condition from this spike

Do not cut over knowledge to official memory unless every indexed document has either a recorded `official_memory_id` or an `official_agent_id` sufficient for deterministic invalidation, and delete/tombstone invalidation succeeds. The stock 1.7.2 REST client shape is still insufficient by itself; WAGDIE depends on the custom service-side ingestion route above.
