# Implementation Plan: Full Eliza SDK Persona Editor

**Branch**: `017-eliza-persona-editor` | **Date**: 2025-12-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/017-eliza-persona-editor/spec.md`

## Summary

Extend the AI persona editor to support all standard Eliza character fields (bio, lore, topics, adjectives, style, postExamples, knowledge), replacing the current limited `personality` field approach. This requires SDK extension work first, followed by UI component development with a tabbed interface organization.

## Technical Context

**Language/Version**: TypeScript 5+, React 18+, Node.js 18+
**Primary Dependencies**: Next.js 15 (App Router), @eliza/sdk (local), wagmi v2, Tailwind CSS 3.4, Zod (validation)
**Storage**: Eliza backend (via SDK), localStorage (drafts), file upload (knowledge docs)
**Testing**: Jest, React Testing Library
**Target Platform**: Web (modern browsers)
**Project Type**: Web application (Next.js)
**Performance Goals**: <200ms form interaction feedback, <15 min full configuration time
**Constraints**: Owner-only editing, text files only for knowledge uploads, max field counts enforced
**Scale/Scope**: Extending existing AI persona editor with 8+ new field sections

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution file contains template placeholders only - no project-specific gates defined. Proceeding with standard best practices:

- [x] **Type Safety**: All new types defined with Zod schemas for runtime validation
- [x] **Backward Compatibility**: Existing `personality` data migrates to `bio[0]`
- [x] **Security**: Knowledge uploads restricted to .txt/.md, owner-only access
- [x] **Testing**: Component tests for all new editors

## Project Structure

### Documentation (this feature)

```text
specs/017-eliza-persona-editor/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
# Existing structure to extend

types/
└── eliza.ts                    # Extend with new Eliza fields

components/characters/ai-editor/
├── AIPersonaTab.tsx            # Refactor to tabbed interface
├── PersonalityEditor.tsx       # Replace with BioEditor
├── SystemPromptEditor.tsx      # Keep (moves to Advanced tab)
├── ExampleMessagesEditor.tsx   # Keep (moves to Examples tab)
├── index.ts                    # Update exports
│
├── tabs/                       # NEW: Tab container components
│   ├── IdentityTab.tsx         # bio, lore editors
│   ├── BehaviorTab.tsx         # topics, adjectives, style editors
│   ├── ExamplesTab.tsx         # messageExamples, postExamples
│   └── AdvancedTab.tsx         # systemPrompt, knowledge
│
├── editors/                    # NEW: Individual field editors
│   ├── BioEditor.tsx           # Array of bio snippets
│   ├── LoreEditor.tsx          # Array of lore entries
│   ├── TopicsEditor.tsx        # Array of topic strings
│   ├── AdjectivesEditor.tsx    # Array of adjective strings
│   ├── StyleEditor.tsx         # Style config (all/chat/post)
│   ├── PostExamplesEditor.tsx  # Array of post examples
│   └── KnowledgeEditor.tsx     # File upload + document list
│
└── shared/                     # NEW: Reusable components
    ├── ArrayFieldEditor.tsx    # Generic array manipulation
    ├── CharacterCounter.tsx    # Character limit indicator
    └── TabNavigation.tsx       # Tab switching UI

hooks/
├── useAICharacter.ts           # Extend to handle new fields
└── useKnowledgeUpload.ts       # NEW: Knowledge document upload

lib/eliza/
├── client.ts                   # May need extension for new endpoints
├── validation.ts               # NEW: Zod schemas for all fields
└── migration.ts                # NEW: personality → bio migration

# External dependency (separate repo)
~/projects/eliza-editor/packages/eliza-sdk/
├── src/types/character.ts      # Extend with full Eliza fields
├── src/characters/index.ts     # Extend updateCharacter method
└── src/characters/validation.ts # Add new field validation
```

**Structure Decision**: Extending existing web application structure. New components organized into tabs/, editors/, and shared/ subdirectories under existing ai-editor/ folder for maintainability.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| SDK Extension (separate repo) | SDK must support new fields before UI can use them | Direct API calls bypass type safety and SDK patterns |
| Tabbed interface | 8+ field sections require organization | Single page would be overwhelming (15+ scrollable sections) |

## Dependencies

### Prerequisite Work (SDK Extension)

The following must be completed in `~/projects/eliza-editor/packages/eliza-sdk` before UI implementation:

1. **Extend Character type** with: `bio`, `lore`, `topics`, `adjectives`, `style`, `postExamples`, `knowledge`
2. **Extend CreateCharacterInput/UpdateCharacterInput** with same fields
3. **Add CharacterStyle type** (already exists but not exported properly)
4. **Add KnowledgeDocument type** for knowledge array items
5. **Update validation schemas** for new fields
6. **Rebuild SDK** and verify wagdie-simplified can import new types

### Migration Strategy

1. **Data Migration**: Existing `personality` field content → `bio[0]` on first save
2. **Type Migration**: `AICharacter.personality` → `AICharacter.bio` (array)
3. **Draft Migration**: Existing localStorage drafts converted on load

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| SDK backend doesn't support new fields | High | Verify with backend team; fallback to local-only storage |
| Performance with large knowledge docs | Medium | Enforce 50KB limit, lazy loading, chunked upload |
| Complex tab state management | Low | Use controlled components, single source of truth |
