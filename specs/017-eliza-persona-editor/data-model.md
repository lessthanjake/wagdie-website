# Data Model: Full Eliza SDK Persona Editor

**Feature**: 017-eliza-persona-editor
**Date**: 2025-12-03

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        AICharacter                               │
├─────────────────────────────────────────────────────────────────┤
│ id: string (UUID)                                               │
│ externalId: string (WAGDIE tokenId)                             │
│ name: string                                                    │
│ ─────────────────────────────────────────────────────────────── │
│ Identity Fields:                                                │
│   bio: string[]                    # 1-10 items, 500 chars each │
│   lore: string[]                   # 0-20 items, 500 chars each │
│ ─────────────────────────────────────────────────────────────── │
│ Behavior Fields:                                                │
│   topics: string[]                 # 0-30 items                 │
│   adjectives: string[]             # 0-20 items                 │
│   style: StyleConfig               # see below                  │
│ ─────────────────────────────────────────────────────────────── │
│ Example Fields:                                                 │
│   messageExamples: ExampleMessage[] # 0-20 pairs               │
│   postExamples: string[]           # 0-20 items, 280 chars each │
│ ─────────────────────────────────────────────────────────────── │
│ Advanced Fields:                                                │
│   systemPrompt: string | null      # 0-4000 chars              │
│   knowledge: KnowledgeDocument[]   # 0-5 documents              │
│ ─────────────────────────────────────────────────────────────── │
│ Metadata:                                                       │
│   createdAt: string (ISO 8601)                                  │
│   updatedAt: string (ISO 8601)                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      KnowledgeDocument                          │
├─────────────────────────────────────────────────────────────────┤
│ id: string (UUID)                                               │
│ characterId: string (FK → AICharacter.id)                       │
│ filename: string                   # Original filename          │
│ content: string                    # Extracted text content     │
│ size: number                       # Bytes, max 50KB            │
│ mimeType: string                   # text/plain or text/markdown│
│ uploadedAt: string (ISO 8601)                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        StyleConfig                              │
├─────────────────────────────────────────────────────────────────┤
│ all: string[]                      # 0-10 items, universal      │
│ chat: string[]                     # 0-10 items, chat-specific  │
│ post: string[]                     # 0-10 items, post-specific  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      ExampleMessage                             │
├─────────────────────────────────────────────────────────────────┤
│ userMessage: string                # 0-500 chars                │
│ assistantMessage: string           # 0-1000 chars               │
└─────────────────────────────────────────────────────────────────┘
```

## Entity Definitions

### AICharacter (Extended)

The core entity representing an AI persona linked to a WAGDIE character.

```typescript
interface AICharacter {
  // Identifiers
  id: string;                    // UUID, Eliza-generated
  externalId: string;            // WAGDIE token_id for linking
  name: string;                  // Max 100 chars

  // Identity (Tab 1)
  bio: string[];                 // Required, 1-10 items, 500 chars each
  lore: string[];                // Optional, 0-20 items, 500 chars each

  // Behavior (Tab 2)
  topics?: string[];             // 0-30 items, 50 chars each
  adjectives?: string[];         // 0-20 items, 30 chars each
  style?: StyleConfig;           // Writing style configuration

  // Examples (Tab 3)
  messageExamples?: ExampleMessage[]; // 0-20 pairs
  postExamples?: string[];       // 0-20 items, 280 chars each

  // Advanced (Tab 4)
  systemPrompt?: string;         // 0-4000 chars
  knowledge?: KnowledgeDocument[]; // 0-5 documents

