# Feature Specification: Full Eliza SDK Persona Editor

**Feature Branch**: `017-eliza-persona-editor`
**Created**: 2025-12-03
**Status**: Draft
**Input**: User description: "I want to make sure AI personas can be edited to the fullest extent that the eliza-sdk allows for."

## Clarifications

### Session 2025-12-03

- Q: What should happen to the existing `personality` field when `bio` array is introduced? → A: Replace `personality` with `bio` array (migrate existing data)
- Q: How should the many field sections be organized in the UI? → A: Tabbed interface grouping related fields (Identity, Behavior, Examples, Advanced)
- Q: What security constraints apply to knowledge document uploads? → A: Owner-only access, text files only (.txt, .md), server-side content scanning
- Q: If the SDK doesn't support certain fields, what's the fallback strategy? → A: Extend the SDK types and API to support missing fields (SDK is local package at ~/projects/eliza-editor)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Edit Character Bio & Lore (Priority: P1)

Character owners want to define rich biographical information and backstory elements for their AI persona using Eliza's bio and lore arrays, enabling more nuanced and varied AI responses.

**Why this priority**: Bio and lore are core identity fields in the Eliza character format that directly impact AI response quality and personality consistency. They enable "entropy" in responses by providing multiple snippets that can be randomly sampled.

**Independent Test**: Can be fully tested by editing a character's bio array and lore snippets, then chatting with the AI to verify varied but consistent personality responses.

**Acceptance Scenarios**:

1. **Given** an owner viewing their character's AI persona editor, **When** they access the Bio section, **Then** they can add, edit, and remove multiple bio snippets (each up to 500 characters, maximum 10 snippets)
2. **Given** an owner with an existing AI persona, **When** they add lore entries, **Then** they can manage up to 20 lore snippets that describe character history, facts, and unique traits
3. **Given** a character with bio and lore configured, **When** a user chats with the AI, **Then** the AI responses reflect the biographical information and lore naturally

---

### User Story 2 - Configure Topics & Adjectives (Priority: P1)

Character owners want to define their AI persona's areas of expertise and personality traits through topics and adjectives, improving conversation relevance and character consistency.

**Why this priority**: Topics and adjectives are essential for guiding AI behavior and ensuring the character responds appropriately within their domain of knowledge and personality style.

**Independent Test**: Can be fully tested by setting topics and adjectives for a character, then engaging in conversation to verify the AI stays on-topic and exhibits defined traits.

**Acceptance Scenarios**:

1. **Given** an owner configuring their AI persona, **When** they access the Topics section, **Then** they can add, edit, and remove up to 30 topics representing areas of interest/expertise
2. **Given** an owner in the AI persona editor, **When** they configure adjectives, **Then** they can define up to 20 personality trait keywords that influence AI behavior
3. **Given** a character with topics configured, **When** asked about an off-topic subject, **Then** the AI gracefully redirects or acknowledges its area of focus

---

### User Story 3 - Define Communication Style (Priority: P2)

Character owners want to configure distinct writing styles for different contexts (general, chat, posts) so their AI persona communicates consistently across all interaction types.

**Why this priority**: Style configuration enables platform-specific behavior customization, which becomes important when characters interact across multiple channels (direct chat, social posts).

**Independent Test**: Can be fully tested by configuring style rules for chat and post contexts, then verifying the AI adapts its communication appropriately.

**Acceptance Scenarios**:

1. **Given** an owner in the style configuration section, **When** they add "all" style guidelines, **Then** those rules apply universally to all AI outputs
2. **Given** an owner configuring chat-specific styles, **When** they add chat style rules, **Then** the AI follows those rules specifically in conversation contexts
3. **Given** an owner configuring post styles, **When** they add post style guidelines, **Then** the AI follows those rules when generating social media content

---

### User Story 4 - Add Post Examples (Priority: P2)

Character owners want to provide example social media posts that demonstrate their character's online voice, enabling the AI to generate authentic-sounding posts in their style.

**Why this priority**: Post examples complement message examples by covering social/broadcast communication patterns rather than conversational ones.

**Independent Test**: Can be fully tested by adding post examples and generating AI posts to verify style consistency.

**Acceptance Scenarios**:

1. **Given** an owner in the post examples section, **When** they add examples, **Then** they can input up to 20 example posts (each up to 280 characters for tweet format)
2. **Given** a character with post examples configured, **When** the AI generates social content, **Then** the output reflects the style and tone of the provided examples

---

### User Story 5 - Upload Knowledge Documents (Priority: P3)

Character owners want to provide reference documents that the AI can use for RAG (retrieval-augmented generation), enabling more accurate and knowledgeable responses.

**Why this priority**: Knowledge base integration is a powerful advanced feature but requires more complex infrastructure. It significantly enhances AI capability for domain-specific characters.

**Independent Test**: Can be fully tested by uploading a knowledge document and asking the AI questions that require that knowledge to answer correctly.

**Acceptance Scenarios**:

1. **Given** an owner in the knowledge section, **When** they upload a text document, **Then** the system processes and stores it for AI retrieval (up to 5 documents, 50KB each)
2. **Given** a character with knowledge documents, **When** asked a question covered by the documents, **Then** the AI provides accurate answers drawing from that knowledge
3. **Given** an owner viewing their knowledge documents, **When** they choose to remove a document, **Then** the document is deleted and no longer used by the AI

