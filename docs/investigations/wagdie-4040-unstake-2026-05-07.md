# Investigation: WAGDIE 4040 Unable to Unstake from Map

## Summary
WAGDIE 4040 is not dead/burned and is already unstaked on-chain. The map can still show an Unstake action if production DB/cache fields (`location_id`, `staker_address`, `staking_status`) are stale; an unstake transaction then correctly reverts with `Wagdie is not staked`.

## Symptoms
- User reports WAGDIE 4040 is unable to be unstaked from the map.
- User asks whether token 4040 is a "dead" character or "burned".

## Background / Prior Research
- Existing report `docs/investigations/staking-unstaking-2026-05-06.md` found a broader staking/unstaking class of bugs: DB location IDs and on-chain location IDs are conflated, post-transaction staking sync can leave UI stale, and unstake lacks the same network gate as stake.
- Local metadata `public/metadata/characters/4040.json` lists token `4040`, name `𝔟𝔲𝔰𝔰𝔦𝔫 𝔟𝔬𝔶`, `sheet.location: Unknown`, and attribute `Health: Alive`.
- External/on-chain probe mapped mainnet contracts from `lib/contracts/addresses.ts`: WAGDIE ERC721 `0x659a4bdaaacc62d2bd9cb18225d9c89b5b697a5a`, WagdieWorld staking `0x616D4635ceCf94597690Cab0Fc159c3A8231C904`.
- Follow-up live RPC verification via `https://ethereum.publicnode.com` on 2026-05-07 returned: `ownerOf(4040) = 0x08DF3044b520Fd001c93e97041D3F257D8c0dB7B`; `tokenURI(4040) = https://fateofwagdie.com/api/characters/metadata/4040`; `wagdieIdToInfo(4040) = { locationIdCur: 0, owner: 0x0000000000000000000000000000000000000000, emptySpace: 0 }`; `isStakingEnabled() = true`; `getApproved(4040) = 0x0000000000000000000000000000000000000000`; `isApprovedForAll(owner, WagdieWorld) = true`.
- Interpretation of live RPC: token 4040 exists, is not owned by zero/dead/burn address, and is not currently staked according to WagdieWorld state (location `0`, owner zero).

## Investigator Findings
<!-- Pair investigator appends structured analysis here: file:line refs, evidence, conclusions. -->

### Pair Investigator Findings - 2026-05-07

#### Executive conclusion
All four propositions are supported, with one important nuance: the current code has already fixed several broad May 6 bugs, but the normal map/staked-list display path is still DB-cache-derived and can therefore remain stale for token 4040 until DB sync clears its cached staking fields.

1. **4040 is not dead/burned - supported.** Local metadata marks `Health: Alive` (`public/metadata/characters/4040.json:63-67`) and a fresh mainnet read during this investigation returned `ownerOf(4040)=0x08DF3044b520Fd001c93e97041D3F257D8c0dB7B`, not zero/dead. App burn/dead semantics are owner/burn-flag based, not `Health`-trait based: `isBurnAddress()` recognizes only zero/dead addresses (`lib/utils/blockchain.ts:19-25`) and `isBurnedOwner()` returns true for burn address or explicit DB `burned=true` (`lib/utils/blockchain.ts:29-35`). Character repository reads normalize `burned` from `owner_address` plus DB `burned` (`lib/repositories/character/character-query-repository.ts:39-46`; `lib/repositories/character/character-staking-repository.ts:71-80`). UI `Dead`/`Fallen` badges are driven by `character.burned` and `location_id`, not metadata `Health` (`components/characters/CharacterCard.tsx:104-130`). Metadata trait indexing is generic (`lib/services/assets/character-local-assets.ts:58-65`, `lib/services/assets/character-local-assets.ts:189-204`; `lib/repositories/character/character-traits-repository.ts:145-174`).

2. **4040 is already unstaked on-chain, so an unstake tx fails/reverts - supported.** Fresh mainnet RPC via viem on 2026-05-07 returned `wagdieIdToInfo(4040)={ locationIdCur: "0", owner: 0x0000000000000000000000000000000000000000, emptySpace: "0" }`, `getApproved(4040)=0x0000000000000000000000000000000000000000`, and `isApprovedForAll(owner,WagdieWorld)=true`. A same-call `simulateContract` for `unstakeWagdies([{ wagdieId: 4040 }])` from the ERC721 owner failed with reason **`Wagdie is not staked`**. The app's unstake path does not preflight `wagdieIdToInfo`; it goes from `handleUnstake()` to `unstakeWagdie()` (`hooks/map/useMapStakingPanel.ts:410-424`), then to `service.unstakeWagdies()` (`hooks/useStaking.ts:601-634`), which simulates and writes the contract call (`lib/services/blockchain/staking.ts:257-284`). Therefore a stale UI button can lead directly to a contract simulation/revert instead of a local "already unstaked" explanation.

