import type { SupabaseClient as SupabaseJsClient } from '@supabase/supabase-js';
import { getSupabase, getSupabaseAdmin } from '@/lib/supabase';

type RepositorySupabaseClient = SupabaseJsClient;

function hasSupabaseServiceRoleKey(): boolean {
  return Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.SERVICE_ROLE_KEY
  );
}

export function getRequiredSupabaseClient(operation: string): RepositorySupabaseClient {
  const client = getSupabase();

  if (!client) {
    throw new Error(
      `Supabase client not configured for '${operation}'. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).`
    );
  }

  return client as RepositorySupabaseClient;
}

export function getRequiredSupabaseAdminClient(operation: string): RepositorySupabaseClient {
  if (typeof window !== 'undefined' || !hasSupabaseServiceRoleKey()) {
    throw new Error(
      `Missing Supabase service role key for '${operation}'. Set SUPABASE_SERVICE_ROLE_KEY (recommended) or SUPABASE_SERVICE_KEY.`
    );
  }

  const client = getSupabaseAdmin();

  if (!client) {
    throw new Error(
      `Supabase admin client not configured for '${operation}'. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY (recommended) or SUPABASE_SERVICE_KEY.`
    );
  }

  return client as RepositorySupabaseClient;
}
