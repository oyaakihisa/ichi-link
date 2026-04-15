import type { Municipality, MunicipalityLayerStatus } from '@/lib/types/municipality';

/**
 * 市町村詳細APIレスポンス
 */
interface MunicipalityDetailResponse {
  municipality: Municipality;
  layerStatuses: MunicipalityLayerStatus[];
}

/**
 * 市町村一覧APIレスポンス
 */
interface MunicipalityListResponse {
  municipalities: Municipality[];
  total: number;
}

/**
 * 市町村サービス（クライアントサイド用）
 *
 * クライアントコンポーネントからAPIを呼び出すためのサービス。
 * Server Component や API Route では直接 Repository を使用する。
 */
export class MunicipalityService {
  /**
   * 市町村詳細を取得
   * @param prefectureSlug - 都道府県スラッグ（例: "ishikawa"）
   * @param municipalitySlug - 市町村スラッグ（例: "kanazawa"）
   * @returns 市町村情報とレイヤー状態、見つからない場合は null
   */
  async getMunicipality(
    prefectureSlug: string,
    municipalitySlug: string
  ): Promise<MunicipalityDetailResponse | null> {
    const response = await fetch(
      `/api/municipalities/${encodeURIComponent(prefectureSlug)}/${encodeURIComponent(municipalitySlug)}`
    );

    if (!response.ok) {
      return null;
    }

    return response.json();
  }

  /**
   * 都道府県内の市町村一覧を取得
   * @param prefectureSlug - 都道府県スラッグ
   * @returns 市町村配列
   */
  async getMunicipalitiesByPrefecture(prefectureSlug: string): Promise<Municipality[]> {
    const response = await fetch(
      `/api/municipalities?prefecture=${encodeURIComponent(prefectureSlug)}`
    );

    if (!response.ok) {
      return [];
    }

    const data: MunicipalityListResponse = await response.json();
    return data.municipalities;
  }

  /**
   * 公開中の全市町村を取得
   * @returns 市町村配列
   */
  async getPublicMunicipalities(): Promise<Municipality[]> {
    const response = await fetch('/api/municipalities');

    if (!response.ok) {
      return [];
    }

    const data: MunicipalityListResponse = await response.json();
    return data.municipalities;
  }
}

// シングルトンインスタンス
let instance: MunicipalityService | null = null;

/**
 * MunicipalityService のシングルトンインスタンスを取得
 */
export function getMunicipalityService(): MunicipalityService {
  if (!instance) {
    instance = new MunicipalityService();
  }
  return instance;
}
