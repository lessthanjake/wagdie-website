# Tasks: Full Eliza SDK Persona Editor

**Feature**: 017-eliza-persona-editor
**Generated**: 2025-12-03
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Data Model**: [data-model.md](./data-model.md)

## Summary

55 tasks across 9 phases implementing full Eliza SDK persona editor with 4-tab interface.

**User Stories**:
- US1 (P1): Edit Character Bio & Lore
- US2 (P1): Configure Topics & Adjectives
- US3 (P2): Define Communication Style
- US4 (P2): Add Post Examples
- US5 (P3): Upload Knowledge Documents
- US6 (P3): Import/Export Character Configuration

---

## Phase 1: SDK Extension (Prerequisites)

*Location: ~/projects/eliza-editor/packages/eliza-sdk*
*Must complete before UI work*

- [x] [T001] [P0] Extend `Character` type with bio array field in `src/types/character.ts`
- [x] [T002] [P0] Extend `Character` type with lore array field in `src/types/character.ts`
- [x] [T003] [P0] Extend `Character` type with topics array field in `src/types/character.ts`
- [x] [T004] [P0] Extend `Character` type with adjectives array field in `src/types/character.ts`
- [x] [T005] [P0] Add `CharacterStyle` type export (all/chat/post arrays) in `src/types/character.ts`
- [x] [T006] [P0] Extend `Character` type with postExamples array field in `src/types/character.ts`
- [x] [T007] [P0] Add `KnowledgeDocument` type with id, path, content fields in `src/types/character.ts`
- [x] [T008] [P0] Extend `CreateCharacterInput` with all new fields in `src/types/character.ts`
- [x] [T009] [P0] Extend `UpdateCharacterInput` with all new fields in `src/types/character.ts`
- [x] [T010] [P0] Add validation schemas for new fields in `src/characters/validation.ts`
- [x] [T011] [P0] Rebuild SDK and verify imports work: `npm run build && npm link`

**Dependency Graph**:
```
T001-T007 (parallel) → T008-T009 (parallel) → T010 → T011
```

---

## Phase 2: Foundation (wagdie-simplified)

*Core types, validation, and shared utilities*

- [x] [T012] [P0] Add FIELD_LIMITS constants for all new fields in `types/eliza.ts`
- [x] [T013] [P0] Add StyleConfig interface in `types/eliza.ts`
- [x] [T014] [P0] Add KnowledgeDocument interface in `types/eliza.ts`
- [x] [T015] [P0] Add DraftAIPersona interface with all fields in `types/eliza.ts`
- [x] [T016] [P0] Create Zod schemas for all fields in `lib/eliza/validation.ts`
- [x] [T017] [P0] Create migration utility (personality → bio) in `lib/eliza/migration.ts`
- [x] [T018] [P0] Add legacy draft migration function in `lib/eliza/migration.ts`

**Dependency Graph**:
```
T011 → T012-T015 (parallel) → T016-T018 (parallel)
```

---

## Phase 3: Shared Components

*Reusable UI building blocks*

- [x] [T019] [P0] Create CharacterCounter component in `components/characters/ai-editor/shared/CharacterCounter.tsx`
- [x] [T020] [P0] Create ArrayFieldEditor component in `components/characters/ai-editor/shared/ArrayFieldEditor.tsx`
- [x] [T021] [P0] Create TabNavigation component in `components/characters/ai-editor/shared/TabNavigation.tsx`
- [x] [T022] [P0] Export shared components from `components/characters/ai-editor/shared/index.ts`

**Dependency Graph**:
```
T016 → T019-T022 (parallel)
```

---

## Phase 4: User Story 1 - Edit Character Bio & Lore

*Identity tab implementation*

