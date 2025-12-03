# Quickstart: Full Eliza SDK Persona Editor

**Feature**: 017-eliza-persona-editor
**Date**: 2025-12-03

## Prerequisites

Before starting implementation:

1. **SDK Extension** (separate task)
   - Location: `~/projects/eliza-editor/packages/eliza-sdk`
   - Add new types: `bio`, `lore`, `topics`, `adjectives`, `style`, `postExamples`, `knowledge`
   - Rebuild SDK: `npm run build`
   - Verify: `npm link` and test import in wagdie-simplified

2. **Environment**
   - Node.js 18+
   - npm or yarn
   - Running Eliza backend with extended API support

## Development Setup

```bash
# Navigate to project
cd ~/projects/wagdie-simplified

# Install dependencies (SDK is linked)
npm install

# Start development server
npm run dev
```

## Implementation Order

### Phase 1: SDK Extension (~/projects/eliza-editor)

```bash
cd ~/projects/eliza-editor/packages/eliza-sdk

# 1. Extend types/character.ts
# 2. Extend characters/validation.ts
# 3. Rebuild
npm run build

# 4. Link for local development
npm link

# Back in wagdie-simplified
cd ~/projects/wagdie-simplified
npm link @eliza/sdk
```

### Phase 2: Type Definitions (wagdie-simplified)

Update `types/eliza.ts`:

```typescript
// Add new field limits
export const FIELD_LIMITS = {
  // ... existing
  bio: 500,
  maxBioEntries: 10,
  lore: 500,
  maxLoreEntries: 20,
  topic: 50,
  maxTopics: 30,
  adjective: 30,
  maxAdjectives: 20,
  styleRule: 200,
  maxStyleRules: 10,
  postExample: 280,
  maxPostExamples: 20,
  maxKnowledgeDocs: 5,
  maxKnowledgeSize: 51200, // 50KB
} as const;
```

### Phase 3: Validation Schemas

Create `lib/eliza/validation.ts`:

```typescript
import { z } from 'zod';
import { FIELD_LIMITS } from '@/types/eliza';

export const bioSchema = z
  .array(z.string().max(FIELD_LIMITS.bio))
  .min(1)
  .max(FIELD_LIMITS.maxBioEntries);

export const loreSchema = z
  .array(z.string().max(FIELD_LIMITS.lore))
  .max(FIELD_LIMITS.maxLoreEntries);

// ... etc
```

### Phase 4: Migration Utility

Create `lib/eliza/migration.ts`:

```typescript
export function migratePersonalityToBio(
  personality: string | null
): string[] {
  if (!personality) return [''];
  return [personality.slice(0, 500)];
}

export function migrateDraft(draft: LegacyDraft): DraftAIPersona {
  if (draft.personality && !draft.bio) {
    return {
      ...draft,
      bio: migratePersonalityToBio(draft.personality),
      personality: undefined,
    };
  }
  return draft as DraftAIPersona;
}
```

### Phase 5: Shared Components

Create `components/characters/ai-editor/shared/`:

```typescript
// ArrayFieldEditor.tsx
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

// CharacterCounter.tsx
interface CharacterCounterProps {
  current: number;
  max: number;
}

// TabNavigation.tsx
interface TabNavigationProps {
  tabs: readonly string[];
  active: string;
  onChange: (tab: string) => void;
}
```

### Phase 6: Field Editors

Create `components/characters/ai-editor/editors/`:

```
BioEditor.tsx        # Uses ArrayFieldEditor
LoreEditor.tsx       # Uses ArrayFieldEditor
TopicsEditor.tsx     # Uses ArrayFieldEditor (chip style)
AdjectivesEditor.tsx # Uses ArrayFieldEditor (chip style)
StyleEditor.tsx      # Three ArrayFieldEditors (all/chat/post)
PostExamplesEditor.tsx # Uses ArrayFieldEditor
KnowledgeEditor.tsx  # File upload + list
```

