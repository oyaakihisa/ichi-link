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
 * APIレスポンスのエラー型
 */
interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * APIレスポンスの成功型
 */
interface ApiSuccessResponse {
  coordinate: Coordinate;
  matchedAddress: string;
}

/**
 * ジオコーディングサービス
 * Yahoo!ジオコーダAPIを使用して住所→座標変換を行う（API Route経由）
 */
export class GeocodingService {
  private readonly apiEndpoint = '/api/geocode';
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

    const url = `${this.apiEndpoint}?address=${encodeURIComponent(normalizedAddress)}`;

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

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as ApiErrorResponse;
      const code = this.mapErrorCode(errorData.error?.code);
      throw new GeocodingError(code, errorData.error?.message || 'エラーが発生しました');
    }

    const successData = data as ApiSuccessResponse;
    return {
      coordinate: successData.coordinate,
      matchedAddress: successData.matchedAddress,
    };
  }

  /**
   * APIエラーコードをGeocodingErrorCodeにマッピング
   */
  private mapErrorCode(apiCode?: string): GeocodingErrorCode {
    switch (apiCode) {
      case 'NOT_FOUND':
      case 'INVALID_REQUEST':
        return 'NOT_FOUND';
      case 'NETWORK_ERROR':
        return 'NETWORK_ERROR';
      default:
        return 'API_ERROR';
    }
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