3. **The map can still show 4040 as staked due to stale DB fields - supported.** The map loads staked rows through `/api/characters?tab=staked` (`hooks/map/useMapData.ts:47-83`) and joins them to locations by DB `location_id` (`hooks/map/useMapData.ts:7-27`). The characters API accepts `tab='staked'` (`app/api/characters/route.ts:14-21`) and forwards filters to the service (`app/api/characters/route.ts:78-92`); the repository implements the tab as DB-only `location_id IS NOT NULL` (`lib/repositories/character/character-query-repository.ts:83-86`). The map selection groups these rows by DB `location_id` (`lib/utils/mapOrchestration.ts:37-56`; `hooks/map/useMapPageSelection.ts:33-42`). The "staked here" unstake button is shown when DB `staker_address ?? owner_address` matches the connected wallet (`components/map/staking-sidebar/StakedHereList.tsx:49-53`, `components/map/staking-sidebar/StakedHereList.tsx:95-103`). Separately, default staking-status reads are also DB-derived: `useStakingStatuses()` defaults to `source='db'` (`hooks/useStakingStatuses.ts:112-113`), calls `/api/characters/staking-status` (`hooks/useStakingStatuses.ts:94-109`), and the API DB path sets `isStaked` from `location_id !== null` (`app/api/characters/staking-status/route.ts:114-146`) after selecting only `token_id, location_id` (`lib/repositories/activity-repository.ts:179-194`). Thus if production DB row 4040 still has non-null `location_id`, stale `staker_address`, and/or `staking_status='staked'`, the map/UI can display it as staked even though chain says location `0`.

4. **Sync-to-DB behavior for an unstaked token now clears the stale fields when it succeeds - supported.** `/api/sync/staking` validates token IDs then delegates to `syncStakingState()` (`app/api/sync/staking/route.ts:23-49`). The shared sync reads `wagdieIdToInfo` from chain (`lib/services/sync/staking-state-sync.ts:324-389`), treats chain location `0` as unstaked, and queues an update with `locationId:null`, `stakerAddress:null`, `stakingStatus:'unstaked'` (`lib/services/sync/staking-state-sync.ts:500-513`). The DB update writes all three fields plus `updated_at` (`lib/services/sync/staking-state-sync.ts:276-287`). This means a targeted successful sync for 4040 should clear stale map state.

5. **Current code has fixes versus the May 6 broad report, but stale-DB display remains possible.** Fixed/current behavior includes: map stake selection now parses `location.chain_location_id` rather than DB `location.id` (`lib/utils/mapOrchestration.ts:72-91`); chain-to-DB sync maps chain IDs via `locations.chain_location_id` or metadata fallback (`lib/services/sync/staking-state-sync.ts:175-247`); staking-status API separates `dbLocationId` and `chainLocationId` with `locationId` retained only as deprecated compatibility (`app/api/characters/staking-status/route.ts:17-31`, `app/api/characters/staking-status/route.ts:80-112`, `app/api/characters/staking-status/route.ts:114-146`); the hook only BigInt-parses explicit/chain location IDs and keeps DB IDs as strings (`hooks/useStakingStatuses.ts:39-75`); post-transaction sync failures now return structured outcomes (`hooks/useStaking.ts:37-160`, `hooks/useStaking.ts:276-328`); and unstake is now mainnet-gated in `canUnstakeNow` (`hooks/map/useMapStakingPanel.ts:433-442`) and button disabled states (`components/map/staking-sidebar/CharacterStakeList.tsx:97-105`; `components/map/staking-sidebar/StakedHereList.tsx:95-103`). What is not "fixed" is that normal map/staked-tab truth is still a DB cache, so stale DB can still contradict chain until `/api/sync/staking` or `source=chain` refresh succeeds.

