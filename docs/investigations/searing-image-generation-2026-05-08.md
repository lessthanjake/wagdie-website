# Investigation: Searing Did Not Generate New Token Image

## Summary
The transaction succeeded and emitted the expected `ConcordSeared` event for WAGDIE `4702` with concord `48`, so the chain side is not the apparent failure. The confirmed root-cause class is an off-chain materialization/display gap: the indexer records events only, while image generation requires a separate sync/materialization path or can be hidden by infected-image/display caching behavior.

## Symptoms
- A searing was performed on-chain in transaction `0x4b5906ec668270d4ab52d3358607539f2fbe9783f1c59d36bcc8ae5ab71a3f71`.
- The expected new/generated token image did not appear.
- Need to determine whether the issue is transaction/event parsing, sync/indexing, searing-map lookup, image composition/storage, or metadata/display caching.

## Background / Prior Research

### External transaction facts - Etherscan
- Transaction `0x4b5906ec668270d4ab52d3358607539f2fbe9783f1c59d36bcc8ae5ab71a3f71` succeeded in block `25050026` at `2026-05-08 11:24:59 UTC`.
- Called `searConcords(tuple[] _searParams)` (`0x94db29c6`) on `SearWagdie` contract `0x5156A7F668E59119db23a264502F40407CDa076F`.
- Sender/owner: `riv3n.eth` / `0xe7bC8Ef68Cb17Cd3f57C067574197D50b8A2e156`.
- Token contract involved: `TokensOfConcord` `0x1d38150f1Fd989Fb89Ab19518A9C4E93C5554634`.
- Logs include ERC-1155 `TransferSingle` burn from sender to zero address for concord/token id `48`, value `1`.
- Logs include `ConcordSeared(uint16 wagdieId, uint16 tokenId, address owner)` with `wagdieId=4702`, `tokenId=48`, `owner=0xe7bC8Ef68Cb17Cd3f57C067574197D50b8A2e156`.
- Conclusion: the on-chain transaction emitted the app-indexable searing signal; investigate app sync/index/composition/storage/display path for WAGDIE/token `4702` and concord/token `48`.
- Sources: https://etherscan.io/tx/0x4b5906ec668270d4ab52d3358607539f2fbe9783f1c59d36bcc8ae5ab71a3f71, https://etherscan.io/address/0x5156a7f668e59119db23a264502f40407cda076f, https://etherscan.io/address/0x1d38150f1fd989fb89ab19518a9c4e93c5554634

## Investigator Findings
<!-- Pair investigator appends structured findings here. -->

### 2026-05-08 - Pipeline trace for tx `0x4b5906ec668270d4ab52d3358607539f2fbe9783f1c59d36bcc8ae5ab71a3f71`

#### Scope and token facts
- The external transaction facts identify the relevant application tuple as WAGDIE/token `4702` seared with concord/token `48` in block `25050026`.
- Local static metadata for token `4702` has composable base traits: Armor `Holy Diamond of Her`, Back `Nameless One's Blessing`, Background `Gothic`, Body `Zolian Worm`, Hair `Piltin Cut`, Mask `Goldbeard's Eyes`, Alignment `Neutral Good` (`public/metadata/characters/4702.json:6-41`). Those exact base layer PNGs exist locally under `public/images/wagdie-layers/{Armor,Back,Background,Body,Hair,Mask}/...png` (path search confirmed all six). This reduces, but does not eliminate, layer-risk: the unknown part is concord `48`'s resolved searing layer (`/Searing/<location>/<new_trait>.png`).

