# Research: Full Eliza SDK Persona Editor

**Feature**: 017-eliza-persona-editor
**Date**: 2025-12-03

## Research Areas

### 1. Eliza Character File Format

**Decision**: Implement full Eliza character schema with all standard fields

**Rationale**: The Eliza character file format is well-documented and standardized. Supporting all fields ensures maximum compatibility and enables the full range of AI personality customization.

**Findings**:

From [ElizaOS Documentation](https://docs.elizaos.ai/agents/character-interface) and [characterfile repository](https://github.com/elizaOS/characterfile):

| Field | Type | Required | Max Items/Chars | Purpose |
|-------|------|----------|-----------------|---------|
| `name` | string | Yes | 100 chars | Character display name |
| `bio` | string[] | Yes | 10 items, 500 chars each | Biographical snippets (randomly sampled for entropy) |
| `lore` | string[] | Yes | 20 items, 500 chars each | History, facts, unique traits |
| `topics` | string[] | No | 30 items | Areas of interest/expertise |
| `adjectives` | string[] | No | 20 items | Personality trait keywords |
| `style.all` | string[] | No | 10 items | Universal writing guidelines |
| `style.chat` | string[] | No | 10 items | Chat-specific style rules |
| `style.post` | string[] | No | 10 items | Social media style rules |
| `messageExamples` | array[][] | No | 20 pairs | Conversation examples |
| `postExamples` | string[] | No | 20 items, 280 chars | Tweet/post examples |
| `systemPrompt` | string | No | 4000 chars | System-level behavior override |
| `knowledge` | object[] | No | 5 docs, 50KB each | RAG reference documents |

**Alternatives Considered**:
- Subset of fields only: Rejected - limits user customization
- Custom field format: Rejected - breaks Eliza compatibility

### 2. SDK Extension Strategy

**Decision**: Extend local SDK at `~/projects/eliza-editor/packages/eliza-sdk`

**Rationale**: The SDK is a local package (linked via `file:` protocol), making modifications feasible. This maintains type safety and SDK patterns rather than bypassing with direct API calls.

**Findings**:

Current SDK Character type (from `dist/types/character.d.ts`):
```typescript
interface Character {
  id: string;
  name: string;
  personality: string;  // Will be replaced by bio[]
  backstory: string;
  systemPrompt?: string;
  exampleMessages?: ExampleMessage[];
  createdAt: string;
  updatedAt: string;
}
```

Required additions:
```typescript
interface Character {
  // ... existing fields ...
  bio: string[];           // NEW: replaces personality
  lore: string[];          // NEW
  topics?: string[];       // NEW
  adjectives?: string[];   // NEW
  style?: CharacterStyle;  // NEW (type exists, needs export)
  postExamples?: string[]; // NEW
  knowledge?: KnowledgeDocument[]; // NEW
}

interface KnowledgeDocument {
  id: string;
  path: string;
  content: string;
}
```

**Alternatives Considered**:
- Direct API calls: Rejected - loses type safety
- Wait for official SDK update: Rejected - timeline unknown, local control preferred

### 3. personality → bio Migration

**Decision**: One-time migration of existing `personality` content to `bio[0]`

**Rationale**: Maintains user data while transitioning to the new array-based format. Migration runs on first save after update.

**Migration Logic**:
```typescript
function migratePersonalityToBio(character: LegacyCharacter): Character {
  return {
    ...character,
    bio: character.personality ? [character.personality] : [],
    personality: undefined, // Remove legacy field
  };
}
```

**Edge Cases**:
- Empty personality → empty bio array
- Very long personality (>500 chars) → truncate to 500 for bio[0], suggest user split
- Draft migration: Check localStorage for `personality` field, convert to `bio`

### 4. Tabbed Interface Patterns

**Decision**: 4-tab interface with clear groupings

**Rationale**: Groups related fields logically, reduces cognitive load, follows established UX patterns.

**Tab Organization**:

| Tab | Fields | Purpose |
|-----|--------|---------|
| Identity | bio, lore | Who the character is |
| Behavior | topics, adjectives, style | How they act |
| Examples | messageExamples, postExamples | Training data |
| Advanced | systemPrompt, knowledge | Power user features |

**Implementation Pattern**:
```tsx
const tabs = ['Identity', 'Behavior', 'Examples', 'Advanced'] as const;
type TabId = typeof tabs[number];

// State management
const [activeTab, setActiveTab] = useState<TabId>('Identity');

// Render
<TabNavigation tabs={tabs} active={activeTab} onChange={setActiveTab} />
{activeTab === 'Identity' && <IdentityTab {...props} />}
{activeTab === 'Behavior' && <BehaviorTab {...props} />}
// ...
```

### 5. Array Field Editor Component

**Decision**: Create reusable `ArrayFieldEditor` component for all array-based fields

**Rationale**: 7 of the new fields are arrays of strings. A generic component reduces duplication.

**Component API**:
```tsx
interface ArrayFieldEditorProps {
  label: string;
  description?: string;
  value: string[];
  onChange: (value: string[]) => void;
  maxItems: number;
  maxCharsPerItem: number;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
}
```

**Features**:
- Add new item (+ button)
- Edit existing item (inline input)
- Remove item (× button)
- Reorder items (drag-drop or up/down arrows)
- Show remaining capacity (e.g., "3/10 bio entries")
- Character counter per item

### 6. Knowledge Document Upload

**Decision**: Client-side file reading with server-side storage via SDK

**Rationale**: Text files are small enough for client-side processing. Server handles persistence and RAG integration.

**Constraints** (from spec clarification):
- File types: `.txt`, `.md` only
- Max size: 50KB per file
- Max files: 5 per character
- Access: Owner-only

**Upload Flow**:
1. User selects file via `<input type="file">`
2. Client validates type and size
3. Client reads content via `FileReader`
4. Client sends to backend via SDK
5. Backend scans content, stores, returns document ID
6. UI updates knowledge list

**Security Measures**:
- MIME type validation
- Extension validation
- Size limit enforcement
- Content scanning (backend)

### 7. Draft State Management

**Decision**: Extend existing localStorage draft pattern to include all new fields

**Rationale**: Current implementation already uses localStorage for draft persistence. Extension is straightforward.

**Updated Draft Structure**:
```typescript
interface DraftAIPersona {
  tokenId: string;
  // Identity
  bio?: string[];
  lore?: string[];
  // Behavior
  topics?: string[];
  adjectives?: string[];
  style?: CharacterStyle;
  // Examples
  exampleMessages?: ExampleMessage[];
  postExamples?: string[];
  // Advanced
  systemPrompt?: string;
  knowledge?: KnowledgeDocument[]; // IDs only, not content
  // Meta
  savedAt: string;
}
```

**Migration**: On load, if `personality` exists in draft, convert to `bio[0]`.

### 8. Validation Strategy

**Decision**: Zod schemas for runtime validation, TypeScript for compile-time

**Rationale**: Zod provides runtime validation with good error messages, integrates well with form libraries.

**Schema Structure**:
```typescript
const bioSchema = z.array(z.string().max(500)).max(10).min(1);
const loreSchema = z.array(z.string().max(500)).max(20);
const topicsSchema = z.array(z.string().max(50)).max(30);
const adjectivesSchema = z.array(z.string().max(30)).max(20);
const styleSchema = z.object({
  all: z.array(z.string().max(200)).max(10).optional(),
  chat: z.array(z.string().max(200)).max(10).optional(),
  post: z.array(z.string().max(200)).max(10).optional(),
});
const postExamplesSchema = z.array(z.string().max(280)).max(20);

const aiPersonaSchema = z.object({
  bio: bioSchema,
  lore: loreSchema,
  topics: topicsSchema.optional(),
  adjectives: adjectivesSchema.optional(),
  style: styleSchema.optional(),
  messageExamples: messageExamplesSchema.optional(),
  postExamples: postExamplesSchema.optional(),
  systemPrompt: z.string().max(4000).optional(),
  knowledge: knowledgeSchema.optional(),
});
```

## Summary

All research questions resolved. Key decisions:

1. **Full Eliza schema** with documented field limits
2. **SDK extension** in local package before UI work
3. **Migration** of `personality` → `bio[0]` on first save
4. **4-tab interface** (Identity, Behavior, Examples, Advanced)
5. **Reusable ArrayFieldEditor** component for 7 array fields
6. **Client-side upload** with server storage for knowledge docs
7. **Extended draft structure** in localStorage
8. **Zod validation** for all fields
