-- Tracks WAGDIE tokenId/persona records against hosted official ElizaOS agents.
-- WAGDIE persona DTOs remain canonical; this table only records migration/sync state.

CREATE TABLE IF NOT EXISTS eliza_persona_migration_links (
  token_id TEXT PRIMARY KEY CHECK (
    token_id ~ '^[0-9]+$'
    AND token_id::INTEGER BETWEEN 0 AND 6666
  ),
  legacy_character_id TEXT,
  official_agent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'error')),
  last_error TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE eliza_persona_migration_links IS 'Migration state linking WAGDIE token ids and legacy/custom Eliza character records to hosted official ElizaOS agents.';
COMMENT ON COLUMN eliza_persona_migration_links.token_id IS 'WAGDIE character token id stored as text to match Eliza externalId usage.';
COMMENT ON COLUMN eliza_persona_migration_links.legacy_character_id IS 'Legacy/custom Eliza character record id, when available.';
COMMENT ON COLUMN eliza_persona_migration_links.official_agent_id IS 'Hosted official ElizaOS agent id, when created or discovered.';
COMMENT ON COLUMN eliza_persona_migration_links.status IS 'Last official persona sync result for this token id.';
COMMENT ON COLUMN eliza_persona_migration_links.last_error IS 'Last official shadow-write error, route-safe and non-secret.';

CREATE INDEX IF NOT EXISTS idx_eliza_persona_migration_links_status_updated
  ON eliza_persona_migration_links(status, updated_at DESC);

ALTER TABLE eliza_persona_migration_links ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE eliza_persona_migration_links FROM anon, authenticated;
GRANT ALL ON TABLE eliza_persona_migration_links TO service_role;

DROP POLICY IF EXISTS service_role_all_eliza_persona_migration_links ON eliza_persona_migration_links;
CREATE POLICY service_role_all_eliza_persona_migration_links
  ON eliza_persona_migration_links
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_eliza_persona_migration_links_updated_at ON eliza_persona_migration_links;
CREATE TRIGGER update_eliza_persona_migration_links_updated_at
  BEFORE UPDATE ON eliza_persona_migration_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