#### Event ingestion/indexing
- The standalone indexer is configured only to watch/backfill `ConcordSeared` logs and route them to `handleSearConcordsLogs` (`scripts/indexer/searing-indexer.ts:58-73`).
- `handleSearConcordsLogs` decodes `ConcordSeared`, maps ABI `wagdieId` to `token_id` and ABI `tokenId` to domain `concord_id`, then pushes rows with `event_type: 'sear'`, tx hash, block/log index, actor, and metadata (`scripts/indexer/searing-event-handler.ts:128-174`).
- The handler batch-upserts only to `searing_events` on conflict `(transaction_hash,log_index)` and then enqueues Discord notifications (`scripts/indexer/searing-event-handler.ts:183-204`). There is no import or call to the image composer, storage service, or materialization service in this indexer handler.
- The `searing_events` table was initially an event log table with unique `(transaction_hash, log_index)` (`supabase/migrations/20251231000000_searing_events.sql:4-17`), then materialization columns were added later: `materialization_status`, attempts/error/timestamp, `seared_image_url`, and `materialization_metadata` (`supabase/migrations/20260413000000_concord_searing_maps.sql:72-97`).
- **Conclusion for claim (1): proved for the background indexer.** The indexer records events and Discord notifications only; successful indexing by itself does not generate/upload a seared image.

#### On-demand and bulk materialization are the image-generation path
- The public per-character sync endpoint requires a `transactionHash`, validates optional `chainId`, and calls `searingMaterializationService.verifyTransactionAndMaterialize` (`app/api/characters/[tokenId]/searing/sync/route.ts:38-55`).
- `verifyTransactionAndMaterialize` fetches the transaction receipt, filters logs to the configured searing contract, decodes `ConcordSeared`, filters to the requested token, inserts the event row if missing, and immediately calls `materializeEvent` (`lib/services/searing-materialization-service.ts:283-321`). This is both an ingest and materialization path.
- Bulk/admin materialization exists separately: `POST /api/sync/searing` is protected by `SYNC_SECRET_KEY` and calls `materializePendingBatch` with optional `tokenIds`, `includeFailed`, and `retryFailed` (`app/api/sync/searing/route.ts:22-35`, `app/api/sync/searing/route.ts:91-107`). The CLI script `scripts/materialize-searing-events.ts` loops `materializePendingBatch`, optionally scoped by `SEARING_MATERIALIZE_TOKEN_IDS` and retrying failed rows (`scripts/materialize-searing-events.ts:37-75`).
- Pending event selection is explicit: `findPending` selects `event_type='sear'` and `materialization_status in ('pending', plus 'failed' when included)` (`lib/repositories/searing-event-repository.ts:263-289`). Claiming moves rows to `processing` and increments attempts (`lib/repositories/searing-event-repository.ts:154-200`).
- **Conclusion for claim (2): proved.** If the modal/on-demand sync did not run or failed after the on-chain tx, the indexer can leave a valid searing row in `pending`; image generation requires per-tx sync or bulk materialization.

#### Materialization pipeline and failure/status paths
- `materializeClaimedEvent` skips unsupported event types and older events if a newer sear exists for the same token (`lib/services/searing-materialization-service.ts:385-421`). For tx `0x4b...`, verify if a later token `4702` searing exists before treating this row as authoritative.
- The service then loads the character (`lib/services/searing-materialization-service.ts:423-425`), loads concord map row by `concord_id` (`lib/services/searing-materialization-service.ts:427-430`; repository query is `concord_searing_maps.concord_token_id = <id>` at `lib/repositories/searing-map-materialization-repository.ts:33-45`), resolves and validates layers (`lib/services/searing-materialization-service.ts:427-430`), composes with Sharp (`lib/services/searing-materialization-service.ts:430`; `lib/services/searing-image-composer.ts:125-143`), uploads to GCS (`lib/services/searing-materialization-service.ts:431-434`; `lib/services/searing-storage.ts:73-91`), updates the character read model (`lib/services/searing-materialization-service.ts:437-443`; `lib/repositories/character-materialization-repository.ts:139-163`), marks `character_concords` seared (`lib/services/searing-materialization-service.ts:445-449`; `lib/repositories/character-materialization-repository.ts:201-243`), and marks the event completed with `seared_image_url` plus `materialization_metadata.layers/layer_urls` (`lib/services/searing-materialization-service.ts:451-464`; `lib/repositories/searing-event-repository.ts:202-224`).
- Any exception in character lookup, map lookup, layer validation/composition, upload, or read-model writes is caught and stored as `materialization_status='failed'` with `materialization_error` (`lib/services/searing-materialization-service.ts:475-490`; `lib/repositories/searing-event-repository.ts:245-261`).
- Existing completed rows can still be problematic: if completed but no cache-safe versioned URL is present, `materializeEvent` returns `completed_without_image` unless `repairCompleted` is set (`lib/services/searing-materialization-service.ts:184-207`). Versioned, cache-safe URLs are detected by token subdirectory path rather than legacy `/<token>.png` (`lib/services/searing-materialization-service.ts:87-104`).

