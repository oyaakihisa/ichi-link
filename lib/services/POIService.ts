import type { POIType, POIListItem, POIDetail, MapBounds, POIQueryOptions } from '@/lib/types';

/**
 * POI一覧APIのレスポンス型
 */
interface POIListResponse {
  pois: POIListItem[];
  meta: {
    total: number;
    bbox: MapBounds;
    types: POIType[];
  };
}

/**
 * POIデータ取得・管理サービス
 * 自前API（/api/pois）を呼び出してPOIデータを取得する
 */
export class POIService {
  private cache: Map<string, POIListItem[]> = new Map();

  /**
   * キャッシュキーを生成
   */
  private getCacheKey(bounds: MapBounds, types: POIType[]): string {
    const boundsKey = `${bounds.north.toFixed(4)}_${bounds.south.toFixed(4)}_${bounds.east.toFixed(4)}_${bounds.west.toFixed(4)}`;
    const typesKey = types.sort().join(',');
    return `${boundsKey}:${typesKey}`;
  }

  /**
   * 表示範囲内のPOIを取得
   * @param options 取得オプション（bounds, types, limit）
   * @returns 範囲内のPOI配列（一覧用の最小限フィールド）
   */
  async getPOIs(options: POIQueryOptions): Promise<POIListItem[]> {
    const { bounds, types } = options;
    const cacheKey = this.getCacheKey(bounds, types);

    // キャッシュチェック
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // bboxパラメータを構築
    const bbox = `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`;
    const typesParam = types.join(',');

    const url = `/api/pois?bbox=${bbox}&types=${typesParam}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error('Failed to fetch POIs:', response.statusText);
      return [];
    }

    const data: POIListResponse = await response.json();

    // キャッシュに保存
    this.cache.set(cacheKey, data.pois);

    return data.pois;
  }

  /**
   * 単一POIの詳細を取得
   * @param id POI ID
   * @returns POI詳細（全フィールド）、見つからない場合はnull
   */
  async getPOIDetail(id: string): Promise<POIDetail | null> {
    const url = `/api/pois/${encodeURIComponent(id)}`;

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      console.error('Failed to fetch POI detail:', response.statusText);
      return null;
    }

    const data: POIDetail = await response.json();
    return data;
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * シングルトンインスタンス
 */
export const poiService = new POIService();
