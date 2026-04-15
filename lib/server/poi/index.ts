/**
 * POIリポジトリのエクスポート
 *
 * 環境変数 NEXT_PUBLIC_SUPABASE_URL が設定されている場合は
 * Supabase + PostGIS 版を使用し、そうでなければ SQLite 版を使用する。
 *
 * 使用例:
 * ```typescript
 * import { findByBbox, findById } from '@/lib/server/poi';
 *
 * const pois = await findByBbox(bounds, types);
 * const detail = await findById(id);
 * ```
 */

import type { POIType, MapBounds, POIListItem, POIDetail } from '@/lib/types/poi';

// 型の再エクスポート
export type { POIListItem, POIDetail } from '@/lib/types/poi';

// 環境変数でSupabase使用を判定
const USE_SUPABASE = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

// 遅延初期化用の変数
let _supabaseRepo: typeof import('./SupabasePOIRepository') | null = null;
let _sqliteRepo: typeof import('./POIRepository') | null = null;

/**
 * bbox範囲でPOI一覧を取得する
 */
export async function findByBbox(
  bounds: MapBounds,
  types?: POIType[]
): Promise<POIListItem[]> {
  if (USE_SUPABASE) {
    if (!_supabaseRepo) {
      _supabaseRepo = await import('./SupabasePOIRepository');
    }
    return _supabaseRepo.findByBbox(bounds, types);
  } else {
    if (!_sqliteRepo) {
      _sqliteRepo = await import('./POIRepository');
    }
    return _sqliteRepo.findByBbox(bounds, types);
  }
}

/**
 * IDでPOI詳細を取得する
 */
export async function findById(id: string): Promise<POIDetail | null> {
  if (USE_SUPABASE) {
    if (!_supabaseRepo) {
      _supabaseRepo = await import('./SupabasePOIRepository');
    }
    return _supabaseRepo.findById(id);
  } else {
    if (!_sqliteRepo) {
      _sqliteRepo = await import('./POIRepository');
    }
    // SQLite版のPOIDetailRowをPOIDetailに変換
    const result = _sqliteRepo.findById(id);
    if (!result) return null;
    return {
      ...result,
      source: result.source ?? 'unknown',
    };
  }
}
