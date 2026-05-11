-- Maps public WAGDIE conversation ids to hosted official ElizaOS messaging sessions.
-- Cross-wallet isolation is enforced by wallet_address/official_user_id lookup keys.

CREATE TABLE IF NOT EXISTS eliza_official_conversation_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL CHECK (wallet_address = lower(wallet_address)),
  official_user_id TEXT NOT NULL,
  token_id TEXT CHECK (
    token_id IS NULL OR (
      token_id ~ '^[0-9]+$'
      AND token_id::INTEGER BETWEEN 0 AND 6666
    )
  ),
  official_agent_id TEXT NOT NULL,
  official_session_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted', 'error')),
  message_count INTEGER NOT NULL DEFAULT 0 CHECK (message_count >= 0),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE eliza_official_conversation_links IS 'Wallet-scoped WAGDIE conversation ids mapped to official ElizaOS session ids.';
COMMENT ON COLUMN eliza_official_conversation_links.id IS 'Public WAGDIE conversation id returned through existing /api/eliza contracts.';
COMMENT ON COLUMN eliza_official_conversation_links.wallet_address IS 'Lowercased WAGDIE wallet address; used for route isolation and auditing.';
COMMENT ON COLUMN eliza_official_conversation_links.official_user_id IS 'Stable wallet-derived official ElizaOS user id.';
COMMENT ON COLUMN eliza_official_conversation_links.token_id IS 'WAGDIE character token id when known.';
COMMENT ON COLUMN eliza_official_conversation_links.official_agent_id IS 'Hosted official ElizaOS agent id for the character.';
COMMENT ON COLUMN eliza_official_conversation_links.official_session_id IS 'Hosted official ElizaOS messaging session id.';
COMMENT ON COLUMN eliza_official_conversation_links.message_count IS 'Best-effort local count used for list responses; details fetch official messages.';

CREATE INDEX IF NOT EXISTS idx_eliza_official_conversation_links_user_activity
  ON eliza_official_conversation_links(official_user_id, status, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_eliza_official_conversation_links_wallet_activity
  ON eliza_official_conversation_links(wallet_address, status, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_eliza_official_conversation_links_agent_activity
  ON eliza_official_conversation_links(official_agent_id, status, last_message_at DESC);

ALTER TABLE eliza_official_conversation_links ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE eliza_official_conversation_links FROM anon, authenticated;
GRANT ALL ON TABLE eliza_official_conversation_links TO service_role;

DROP POLICY IF EXISTS service_role_all_eliza_official_conversation_links ON eliza_official_conversation_links;
CREATE POLICY service_role_all_eliza_official_conversation_links
  ON eliza_official_conversation_links
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_eliza_official_conversation_links_updated_at ON eliza_official_conversation_links;
CREATE TRIGGER update_eliza_official_conversation_links_updated_at
  BEFORE UPDATE ON eliza_official_conversation_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