---

### User Story 6 - Import/Export Character Configuration (Priority: P3)

Character owners want to export their full AI persona configuration as a standard Eliza character file and import configurations from files, enabling backup, sharing, and migration.

**Why this priority**: Import/export enables portability and interoperability with other Eliza-compatible systems, valuable for power users and developers.

**Independent Test**: Can be fully tested by exporting a character config, making changes, then re-importing to verify all fields are preserved.

**Acceptance Scenarios**:

1. **Given** an owner with a configured AI persona, **When** they click Export, **Then** they receive a JSON file containing all editable fields in standard Eliza character format
2. **Given** an owner starting fresh or migrating, **When** they upload a valid Eliza character JSON file, **Then** all supported fields are populated into the editor
3. **Given** an owner importing a file with unsupported fields, **When** the import completes, **Then** supported fields are imported and unsupported fields are listed for user awareness

---

### Edge Cases

- What happens when a user tries to save with fields exceeding character limits?
  - System prevents save and highlights fields with validation errors
- How does system handle empty required fields (bio must have at least one entry)?
  - System shows inline validation message requiring at least one entry
- What happens if knowledge document upload fails mid-process?
  - System shows error message and preserves existing documents; user can retry
- How does system handle import of malformed JSON files?
  - System shows validation error with specific location of JSON syntax issue
- What happens when switching tabs with unsaved changes?
  - Draft is auto-saved to local storage; unsaved indicator remains visible
- How does system handle very long arrays (e.g., 100 topics)?
  - System enforces maximum counts and shows remaining capacity

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support editing all core Eliza character fields: bio (array), lore (array), adjectives (array), topics (array), style (object with all/chat/post arrays), postExamples (array), and knowledge (array)
- **FR-002**: System MUST validate all fields against defined character limits before allowing save
- **FR-003**: System MUST preserve existing messageExamples and systemPrompt editing functionality; existing `personality` field data MUST be migrated to the first `bio` array entry
- **FR-004**: System MUST support adding, editing, reordering, and removing items in all array fields
- **FR-005**: System MUST auto-save drafts to local storage to prevent accidental data loss
- **FR-006**: System MUST provide export functionality generating valid Eliza character JSON format
- **FR-007**: System MUST provide import functionality accepting valid Eliza character JSON files
- **FR-008**: System MUST validate imported files against Eliza character schema before applying
- **FR-009**: System MUST support knowledge document upload limited to text files (.txt, .md) with server-side content scanning; documents are accessible only to the character owner
- **FR-010**: System MUST sync bio/lore/topics/adjectives to the Eliza backend via the SDK's updateCharacter method
- **FR-011**: System MUST maintain backward compatibility with existing AI personas (existing fields remain editable)
- **FR-012**: System MUST show clear visual indicators for validation errors, unsaved changes, and field limits
- **FR-013**: System MUST restrict editing to character owners only (maintaining existing authorization model)
- **FR-014**: System MUST provide sensible defaults and helpful placeholder text for each field type
- **FR-015**: System MUST organize fields into a tabbed interface with four groups: Identity (bio, lore), Behavior (topics, adjectives, style), Examples (messageExamples, postExamples), and Advanced (systemPrompt, knowledge)

### Key Entities

- **AIPersonaConfig**: Extended character configuration containing all Eliza-supported fields (bio, lore, topics, adjectives, style, postExamples, knowledge, plus existing fields)
- **KnowledgeDocument**: Reference document with id, filename, content, and upload timestamp
- **StyleConfig**: Writing style rules organized by context (all, chat, post)
- **ExportedCharacter**: Standard Eliza character JSON format for import/export operations

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Character owners can configure 100% of supported Eliza character fields through the UI
- **SC-002**: AI responses demonstrate measurable improvement in personality consistency when bio/lore/adjectives are configured (qualitative user testing)
- **SC-003**: Users can complete full character configuration in under 15 minutes
- **SC-004**: Import/export round-trip preserves 100% of field data without loss
- **SC-005**: All form interactions provide feedback within 200ms (perceived instant)
- **SC-006**: Draft auto-save prevents data loss in 100% of accidental navigation scenarios
- **SC-007**: Validation errors are shown inline with clear, actionable messages

## Assumptions

- The backend Eliza system processes and uses additional character fields (bio, lore, topics, adjectives, style, postExamples) when generating responses
- Knowledge documents will be processed server-side for RAG integration
- Maximum field counts are reasonable defaults that can be adjusted based on backend capabilities
- The existing WAGDIE character data (name, backstory) continues to sync automatically

## Prerequisites

- **SDK Extension Required**: The local eliza-sdk package (~/projects/eliza-editor/packages/eliza-sdk) MUST be extended to support all standard Eliza character fields (bio, lore, topics, adjectives, style, postExamples, knowledge) before UI implementation begins

## Out of Scope

- Plugin configuration (requires backend plugin infrastructure)
- Custom templates beyond what the SDK supports
- Settings configuration (model selection, voice, etc.) - requires backend support
- Username configuration (requires social platform integration)
- Real-time collaboration on character editing
- Version history/rollback for character configurations
