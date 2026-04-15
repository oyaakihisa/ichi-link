import type { POI, POIType, MapBounds, POIQueryOptions } from '@/lib/types';

/**
 * AEDモックデータ（東京駅周辺）
 */
const MOCK_AEDS: POI[] = [
  {
    id: 'aed-001',
    type: 'aed',
    name: '東京駅丸の内北口 AED',
    coordinate: { latitude: 35.6823, longitude: 139.7654 },
    address: '東京都千代田区丸の内1-9-1',
    availabilityText: '24時間',
    detailText: '改札内コンコース',
    source: 'mock',
  },
  {
    id: 'aed-002',
    type: 'aed',
    name: '新丸ビル1F AED',
    coordinate: { latitude: 35.6825, longitude: 139.7645 },
    address: '東京都千代田区丸の内1-5-1',
    availabilityText: '7:00-23:00',
    detailText: '1階インフォメーション横',
    source: 'mock',
  },
  {
    id: 'aed-003',
    type: 'aed',
    name: '丸の内オアゾ AED',
    coordinate: { latitude: 35.6833, longitude: 139.7650 },
    address: '東京都千代田区丸の内1-6-4',
    availabilityText: '10:00-21:00',
    detailText: '1階総合案内',
    source: 'mock',
  },
  {
    id: 'aed-004',
    type: 'aed',
    name: 'KITTE丸の内 AED',
    coordinate: { latitude: 35.6795, longitude: 139.7650 },
    address: '東京都千代田区丸の内2-7-2',
    availabilityText: '11:00-21:00',
    detailText: '1階エントランス',
    source: 'mock',
  },
  {
    id: 'aed-005',
    type: 'aed',
    name: '東京中央郵便局 AED',
    coordinate: { latitude: 35.6800, longitude: 139.7645 },
    address: '東京都千代田区丸の内2-7-2',
    availabilityText: '9:00-19:00（平日）',
    detailText: '1階窓口フロア',
    source: 'mock',
  },
];

/**
 * 消火栓モックデータ（東京駅周辺）
 */
const MOCK_FIRE_HYDRANTS: POI[] = [
  {
    id: 'fh-001',
    type: 'fireHydrant',
    name: '消火栓 丸の内1-9',
    coordinate: { latitude: 35.6818, longitude: 139.7660 },
    address: '東京都千代田区丸の内1-9',
    detailText: '地下式単口',
    source: 'mock',
  },
  {
    id: 'fh-002',
    type: 'fireHydrant',
    name: '消火栓 丸の内1-5',
    coordinate: { latitude: 35.6828, longitude: 139.7640 },
    address: '東京都千代田区丸の内1-5',
    detailText: '地下式単口',
    source: 'mock',
  },
  {
    id: 'fh-003',
    type: 'fireHydrant',
    name: '消火栓 丸の内1-6',
    coordinate: { latitude: 35.6835, longitude: 139.7655 },
    address: '東京都千代田区丸の内1-6',
    detailText: '地上式双口',
    source: 'mock',
  },
  {
    id: 'fh-004',
    type: 'fireHydrant',
    name: '消火栓 丸の内2-7',
    coordinate: { latitude: 35.6790, longitude: 139.7655 },
    address: '東京都千代田区丸の内2-7',
    detailText: '地下式単口',
    source: 'mock',
  },
  {
    id: 'fh-005',
    type: 'fireHydrant',
    name: '消火栓 丸の内2-4',
    coordinate: { latitude: 35.6805, longitude: 139.7635 },
    address: '東京都千代田区丸の内2-4',
    detailText: '地下式単口',
    source: 'mock',
  },
];

/**
 * すべてのモックPOIデータ
 */
const ALL_MOCK_POIS: POI[] = [...MOCK_AEDS, ...MOCK_FIRE_HYDRANTS];

/**
 * POIデータ取得・管理サービス
 * MVP段階ではモックデータを使用。将来的に外部APIに接続予定。
 */
export class POIService {
  private cache: Map<string, POI[]> = new Map();

  /**
   * キャッシュキーを生成
   */
  private getCacheKey(bounds: MapBounds, types: POIType[]): string {
    const boundsKey = `${bounds.north.toFixed(4)}_${bounds.south.toFixed(4)}_${bounds.east.toFixed(4)}_${bounds.west.toFixed(4)}`;
    const typesKey = types.sort().join(',');
    return `${boundsKey}:${typesKey}`;
  }

  /**
   * POIが表示範囲内にあるか判定
   */
  private isWithinBounds(poi: POI, bounds: MapBounds): boolean {
    const { latitude, longitude } = poi.coordinate;
    return (
      latitude >= bounds.south &&
      latitude <= bounds.north &&
      longitude >= bounds.west &&
      longitude <= bounds.east
    );
  }

  /**
   * 表示範囲内のPOIを取得
   * @param options 取得オプション（bounds, types, limit）
   * @returns 範囲内のPOI配列
   */
  async getPOIs(options: POIQueryOptions): Promise<POI[]> {
    const { bounds, types, limit } = options;
    const cacheKey = this.getCacheKey(bounds, types);

    // キャッシュチェック
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // モックデータからフィルタリング
    let pois = ALL_MOCK_POIS.filter(
      (poi) => types.includes(poi.type) && this.isWithinBounds(poi, bounds)
    );

    // 件数制限
    if (limit && pois.length > limit) {
      pois = pois.slice(0, limit);
    }

    // キャッシュに保存
    this.cache.set(cacheKey, pois);

    return pois;
  }

  /**
   * 単一POIの詳細を取得
   * @param id POI ID
   * @returns POI詳細、見つからない場合はnull
   */
  async getPOIDetail(id: string): Promise<POI | null> {
    const poi = ALL_MOCK_POIS.find((p) => p.id === id);
    return poi ?? null;
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