#### Concord `48` map/layer resolution risk
- Concord map lookup is mandatory. Missing `concord_searing_maps` row for `concord_token_id=48` throws `No concord searing map found for concord 48` (`lib/services/searing-materialization-service.ts:427-430`; `lib/repositories/searing-map-materialization-repository.ts:33-45`).
- Variant resolution depends on token alignment. The resolver compares the character's resolved alignment against `alt_1`..`alt_6`; if none matches, it falls back to the default `location/new_trait/makes_bald` on the concord row (`lib/domain/searing/searing-layer-resolver.ts:128-153`). Token `4702` has `Alignment = Neutral Good` in local metadata (`public/metadata/characters/4702.json:31-34`).
- Validation fails if the resolved concord variant has empty `location`, empty `newTrait`, no composable WAGDIE layers, or no layer marked seared (`lib/domain/searing/searing-layer-resolver.ts:222-237`).
- The seared layer URL is deterministic: `/images/wagdie-layers/Searing/<location>/<newTrait>.png` (`lib/domain/searing/searing-layer-resolver.ts:160-162`), and local reads throw if the file cannot be found, after a filename-only fallback search (`lib/services/searing-image-composer.ts:94-118`).
- **Conclusion for claim (3): possible but not proved from repo files alone.** Token `4702`'s base layers exist, so the most likely concord-specific failures are: missing concord `48` row; no `Neutral Good` alt and blank/default `location` or `new_trait`; a resolved `Searing/<location>/<newTrait>.png` file absent/misnamed; or `sharp`/GCS credentials unavailable. The DB row and materialization error must be checked.

#### GCS upload/read-model update and cache behavior
- New seared images are uploaded to `SEARING_GCS_BUCKET`/`GCS_BUCKET_NAME`/`GCS_BUCKET` (default `seared-wagdie-images`) under a token path. When materializing an event, the version includes tx hash, log index, and image digest (`lib/services/searing-materialization-service.ts:87-90`, `lib/services/searing-materialization-service.ts:431-434`; object path logic at `lib/services/searing-storage.ts:58-67`).
- Uploaded objects are immutable for one year (`cacheControl: public, max-age=31536000, immutable`) (`lib/services/searing-storage.ts:83-90`), so versioned paths are important. Legacy unversioned completed rows can be treated as `completed_without_image`/repair candidates (`lib/services/searing-materialization-service.ts:184-207`).
- The character read-model update always stores dynamic searing metadata: `metadata.isSeared = true`, `metadata.searImage = <url>`, `metadata.searedConcord`, and `metadata.searing_materialization.seared_image_url` (`lib/repositories/character-materialization-repository.ts:102-119`). It updates `characters.image_url` to either the infected/current image or the seared URL (`lib/repositories/character-materialization-repository.ts:145-157`).

