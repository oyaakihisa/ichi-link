import { getAnonClient } from '@/lib/server/db/supabase';
import { toMunicipalityLayerStatus, type MunicipalityLayerStatus } from '@/lib/types/municipality';
import type { MunicipalityLayerStatusRow } from '@/lib/types/database';
import type { POIType } from '@/lib/types/poi';

/**
 * 市町村別レイヤー状態リポジトリ（サーバーサイド・読み取り専用）
 *
 * RLS により公開市町村に属するレイヤー状態のみ取得可能。
 * 更新操作は service_role を使用するバッチ処理で行う。
 */
export class MunicipalityLayerStatusRepository {
  private supabase = getAnonClient();

  /**
   * 市町村の特定レイヤー状態を取得
   */
  async getLayerStatus(
    jisCode: string,
    layerType: POIType
  ): Promise<MunicipalityLayerStatus | null> {
    const { data, error } = await this.supabase
      .from('municipality_layer_statuses')
      .select('*')
      .eq('municipality_jis_code', jisCode)
      .eq('layer_type', layerType)
      .single();

    if (error || !data) {
      return null;
    }

    return toMunicipalityLayerStatus(data);
  }

  /**
   * 市町村の全レイヤー状態を取得
   */
  async getAllLayerStatuses(jisCode: string): Promise<MunicipalityLayerStatus[]> {
    const { data, error } = await this.supabase
      .from('municipality_layer_statuses')
      .select('*')
      .eq('municipality_jis_code', jisCode)
      .order('layer_type');

    if (error || !data) {
      return [];
    }

    return data.map(toMunicipalityLayerStatus);
  }

  /**
   * 市町村の最新インポート日時を取得
   * 全レイヤーの lastImportedAt から最新値を返す
   * sitemap の lastModified やページ上の「最終更新日」に使用
   */
  async getLatestImportedAt(jisCode: string): Promise<Date | null> {
    // .not() フィルタにより型推論が壊れるため、明示的な型アノテーションを使用
    const { data, error } = (await this.supabase
      .from('municipality_layer_statuses')
      .select('*')
      .eq('municipality_jis_code', jisCode)
      .not('last_imported_at', 'is', null)
      .order('last_imported_at', { ascending: false })
      .limit(1)
      .single()) as { data: MunicipalityLayerStatusRow | null; error: unknown };

    if (error || !data?.last_imported_at) {
      return null;
    }

    return new Date(data.last_imported_at);
  }

  /**
   * 利用可能なレイヤー状態のみを取得
   */
  async getAvailableLayerStatuses(jisCode: string): Promise<MunicipalityLayerStatus[]> {
    const { data, error } = await this.supabase
      .from('municipality_layer_statuses')
      .select('*')
      .eq('municipality_jis_code', jisCode)
      .eq('is_available', true)
      .order('layer_type');

    if (error || !data) {
      return [];
    }

    return data.map(toMunicipalityLayerStatus);
  }
}

// シングルトンインスタンス
let instance: MunicipalityLayerStatusRepository | null = null;

/**
 * MunicipalityLayerStatusRepository のシングルトンインスタンスを取得
 */
export function getMunicipalityLayerStatusRepository(): MunicipalityLayerStatusRepository {
  if (!instance) {
    instance = new MunicipalityLayerStatusRepository();
  }
  return instance;
}
