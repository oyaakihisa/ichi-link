import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';

/**
 * サーバーサイド用 Supabase クライアント（service_role）
 *
 * RLSをバイパスできるため、バッチ処理やデータインポートに使用。
 * 通常のAPI Routeでは createAnonClient() を推奨。
 */
export function createServerClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase server environment variables. ' +
        'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
    );
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * サーバーサイド用 Supabase クライアント（anon）
 *
 * RLSが適用されるため、公開データの読み取りに使用。
 * API RouteやServer Componentでの通常の読み取りに推奨。
 */
export function createAnonClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
        'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    );
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// シングルトンインスタンス（サーバーサイドでの再利用）
let serverClientInstance: SupabaseClient<Database> | null = null;
let anonClientInstance: SupabaseClient<Database> | null = null;

/**
 * シングルトン版サーバークライアントを取得
 */
export function getServerClient(): SupabaseClient<Database> {
  if (!serverClientInstance) {
    serverClientInstance = createServerClient();
  }
  return serverClientInstance;
}

/**
 * シングルトン版匿名クライアントを取得（RLS適用）
 */
export function getAnonClient(): SupabaseClient<Database> {
  if (!anonClientInstance) {
    anonClientInstance = createAnonClient();
  }
  return anonClientInstance;
}