#### Frontend image selection and hidden-image possibilities
- Image precedence is centralized in `getCharacterImageCandidates`: policy and implementation are `infected dynamic image` first, `seared dynamic image` second, local/static asset third, placeholder last (`lib/utils/image.ts:194-216`).
- Infected candidates are returned only while `infectionStatus === 'infected'` or `isInfected === true` and use `metadata.infectedImage`, `metadata.infected_image_url`, or nested infection image fields (`lib/utils/image.ts:132-145`). Seared candidates use `metadata.searing_materialization.seared_image_url`, then `metadata.searImage`, then `character.image_url`, then `metadata.image_url/image` only when a materialized candidate exists (`lib/utils/image.ts:156-170`).
- Backend read-model update also preserves infected/current images ahead of the new seared image: `nextImageUrl = infectedImageUrl || (shouldPreserveCurrentImage && character.image_url ? character.image_url : update.searedImageUrl)` (`lib/repositories/character-materialization-repository.ts:145-149`), while still storing the seared URL in metadata.
- Character detail page fetches `/api/characters/:tokenId`, computes candidates from `metadata`, `image_url`, and infection flags, picks the first candidate, and advances only on image load error (`app/characters/[tokenId]/page.tsx:47-58`, `app/characters/[tokenId]/page.tsx:159-176`). `CharacterCard` and `SheetTitleAndAttributes` do the same candidate/fallback pattern (`components/characters/CharacterCard.tsx:24-53`; `components/characters/SheetTitleAndAttributes.tsx:17-36`).
- The character list hook caches for five minutes via React Query (`hooks/useCharacters.ts:36-62`), while the detail page's direct fetch does not pass `cache: 'no-store'` (`app/characters/[tokenId]/page.tsx:47-52`) and the GET route returns plain `NextResponse.json` without no-store headers (`lib/api/handlers/character-update.ts:58-73`). Searing sync/preview endpoints themselves are no-store (`app/api/characters/[tokenId]/searing/sync/route.ts:55`; `app/api/characters/[tokenId]/searing/preview/route.ts:68-75`).
- **Conclusion for claim (4): possible.** A generated image can be hidden if token `4702` is currently infected or has infected image metadata; the UI will prefer infected image candidates over the seared URL. It can also appear stale for up to the character list React Query stale window, or until the detail fetch sees the updated DB/read-model response. Versioned GCS URLs mitigate browser/object-cache staleness for newly generated images.

#### Recommended verification SQL/API calls
1. Confirm whether the event exists and its materialization state:
   ```sql
   select id, token_id, concord_id, event_type, transaction_hash, block_number, log_index,
          actor_address, created_at, materialization_status, materialization_attempts,
          materialization_error, materialized_at, seared_image_url, materialization_metadata
   from searing_events
   where lower(transaction_hash) = lower('0x4b5906ec668270d4ab52d3358607539f2fbe9783f1c59d36bcc8ae5ab71a3f71')
      or token_id = 4702
   order by block_number desc, log_index desc;
   ```
2. Confirm concord `48` has usable default or `Neutral Good` variant data:
   ```sql
   select concord_token_id, token_name, location, new_trait, makes_bald,
          alt_1, alt_2, alt_3, alt_4, alt_5, alt_6, raw_data, updated_at
   from concord_searing_maps
   where concord_token_id = 48;
   ```
3. Confirm whether the character read model contains a seared URL but displays another image due to infected/current precedence:
   ```sql
   select token_id, image_url, infection_status, infected,
          metadata->>'image' as metadata_image,
          metadata->>'isSeared' as is_seared,
          metadata->>'searImage' as sear_image,
          metadata#>>'{searing_materialization,seared_image_url}' as seared_image_url,
          metadata->>'infectedImage' as infected_image,
          metadata->>'infected_image_url' as infected_image_url,
          metadata#>>'{infection,image_url}' as infection_image_url
   from wagdie_characters
   where token_id = 4702;
   ```
4. Confirm `character_concords` was updated:
   ```sql
   select *
   from character_concords
   where token_id = 4702 and concord_id = 48;
   ```