### Phase 7: Tab Components

Create `components/characters/ai-editor/tabs/`:

```typescript
// IdentityTab.tsx
<BioEditor {...bioProps} />
<LoreEditor {...loreProps} />

// BehaviorTab.tsx
<TopicsEditor {...topicsProps} />
<AdjectivesEditor {...adjectivesProps} />
<StyleEditor {...styleProps} />

// ExamplesTab.tsx
<ExampleMessagesEditor {...messageProps} />  // Existing
<PostExamplesEditor {...postProps} />

// AdvancedTab.tsx
<SystemPromptEditor {...systemProps} />  // Existing
<KnowledgeEditor {...knowledgeProps} />
```

### Phase 8: Main Component Refactor

Update `AIPersonaTab.tsx`:

```typescript
const tabs = ['Identity', 'Behavior', 'Examples', 'Advanced'] as const;
type TabId = typeof tabs[number];

function AIPersonaTab({ tokenId, isOwner, ... }) {
  const [activeTab, setActiveTab] = useState<TabId>('Identity');

  // Extended state
  const [bio, setBio] = useState<string[]>([]);
  const [lore, setLore] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  // ... etc

  return (
    <Card>
      <TabNavigation tabs={tabs} active={activeTab} onChange={setActiveTab} />
      <CardContent>
        {activeTab === 'Identity' && <IdentityTab ... />}
        {activeTab === 'Behavior' && <BehaviorTab ... />}
        {activeTab === 'Examples' && <ExamplesTab ... />}
        {activeTab === 'Advanced' && <AdvancedTab ... />}
      </CardContent>
      <SaveBar hasChanges={hasUnsavedChanges} onSave={handleSave} />
    </Card>
  );
}
```

### Phase 9: Hook Extension

Update `hooks/useAICharacter.ts`:

```typescript
interface UseAICharacterReturn {
  aiCharacter: AICharacter | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  saveAICharacter: (data: UpdateAICharacterInput) => Promise<boolean>;
  // NEW
  uploadKnowledge: (file: File) => Promise<KnowledgeDocument | null>;
  deleteKnowledge: (docId: string) => Promise<boolean>;
  exportCharacter: () => Promise<ElizaCharacterExport | null>;
  importCharacter: (data: ElizaCharacterExport) => Promise<boolean>;
}
```

### Phase 10: API Routes

Create/update API routes:

```
app/api/eliza/characters/[tokenId]/route.ts     # GET, PUT
app/api/eliza/characters/[tokenId]/knowledge/route.ts  # GET, POST
app/api/eliza/characters/[tokenId]/knowledge/[docId]/route.ts  # DELETE
app/api/eliza/characters/[tokenId]/export/route.ts  # GET
app/api/eliza/characters/[tokenId]/import/route.ts  # POST
```

## Testing Checklist

- [ ] Bio array CRUD operations
- [ ] Lore array CRUD operations
- [ ] Topics array with chip UI
- [ ] Adjectives array with chip UI
- [ ] Style config (all three contexts)
- [ ] Post examples CRUD
- [ ] Knowledge upload (.txt, .md)
- [ ] Knowledge delete
- [ ] Export to Eliza JSON
- [ ] Import from Eliza JSON
- [ ] Migration of legacy personality field
- [ ] Draft auto-save with all fields
- [ ] Tab navigation state
- [ ] Validation error display
- [ ] Character counters
- [ ] Owner-only access enforcement

## Common Issues

### SDK Types Not Updating

```bash
# In eliza-editor
npm run build

# In wagdie-simplified
rm -rf node_modules/.cache
npm install
```

### Migration Not Running

Check localStorage key format: `wagdie-ai-draft-{tokenId}`

### Knowledge Upload Fails

- Verify file is .txt or .md
- Check file size < 50KB
- Ensure backend knowledge endpoint is implemented
