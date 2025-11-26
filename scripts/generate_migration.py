import json
import datetime

INPUT_FILE = '/Users/t3rpz/projects/wagdie-simplified/wagdie.json'
OUTPUT_FILE = '/Users/t3rpz/projects/wagdie-simplified/supabase/migrations/20251125000000_import_wagdie_data.sql'
USERS_TABLE = 'wagdie_users'
CHARACTERS_TABLE = 'wagdie_characters'
CONTRACT_ADDRESS = '0x659a4bdaaacc62d2bd9cb18225d9c89b5b697a5a'

def timestamp_to_iso(ts):
    return datetime.datetime.fromtimestamp(ts / 1000.0).isoformat()

def escape_sql_string(s):
    if s is None:
        return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"

def main():
    print(f"Loading {INPUT_FILE}...")
    with open(INPUT_FILE, 'r') as f:
        data = json.load(f)

    users_sql = []
    characters_data = {}

    print("Processing data...")
    for key, value in data.items():
        if key.startswith('dev:logins/'):
            # Process User
            eth_address = key.split('/')[-1]
            timestamps = value.get('timestamps', [])
            if not timestamps:
                continue
            
            timestamps.sort()
            created_at = timestamp_to_iso(timestamps[0])
            last_login_at = timestamp_to_iso(timestamps[-1])
            login_count = len(timestamps)

            sql = f"INSERT INTO {USERS_TABLE} (eth_address, login_count, created_at, last_login_at) VALUES ({escape_sql_string(eth_address)}, {login_count}, {escape_sql_string(created_at)}, {escape_sql_string(last_login_at)}) ON CONFLICT (eth_address) DO UPDATE SET login_count = EXCLUDED.login_count, last_login_at = EXCLUDED.last_login_at;"
            users_sql.append(sql)

        elif key.startswith('dev:character_sheets/'):
            # Process Character Sheet
            token_id = int(key.split('/')[-1])
            if token_id not in characters_data:
                characters_data[token_id] = {'sheet': {}, 'metadata': {}}
            characters_data[token_id]['sheet'] = value

        elif key.startswith('dev:metadata/'):
            # Process Metadata
            token_id = int(key.split('/')[-1])
            if token_id not in characters_data:
                characters_data[token_id] = {'sheet': {}, 'metadata': {}}
            characters_data[token_id]['metadata'] = value

    characters_sql = []
    for token_id, data in characters_data.items():
        sheet = data['sheet']
        metadata = data['metadata']
        
        # Merge metadata into sheet for the 'metadata' column, or vice versa
        # The schema has a 'metadata' JSONB column.
        # We should put the combined data there, but also extract specific fields if needed.
        # Schema: token_id, contract_address, owner_address, metadata, burned, infected, location_id
        
        combined_metadata = {**metadata, **sheet}
        
        # Extract location if present in sheet
        location_id = sheet.get('location')
        if location_id == "Unknown":
            location_id = None
        
        # Check for burned/infected status if available (not explicitly in the JSON snippet seen, but maybe in attributes)
        burned = False
        infected = False
        
        # Serialize metadata to JSON string
        metadata_json = json.dumps(combined_metadata).replace("'", "''")
        
        sql = f"INSERT INTO {CHARACTERS_TABLE} (token_id, contract_address, metadata, location_id, burned, infected) VALUES ({token_id}, {escape_sql_string(CONTRACT_ADDRESS)}, '{metadata_json}', {escape_sql_string(location_id)}, {str(burned).upper()}, {str(infected).upper()}) ON CONFLICT (contract_address, token_id) DO UPDATE SET metadata = EXCLUDED.metadata, location_id = EXCLUDED.location_id;"
        characters_sql.append(sql)

    print(f"Generating SQL file with {len(users_sql)} users and {len(characters_sql)} characters...")
    
    # Read the schema creation SQL
    schema_sql = """
-- WAGDIE Data Tables
-- Create tables if they don't exist

CREATE TABLE IF NOT EXISTS wagdie_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eth_address TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ DEFAULT NOW(),
  login_count INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_wagdie_users_eth_address ON wagdie_users(eth_address);

CREATE TABLE IF NOT EXISTS wagdie_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id INTEGER NOT NULL,
  contract_address TEXT NOT NULL,
  owner_address TEXT,
  metadata JSONB,
  burned BOOLEAN DEFAULT FALSE,
  infected BOOLEAN DEFAULT FALSE,
  location_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contract_address, token_id)
);

CREATE INDEX IF NOT EXISTS idx_wagdie_characters_token_id ON wagdie_characters(token_id);
CREATE INDEX IF NOT EXISTS idx_wagdie_characters_owner ON wagdie_characters(owner_address);
CREATE INDEX IF NOT EXISTS idx_wagdie_characters_burned ON wagdie_characters(burned);
CREATE INDEX IF NOT EXISTS idx_wagdie_characters_infected ON wagdie_characters(infected);
CREATE INDEX IF NOT EXISTS idx_wagdie_characters_location ON wagdie_characters(location_id);

"""
    
    with open(OUTPUT_FILE, 'w') as f:
        f.write("-- Migration generated from wagdie.json\n")
        f.write("-- Creates tables and imports all WAGDIE data\n\n")
        f.write(schema_sql)
        f.write("\n-- Users\n")
        for sql in users_sql:
            f.write(sql + "\n")
        
        f.write("\n-- Characters\n")
        for sql in characters_sql:
            f.write(sql + "\n")

    print(f"Done! Written to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
