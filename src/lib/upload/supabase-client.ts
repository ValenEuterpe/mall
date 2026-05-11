import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/env";

/**
 * Server-only Supabase client used for Storage uploads/deletes.
 *
 * Uses the service_role key, which bypasses RLS. Must never be imported into
 * client components — the file is unmarked ("use server" is not used because
 * we want this importable from any server module, including handlers and
 * background jobs).
 */
let cached: SupabaseClient | null = null;

export function getSupabaseStorage(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cached;
}

export function getStorageBucket(): string {
  return env.SUPABASE_STORAGE_BUCKET;
}
