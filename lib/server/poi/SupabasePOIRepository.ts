import { getAnonClient } from '@/lib/server/db/supabase';
import type { Database } from '@/lib/types/database';
import type { POIType, MapBounds, POIListItem, POIDetail } from '@/lib/types/poi';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';

// RPC関数の戻り値型
type GetPOIsByBboxReturn = Database['public']['Functions']['get_pois_by_bbox']['Returns'];
type GetPOIDetailReturn = Database['public']['Functions']['get_poi_detail']['Returns'];

/**
 * Supabase + PostGIS を使用したPOIリポジトリ
 *
 * RPC関数を使用してbbox検索を実行し、GISTインデックスを活用した
 * 高速な空間検索を提供する。
 */
export class SupabasePOIRepository {
  private supabase = getAnonClient();

  /**
   * bbox範囲でPOI一覧を取得する
   * @param bounds 表示範囲
   * @param types 取得するPOI種別（指定なしの場合は全種別）
   * @param limit 最大件数（デフォルト: 1000）
   * @returns POI一覧（最小限フィールド）
   */
  async findByBbox(
    bounds: MapBounds,
    types?: POIType[],
    limit: number = 1000
  ): Promise<POIListItem[]> {
    const effectiveTypes = types && types.length > 0 ? types : ['aed', 'fireHydrant'];

    // Supabase RPCの型推論問題を回避するため明示的にキャスト
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await (this.supabase.rpc as any)('get_pois_by_bbox', {
      p_west: bounds.west,
      p_south: bounds.south,
      p_east: bounds.east,
      p_north: bounds.north,
      p_types: effectiveTypes,
      p_limit: limit,
    })) as PostgrestSingleResponse<GetPOIsByBboxReturn>;

    if (result.error) {
      console.error('Failed to fetch POIs by bbox:', result.error);
      return [];
    }

    if (!result.data) {
      return [];
    }

    return result.data.map((row) => ({
      id: row.id,
      type: row.type as POIType,
      name: row.name,
      latitude: row.latitude,
      longitude: row.longitude,
      address: row.address ?? undefined,
    }));
  }

  /**
   * IDでPOI詳細を取得する
   * @param id POI ID
   * @returns POI詳細（全フィールド）、見つからない場合はnull
   */
  async findById(id: string): Promise<POIDetail | null> {
    // Supabase RPCの型推論問題を回避するため明示的にキャスト
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await (this.supabase.rpc as any)('get_poi_detail', {
      p_id: id,
    })) as PostgrestSingleResponse<GetPOIDetailReturn>;

    if (result.error) {
      console.error('Failed to fetch POI detail:', result.error);
      return null;
    }

    if (!result.data || result.data.length === 0) {
      return null;
    }

    const row = result.data[0];

    return {
      id: row.id,
      type: row.type as POIType,
      name: row.name,
      latitude: row.latitude,
      longitude: row.longitude,
      address: row.address ?? undefined,
      detailText: row.detail_text ?? undefined,
      availabilityText: row.availability_text ?? undefined,
      childPadAvailable: row.child_pad_available ?? undefined,
      source: row.source ?? 'unknown',
      updatedAt: row.source_updated_at ?? undefined,
    };
  }
}

// シングルトンインスタンス
let instance: SupabasePOIRepository | null = null;

/**
 * SupabasePOIRepository のシングルトンインスタンスを取得
 */
export function getSupabasePOIRepository(): SupabasePOIRepository {
  if (!instance) {
    instance = new SupabasePOIRepository();
  }
  return instance;
}

/**
 * 関数形式のエクスポート（既存APIとの互換性用）
 */
export async function findByBbox(
  bounds: MapBounds,
  types?: POIType[]
): Promise<POIListItem[]> {
  return getSupabasePOIRepository().findByBbox(bounds, types);
}

export async function findById(id: string): Promise<POIDetail | null> {
  return getSupabasePOIRepository().findById(id);
}