5. Retry/repair on-demand materialization and inspect exact result status/error/image URL:
   ```bash
   curl -sS -X POST 'https://<site>/api/characters/4702/searing/sync' \
     -H 'Content-Type: application/json' \
     --data '{"transactionHash":"0x4b5906ec668270d4ab52d3358607539f2fbe9783f1c59d36bcc8ae5ab71a3f71","chainId":1,"retryFailed":true,"repairCompleted":true}'
   ```
6. If bulk sync infrastructure is used, materialize just this token and include failed rows:
   ```bash
   curl -sS -X POST 'https://<site>/api/sync/searing' \
     -H 'Authorization: Bearer <SYNC_SECRET_KEY>' \
     -H 'Content-Type: application/json' \
     --data '{"tokenIds":[4702],"limit":10,"includeFailed":true,"retryFailed":true}'
   ```
7. Preview composition without writing read model/uploading, to isolate concord map/layer-composition errors:
   ```bash
   curl -i 'https://<site>/api/characters/4702/searing/preview?concordId=48' --output /tmp/4702-48-preview.png
   ```
8. If `seared_image_url` is present, `curl -I <seared_image_url>` and compare it against `/api/characters/4702` JSON fields. If `/api/characters/4702` includes `metadata.searImage` / `metadata.searing_materialization.seared_image_url` but `image_url` is infected/current, the generation succeeded and display precedence is the likely explanation.

#### Bottom-line hypotheses for this tx
- If no row exists in `searing_events`, ingestion/indexer or on-demand receipt decoding did not run for this tx/log.
- If row exists with `pending`, the tx was indexed but no materializer processed it; run on-demand sync or bulk materialization.
- If row exists with `failed`, `materialization_error` should identify the exact stage (missing character, missing concord `48` map, missing `location/new_trait`, missing layer file, `sharp` load failure, GCS upload failure, or DB update failure).
- If row exists with `completed` and `seared_image_url`, image generation/upload succeeded. Then inspect character read model and frontend precedence/cache: infected image precedence or stale character fetch/list cache can hide the seared image even though it was generated.
- If row exists with `completed_without_image` or completed with a legacy unversioned URL, rerun with `repairCompleted:true` to force a cache-safe versioned GCS object and read-model repair.

## Investigation Log

### Phase 1 - Initial Assessment
**Hypothesis:** The failure could be in one of several stages: on-chain searing event recognition, sync/indexing, concord-to-layer mapping, image composition/upload, metadata update, or UI cache/display.
**Findings:** Initial repo map shows searing-related routes/services under `app/api/**/searing`, `app/api/sync/searing`, `lib/services/blockchain/searing.ts`, `lib/services/searing-image-composer.ts`, `lib/repositories/searing-event-repository.ts`, and `scripts/indexer/searing-indexer.ts`.
**Evidence:** User-provided transaction: https://etherscan.io/tx/0x4b5906ec668270d4ab52d3358607539f2fbe9783f1c59d36bcc8ae5ab71a3f71
**Conclusion:** External transaction facts showed the tx succeeded and emitted the expected event; workspace investigation showed the image-generation responsibility is in materialization, not bare indexing.

### Phase 4 - Oracle Synthesis
**Hypothesis:** The final report should distinguish confirmed root-cause class from unresolved production data/environment state.
**Findings:** Oracle synthesis agreed that the report should not claim a specific missing map/GCS/cache failure without DB/API evidence. The defensible conclusion is that the chain event is valid and indexable, while the missing image is in the off-chain materialization/display branch.
**Evidence:** Spot-checked code references in `scripts/indexer/searing-event-handler.ts`, `lib/services/searing-materialization-service.ts`, `lib/utils/image.ts`, and `lib/repositories/character-materialization-repository.ts`.
**Conclusion:** Confirmed root-cause class; exact branch requires production queries/API retry.

## Root Cause
Confirmed root-cause class: **valid on-chain searing event, but image generation/display depends on a separate off-chain materialization pipeline that may not have completed or may be visually hidden.**

