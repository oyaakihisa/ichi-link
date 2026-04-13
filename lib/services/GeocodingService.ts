import { Coordinate } from '@/lib/types';

/**
 * ジオコーディング結果
 */
export interface GeocodingResult {
  /** WGS84座標 */
  coordinate: Coordinate;
  /** マッチした住所文字列 */
  matchedAddress: string;
}

/**
 * ジオコーディングエラーコード
 */
export type GeocodingErrorCode = 'NOT_FOUND' | 'NETWORK_ERROR' | 'API_ERROR';

/**
 * ジオコーディングエラー
 */
export class GeocodingError extends Error {
  readonly code: GeocodingErrorCode;

  constructor(code: GeocodingErrorCode, message: string) {
    super(message);
    this.name = 'GeocodingError';
    this.code = code;
  }
}

/**
 * 国土地理院APIのレスポンス型
 */
interface GsiApiResponse {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'Point';
      coordinates: [number, number]; // [longitude, latitude]
    };
    properties: {
      title: string;
    };
  }>;
}

/**
 * ジオコーディングサービス
 * 国土地理院 地名検索APIを使用して住所→座標変換を行う
 */
export class GeocodingService {
  private readonly apiEndpoint =
    'https://msearch.gsi.go.jp/address-search/AddressSearch';
  private readonly timeoutMs: number;

  constructor(timeoutMs: number = 10000) {
    this.timeoutMs = timeoutMs;
  }

  /**
   * 住所を座標に変換する
   * @param address 住所文字列
   * @returns ジオコーディング結果
   * @throws {GeocodingError} 変換に失敗した場合
   */
  async geocode(address: string): Promise<GeocodingResult> {
    const normalizedAddress = this.normalizeAddress(address);

    if (!normalizedAddress) {
      throw new GeocodingError('NOT_FOUND', '住所を入力してください');
    }

    const url = `${this.apiEndpoint}?q=${encodeURIComponent(normalizedAddress)}&limit=1`;

    let response: Response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new GeocodingError('NETWORK_ERROR', '接続がタイムアウトしました');
      }
      throw new GeocodingError(
        'NETWORK_ERROR',
        'ネットワークエラーが発生しました'
      );
    }

    if (!response.ok) {
      throw new GeocodingError(
        'API_ERROR',
        `APIエラーが発生しました（${response.status}）`
      );
    }

    let data: GsiApiResponse;
    try {
      data = await response.json();
    } catch {
      throw new GeocodingError('API_ERROR', 'APIレスポンスの解析に失敗しました');
    }

    if (!data.features || data.features.length === 0) {
      throw new GeocodingError(
        'NOT_FOUND',
        '指定された住所が見つかりませんでした'
      );
    }

    const feature = data.features[0];
    const [longitude, latitude] = feature.geometry.coordinates;

    return {
      coordinate: {
        latitude: Math.round(latitude * 1000000) / 1000000,
        longitude: Math.round(longitude * 1000000) / 1000000,
      },
      matchedAddress: feature.properties.title,
    };
  }

  /**
   * 住所を正規化する
   * - 全角数字→半角数字
   * - 前後の空白を除去
   * @param address 住所文字列
   * @returns 正規化された住所文字列
   */
  private normalizeAddress(address: string): string {
    return address
      .trim()
      .replace(/[０-９]/g, (char) =>
        String.fromCharCode(char.charCodeAt(0) - 0xfee0)
      );
  }
}