#### Recommended verification API/RPC calls
- **DB row:** query production Supabase for `select token_id, owner_address, staker_address, location_id, staking_status, burned, updated_at from wagdie_characters where token_id = 4040;`. Expected after successful sync: `location_id=null`, `staker_address=null`, `staking_status='unstaked'`; `burned` should be false unless separately marked.
- **Map/staked list cache:** `GET /api/characters?tab=staked&search=4040&page=1&perPage=10&sort=asc`. If this returns 4040, DB `location_id` is still non-null/stale.
- **DB staking status:** `GET /api/characters/staking-status?tokenIds=4040&source=db`. Expected after sync: `isStaked:false`, `dbLocationId:null`.
- **Chain-backed status + read-through sync:** `GET /api/characters/staking-status?tokenIds=4040&source=chain`. Expected from current chain: `isStaked:false`, `chainLocationId:null`, `syncSuccess:true`; this should also attempt to clear DB through `syncStakingState()`.
- **Explicit sync:** `POST /api/sync/staking` with JSON body `{ "tokenIds": [4040] }`. Expected: result for 4040 with `success:true`, `chainLocationId:"0"`, `locationId:null`.
- **Direct RPC:** read ERC721 `ownerOf(4040)`, WagdieWorld `wagdieIdToInfo(4040)`, and simulate WagdieWorld `unstakeWagdies([{ wagdieId: 4040 }])` from the owner. Current expected result is non-burn owner, `locationIdCur=0`, zero staker owner in WagdieWorld info, and simulation revert reason `Wagdie is not staked`.


## Investigation Log

### Phase 1 - Initial Assessment
**Hypothesis:** Token 4040 may be blocked by token-specific state (burned/dead/not owner/staked by another address) or by the broader staking/unstaking implementation bugs already identified.
**Findings:** Local static metadata does not mark 4040 as dead or burned; broader unstake bugs already exist in prior investigation.
**Evidence:** `public/metadata/characters/4040.json` lists `Health: Alive`, `Seared Token: None`, `Concord: None`, and `sheet.location: Unknown`. `docs/investigations/staking-unstaking-2026-05-06.md` identifies ID-mapping/sync and unstake chain-gating issues.
**Conclusion:** Need external/on-chain verification plus in-workspace trace of unstake eligibility and dead/burned semantics.

### Phase 4 - Oracle Synthesis and Final Spot-Check
**Hypothesis:** Pair findings point to DB/UI cache drift rather than token death/burn or active on-chain staking.
**Findings:** Oracle confirmed the token-specific root cause: chain truth says 4040 is unstaked, while normal map/staked-list state is DB-derived and can remain stale. A final direct viem simulation against `WagdieWorld.unstakeWagdies([{ wagdieId: 4040 }])` from owner `0x08DF3044b520Fd001c93e97041D3F257D8c0dB7B` reverted with `Wagdie is not staked`.
**Evidence:** Live RPC values in Background; DB-derived map/status paths in Investigator Findings; direct simulation output on 2026-05-07.
**Conclusion:** Confirmed.

### Phase 5 - Local Database Check
**Hypothesis:** The local database may contain the stale staked/burned row that would explain the map behavior.
**Findings:** Local container `wagdie-simplified-db-1` has token 4040 clean: `location_id = null`, `staker_address = null`, `burned = false`, owner `0x08df3044b520fd001c93e97041d3f257d8c0db7b`. The local schema does not include `wagdie_characters.staking_status`, so it is older than the current code/report expectation. Local `staking_events` contains a historical stake then unstake for token 4040 at chain location `2`; the latest local event is `unstake`. Local app API also reports `source=db` and `source=chain` staking status as `isStaked:false`, and `/api/characters?tab=staked&search=4040` returns no characters.
**Evidence:** Direct psql query on `wagdie_characters`; local API calls to `http://localhost:42069/api/characters/staking-status?tokenIds=4040&source=db`, `source=chain`, and `/api/characters?tab=staked&search=4040`.
**Conclusion:** The local database does **not** reproduce the stale staked/burned state. If the user sees 4040 as unstakeable, the stale row is likely in production/remote DB or in a different local Supabase stack, not this `wagdie-simplified-db-1` database.

### Phase 6 - Remote Database Data Copy
**Hypothesis:** The new server database had stale token state and needed to be refreshed from the local database on this computer.
**Findings:** Remote `wagdie-simplified-db-1` initially had token 4040 stale: `location_id = 2`, `staking_status = staked`. Dry-run comparison showed 1,663 important token-state diffs between local source and remote target. A remote backup was created at `/home/saltysloane/wagdie-backups/token-data-before-copy-20260507-085601.sql`. Local source data was then copied to the remote database: 6,666 `wagdie_characters` rows updated, 53 local `locations` rows upserted while preserving remote-only `chain_location_id`, and `staking_events` replaced with the 2,949-row local event history. Post-copy remote 4040 state is `location_id = null`, `staker_address = null`, `burned = false`, `staking_status = unstaked`.
**Evidence:** Remote psql post-copy counts: `wagdie_characters=6666`, `staking_events=2949`, `locations=54`. Remote app API `GET /api/characters/staking-status?tokenIds=4040&source=db` returns `isStaked:false`; `GET /api/characters?tab=staked&search=4040` returns zero characters. Follow-up diff check found `remaining_state_diffs = 0` for owner/staker/location/burned/staking_status between local source and remote target.
**Conclusion:** Remote token state has been reconciled from the local database; 4040 should no longer appear unstakeable on the new server.