- [x] [T023] [P1] [US1] Create BioEditor component in `components/characters/ai-editor/editors/BioEditor.tsx`
- [x] [T024] [P1] [US1] Create LoreEditor component in `components/characters/ai-editor/editors/LoreEditor.tsx`
- [x] [T025] [P1] [US1] Create IdentityTab container in `components/characters/ai-editor/tabs/IdentityTab.tsx`
- [x] [T026] [P1] [US1] Add bio state and handlers to useAIPersonaEditor hook in `hooks/useAIPersonaEditor.ts`
- [x] [T027] [P1] [US1] Add lore state and handlers to useAIPersonaEditor hook in `hooks/useAIPersonaEditor.ts`
- [ ] [T028] [P1] [US1] Write unit tests for BioEditor in `__tests__/components/ai-editor/BioEditor.test.tsx`
- [ ] [T029] [P1] [US1] Write unit tests for LoreEditor in `__tests__/components/ai-editor/LoreEditor.test.tsx`

**Dependency Graph**:
```
T020-T022 → T023-T024 (parallel) → T025
T016 → T026-T027 (parallel)
T023 → T028
T024 → T029
```

---

## Phase 5: User Story 2 - Configure Topics & Adjectives

*Behavior tab implementation (part 1)*

- [x] [T030] [P1] [US2] Create TopicsEditor component (chip style) in `components/characters/ai-editor/editors/TopicsEditor.tsx`
- [x] [T031] [P1] [US2] Create AdjectivesEditor component (chip style) in `components/characters/ai-editor/editors/AdjectivesEditor.tsx`
- [x] [T032] [P1] [US2] Add topics state and handlers to useAIPersonaEditor hook in `hooks/useAIPersonaEditor.ts`
- [x] [T033] [P1] [US2] Add adjectives state and handlers to useAIPersonaEditor hook in `hooks/useAIPersonaEditor.ts`
- [ ] [T034] [P1] [US2] Write unit tests for TopicsEditor in `__tests__/components/ai-editor/TopicsEditor.test.tsx`
- [ ] [T035] [P1] [US2] Write unit tests for AdjectivesEditor in `__tests__/components/ai-editor/AdjectivesEditor.test.tsx`

**Dependency Graph**:
```
T020 → T030-T031 (parallel)
T016 → T032-T033 (parallel)
T030 → T034
T031 → T035
```

---

## Phase 6: User Story 3 - Define Communication Style

*Behavior tab implementation (part 2)*

- [x] [T036] [P2] [US3] Create StyleEditor component with all/chat/post sections in `components/characters/ai-editor/editors/StyleEditor.tsx`
- [x] [T037] [P2] [US3] Create BehaviorTab container in `components/characters/ai-editor/tabs/BehaviorTab.tsx`
- [x] [T038] [P2] [US3] Add style state and handlers to useAIPersonaEditor hook in `hooks/useAIPersonaEditor.ts`
- [ ] [T039] [P2] [US3] Write unit tests for StyleEditor in `__tests__/components/ai-editor/StyleEditor.test.tsx`

**Dependency Graph**:
```
T030-T031, T020 → T036 → T037
T016 → T038
T036 → T039
```

---

## Phase 7: User Story 4 - Add Post Examples

*Examples tab implementation*

- [x] [T040] [P2] [US4] Create PostExamplesEditor component in `components/characters/ai-editor/editors/PostExamplesEditor.tsx`
- [x] [T041] [P2] [US4] Create ExamplesTab container in `components/characters/ai-editor/tabs/ExamplesTab.tsx`
- [x] [T042] [P2] [US4] Add postExamples state and handlers to useAIPersonaEditor hook in `hooks/useAIPersonaEditor.ts`
- [ ] [T043] [P2] [US4] Write unit tests for PostExamplesEditor in `__tests__/components/ai-editor/PostExamplesEditor.test.tsx`

**Dependency Graph**:
```
T020 → T040 → T041
T016 → T042
T040 → T043
```

---

## Phase 8: User Story 5 - Upload Knowledge Documents

*Advanced tab implementation (part 1)*

- [x] [T044] [P3] [US5] Create useKnowledgeUpload hook in `hooks/useKnowledgeUpload.ts`
- [x] [T045] [P3] [US5] Create KnowledgeEditor component in `components/characters/ai-editor/editors/KnowledgeEditor.tsx`
- [x] [T046] [P3] [US5] Create AdvancedTab container in `components/characters/ai-editor/tabs/AdvancedTab.tsx`
- [x] [T047] [P3] [US5] Create knowledge API route GET/POST in `app/api/eliza/characters/[tokenId]/knowledge/route.ts`
- [x] [T048] [P3] [US5] Create knowledge delete API route in `app/api/eliza/characters/[tokenId]/knowledge/[documentId]/route.ts`
- [ ] [T049] [P3] [US5] Write unit tests for KnowledgeEditor in `__tests__/components/ai-editor/KnowledgeEditor.test.tsx`
- [ ] [T050] [P3] [US5] Write unit tests for useKnowledgeUpload hook in `__tests__/hooks/useKnowledgeUpload.test.ts`