Evidence:
- The external transaction succeeded and emitted `ConcordSeared(wagdieId=4702, tokenId=48, owner=...)`, mapping to app `token_id=4702` and `concord_id=48`.
- `scripts/indexer/searing-event-handler.ts:136-204` decodes that event and upserts `searing_events`, but does not call materialization, image composition, storage, or character update code.
- Image generation is performed by the sync/materialization paths: `app/api/characters/[tokenId]/searing/sync/route.ts:38-55`, `app/api/sync/searing/route.ts:91-107`, and `scripts/materialize-searing-events.ts:37-75`.
- `lib/services/searing-materialization-service.ts:423-464` is the actual generation pipeline: character lookup, concord map lookup, layer resolution, image composition, GCS upload, character read-model update, concord marking, and event completion.
- `lib/services/searing-materialization-service.ts:475-490` records any materialization exception as `materialization_status='failed'` with `materialization_error`.
- If generation completed, display can still prefer infected imagery over the seared image: `lib/utils/image.ts:194-216` orders infected candidates before seared candidates, and `lib/repositories/character-materialization-repository.ts:139-157` may preserve infected/current `image_url` while storing the seared URL in metadata.

What cannot be proven without production DB/API access:
- Whether this exact tx row is absent, `pending`, `failed`, `completed_without_image`, `skipped`, or `completed`.
- Whether concord `48` has valid `concord_searing_maps` data and resolves to an existing searing layer for token `4702`'s `Neutral Good` alignment.
- Whether GCS/sharp/Supabase credentials failed in production.
- Whether a seared URL exists but is hidden by infection precedence or stale frontend/API cache.

## Recommendations
1. **P0: Run/inspect exact on-demand repair for token 4702.**
   - `POST /api/characters/4702/searing/sync` with `transactionHash=0x4b5906ec668270d4ab52d3358607539f2fbe9783f1c59d36bcc8ae5ab71a3f71`, `chainId=1`, `retryFailed=true`, and `repairCompleted=true`.
   - Inspect returned `status`, `imageUrl`, and `error`.
2. **P0: Query production state for this tx.**
   - Check `searing_events` by tx hash for `materialization_status`, `materialization_error`, `seared_image_url`, and latest-event ordering for `token_id=4702`.
   - Check `concord_searing_maps` for `concord_token_id=48`.
   - Check `wagdie_characters` for `image_url`, infection fields, `metadata.searImage`, and `metadata.searing_materialization.seared_image_url`.
3. **P1: Ensure background materialization runs reliably.**
   - Do not rely only on UI post-transaction sync. Confirm a scheduled worker/cron calls `POST /api/sync/searing` or runs `scripts/materialize-searing-events.ts` with failed retry support.
4. **P1: Add monitoring/alerts for stuck searing events.**
   - Alert on `materialization_status='failed'`, stale `processing`, and long-lived `pending` rows.
5. **P1: Add admin/manual retry tooling.**
   - Support retry by tx hash, token ID, or event ID with `retryFailed` and `repairCompleted` enabled.
6. **P2: Improve display clarity and cache behavior.**
   - If a seared image exists but infection precedence hides it, show an explicit status such as “Seared artwork generated but hidden while infected.”
   - Add/refine no-store or explicit refetch/invalidation for character detail/list responses after sync.

## Preventive Measures
- Treat indexing and materialization as two monitored stages with separate metrics: event ingestion, claim, composition, upload, read-model update, and display.
- Store stage-specific materialization metadata/errors so operators can identify whether failures are map data, layer file, sharp, GCS, Supabase, or display precedence issues.
- Add regression tests proving that indexed events alone remain `pending` until materialized, and that sync/bulk materialization updates `seared_image_url` and character metadata.
- Add an operational dashboard for pending/failed searing events and cache-safe URL repairs.
- Document infected-image precedence so successful sears are not misclassified as generation failures when infection art intentionally remains primary.