## Root Cause
For token 4040, the root cause is **DB/UI cache drift from chain truth**.

Chain truth on 2026-05-07:
- `ownerOf(4040)` returns `0x08DF3044b520Fd001c93e97041D3F257D8c0dB7B`, not the zero or dead/burn address.
- `wagdieIdToInfo(4040)` returns `locationIdCur: 0` and owner zero, meaning WagdieWorld considers it unstaked.
- Simulating `unstakeWagdies([{ wagdieId: 4040 }])` from the owner reverts with `Wagdie is not staked`.

App/UI drift mechanism:
- `/api/characters?tab=staked` is DB-derived and includes any row where `location_id IS NOT NULL` (`lib/repositories/character/character-query-repository.ts:83-86`).
- Default staking status is DB-derived and sets `isStaked` from `location_id !== null` (`app/api/characters/staking-status/route.ts:114-146`).
- The map's staked-here list shows Unstake when `staker_address ?? owner_address` matches the connected wallet (`components/map/staking-sidebar/StakedHereList.tsx:49-53`, `95-103`).
- The unstake handler does not preflight chain staking status; it proceeds to contract simulation/write (`hooks/map/useMapStakingPanel.ts:410-424`; `hooks/useStaking.ts:601-634`; `lib/services/blockchain/staking.ts:257-284`).

Therefore, if production DB still has stale non-null `location_id` and/or stale staking ownership fields for token 4040, the map can offer Unstake even though the contract correctly rejects unstaking because 4040 is already unstaked.

## Eliminated Hypotheses
- **4040 is dead/burned:** Eliminated. Local metadata has `Health: Alive`, live `ownerOf(4040)` is a normal wallet address, and app burn logic only treats zero/dead addresses or explicit DB `burned=true` as burned (`lib/utils/blockchain.ts:19-35`).
- **4040 is currently staked on-chain:** Eliminated. `wagdieIdToInfo(4040).locationIdCur` is `0`, and direct unstake simulation reverts with `Wagdie is not staked`.
- **Approval is blocking unstake:** Eliminated for this incident. Live RPC showed `isApprovedForAll(owner, WagdieWorld)=true`; the failure reason is not-staked state.
- **Wrong ABI/address/function wiring:** Unlikely. Simulation reaches the expected WagdieWorld method and returns a semantic contract revert.
- **Metadata `Health` controls dead/staked state:** Eliminated. UI dead/fallen badges use normalized `character.burned` plus `location_id`, not the metadata Health trait.

## Recommendations
1. **Operational remediation:** Run a targeted production sync for token 4040: `POST /api/sync/staking` with `{ "tokenIds": [4040] }`, or call `GET /api/characters/staking-status?tokenIds=4040&source=chain` to trigger read-through sync.
2. **Verify DB after sync:** Query `wagdie_characters` for token 4040. Expected: `location_id = null`, `staker_address = null`, `staking_status = 'unstaked'`, `burned = false`.
3. **Verify API/UI after sync:** `GET /api/characters/staking-status?tokenIds=4040&source=db` should return `isStaked:false`, and `GET /api/characters?tab=staked&search=4040` should not return 4040.
4. **UX hardening:** Before executing Unstake, read chain status for that token (or request `source=chain`). If `locationIdCur === 0`, block the tx, show “Already unstaked on-chain; refreshing map state,” trigger `/api/sync/staking`, and refresh map/status data.
5. **Monitoring/backfill:** Run a one-time sync/backfill for tokens with non-null DB `location_id` to reconcile stale rows created by earlier staking sync bugs.

## Preventive Measures
- Treat DB staking state as a cache; add explicit chain refresh/self-heal paths before destructive or reverting actions like Unstake.
- Keep `dbLocationId` and `chainLocationId` separate in APIs/types and tests.
- Add tests for stale DB `location_id` with chain `locationIdCur=0` to ensure the UI syncs/blocks rather than submitting a reverting unstake.
- Monitor `/api/sync/staking` failures so stale rows do not linger silently in map views.