  // Metadata
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
}
```

**Validation Rules**:
- `bio` must have at least 1 entry (required for character identity)
- `name` synced from WAGDIE character, cannot be empty
- All string array items must be non-empty strings
- `externalId` must be unique (one AI persona per WAGDIE character)

**State Transitions**:
- `Draft` → `Saved`: On successful backend sync
- `Saved` → `Draft`: On any field modification

### StyleConfig

Writing style configuration organized by context.

```typescript
interface StyleConfig {
  all?: string[];   // Universal guidelines, 0-10 items, 200 chars each
  chat?: string[];  // Chat-specific rules, 0-10 items, 200 chars each
  post?: string[];  // Post-specific rules, 0-10 items, 200 chars each
}
```

**Validation Rules**:
- At least one of `all`, `chat`, or `post` must have entries if style is defined
- Each item should be an actionable directive (e.g., "Use short sentences")

### KnowledgeDocument

Reference document for RAG integration.

```typescript
interface KnowledgeDocument {
  id: string;          // UUID, generated on upload
  characterId: string; // FK to AICharacter
  filename: string;    // Original filename
  content: string;     // Extracted text content
  size: number;        // File size in bytes
  mimeType: string;    // 'text/plain' or 'text/markdown'
  uploadedAt: string;  // ISO 8601
}
```

**Validation Rules**:
- `size` ≤ 51200 (50KB)
- `mimeType` must be 'text/plain' or 'text/markdown'
- `filename` must end with `.txt` or `.md`
- `content` must not be empty after trimming

**Lifecycle**:
- Created on file upload
- Deleted when owner removes document
- Deleted when parent AICharacter is deleted

### ExampleMessage (Existing)

Conversation example for training character voice.

```typescript
interface ExampleMessage {
  userMessage: string;      // Max 500 chars
  assistantMessage: string; // Max 1000 chars
}
```

### DraftAIPersona (Client-side)

Local storage draft structure for persistence.

```typescript
interface DraftAIPersona {
  tokenId: string;           // WAGDIE token ID

  // Identity
  bio?: string[];
  lore?: string[];

  // Behavior
  topics?: string[];
  adjectives?: string[];
  style?: StyleConfig;

  // Examples
  messageExamples?: ExampleMessage[];
  postExamples?: string[];

  // Advanced
  systemPrompt?: string;
  knowledgeIds?: string[];   // Only IDs, not content

  // Meta
  savedAt: string;           // ISO 8601

  // DEPRECATED - for migration only
  personality?: string;      // Legacy field, migrate to bio[0]
}
```

## Field Limits Summary

| Field | Max Items | Max Chars/Item | Required |
|-------|-----------|----------------|----------|
| name | 1 | 100 | Yes |
| bio | 10 | 500 | Yes (min 1) |
| lore | 20 | 500 | No |
| topics | 30 | 50 | No |
| adjectives | 20 | 30 | No |
| style.all | 10 | 200 | No |
| style.chat | 10 | 200 | No |
| style.post | 10 | 200 | No |
| messageExamples | 20 pairs | 500/1000 | No |
| postExamples | 20 | 280 | No |
| systemPrompt | 1 | 4000 | No |
| knowledge | 5 docs | 50KB | No |

## Migration: personality → bio

### Legacy Data Structure

```typescript
// OLD
interface LegacyAICharacter {
  personality: string | null;  // Max 2000 chars
  // ... other fields
}
```

### Migration Logic

```typescript
function migrateCharacter(legacy: LegacyAICharacter): AICharacter {
  const bio: string[] = [];

  if (legacy.personality) {
    // If personality exceeds 500 chars, truncate for bio[0]
    const truncated = legacy.personality.slice(0, 500);
    bio.push(truncated);

    // If truncated, user should be notified to split content
    if (legacy.personality.length > 500) {
      console.warn('Personality truncated. Consider splitting into multiple bio entries.');
    }
  }

  return {
    ...legacy,
    bio: bio.length > 0 ? bio : [''], // Ensure at least one entry
    personality: undefined, // Remove legacy field
  };
}
```

### Draft Migration

```typescript
function migrateDraft(draft: DraftAIPersona): DraftAIPersona {
  if (draft.personality && !draft.bio) {
    return {
      ...draft,
      bio: [draft.personality.slice(0, 500)],
      personality: undefined,
    };
  }
  return draft;
}
```

## Eliza Character Export Format

Standard Eliza character JSON for import/export compatibility.

```typescript
interface ElizaCharacterExport {
  name: string;
  bio: string[];
  lore: string[];
  topics?: string[];
  adjectives?: string[];
  style?: {
    all?: string[];
    chat?: string[];
    post?: string[];
  };
  messageExamples?: Array<Array<{
    user: string;
    content: { text: string };
  }>>;
  postExamples?: string[];
  systemPrompt?: string;
  knowledge?: Array<{
    id: string;
    path: string;
    content: string;
  }>;
}
```

**Note**: The `messageExamples` format in standard Eliza differs from our internal format. Conversion required on import/export.