**Dependency Graph**:
```
T016 → T044 → T045 → T046
T014 → T047-T048 (parallel)
T045 → T049
T044 → T050
```

---

## Phase 9: User Story 6 - Import/Export Character Configuration

*Import/export functionality*

- [x] [T051] [P3] [US6] Create export API route in `app/api/eliza/characters/[tokenId]/export/route.ts`
- [x] [T052] [P3] [US6] Create import API route in `app/api/eliza/characters/[tokenId]/import/route.ts`
- [x] [T053] [P3] [US6] Add exportCharacter and importCharacter methods to useAICharacter hook in `hooks/useAICharacter.ts`
- [x] [T054] [P3] [US6] Add import/export buttons to AIPersonaTab header in `components/characters/ai-editor/AIPersonaTab.tsx`
- [ ] [T055] [P3] [US6] Write unit tests for import/export in `__tests__/api/eliza/import-export.test.ts`

**Dependency Graph**:
```
T016 → T051-T052 (parallel) → T053 → T054
T051-T052 → T055
```

---

## Phase 10: Integration & Polish

*Main component refactor and final integration*

- [x] [T056] [P0] Refactor AIPersonaTab to use tabbed interface in `components/characters/ai-editor/AIPersonaTab.tsx`
- [x] [T057] [P0] Update exports in `components/characters/ai-editor/index.ts`
- [x] [T058] [P0] Extend draft auto-save to include all new fields in `hooks/useAIPersonaEditor.ts`
- [ ] [T059] [P0] Write integration tests for full tab flow in `__tests__/integration/ai-persona-editor.test.tsx`
- [ ] [T060] [P0] Manual testing of all 6 user stories per acceptance scenarios

**Dependency Graph**:
```
T025, T037, T041, T046 → T056 → T057
T056 → T058
T057 → T059 → T060
```

---

## Overall Dependency Graph

```
Phase 1 (SDK)
    │
    ▼
Phase 2 (Foundation)
    │
    ▼
Phase 3 (Shared Components)
    │
    ├──────────────────────────────────────────────┐
    │                                              │
    ▼                                              ▼
Phase 4 (US1: Bio/Lore)              Phase 5 (US2: Topics/Adjectives)
    │                                              │
    └──────────────────┬───────────────────────────┘
                       │
                       ▼
               Phase 6 (US3: Style)
                       │
                       ▼
               Phase 7 (US4: Post Examples)
                       │
                       ▼
               Phase 8 (US5: Knowledge)
                       │
                       ▼
               Phase 9 (US6: Import/Export)
                       │
                       ▼
               Phase 10 (Integration)
```

---

## Progress Tracking

| Phase | Tasks | Completed | Status |
|-------|-------|-----------|--------|
| Phase 1: SDK Extension | 11 | 11 | ✅ Complete |
| Phase 2: Foundation | 7 | 7 | ✅ Complete |
| Phase 3: Shared Components | 4 | 4 | ✅ Complete |
| Phase 4: US1 Bio/Lore | 7 | 5 | 🔄 In Progress (tests pending) |
| Phase 5: US2 Topics/Adjectives | 6 | 4 | 🔄 In Progress (tests pending) |
| Phase 6: US3 Style | 4 | 3 | 🔄 In Progress (tests pending) |
| Phase 7: US4 Post Examples | 4 | 3 | 🔄 In Progress (tests pending) |
| Phase 8: US5 Knowledge | 7 | 5 | 🔄 In Progress (tests pending) |
| Phase 9: US6 Import/Export | 5 | 4 | 🔄 In Progress (tests pending) |
| Phase 10: Integration | 5 | 3 | 🔄 In Progress (tests pending) |
| **Total** | **60** | **49** | **82%** |
