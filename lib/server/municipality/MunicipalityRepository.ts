import { getAnonClient } from '@/lib/server/db/supabase';
import { toMunicipality, type Municipality } from '@/lib/types/municipality';
import type { MunicipalityRow } from '@/lib/types/database';

/**
 * 市町村マスタリポジトリ（サーバーサイド・読み取り専用）
 *
 * RLS により is_public=true の市町村のみ取得可能。
 * 更新操作は service_role を使用する別のリポジトリで行う。
 */
export class MunicipalityRepository {
  private supabase = getAnonClient();

  /**
   * スラッグから市町村を取得
   * RLS により is_public=false の市町村は取得不可（null を返す）
   */
  async getMunicipality(
    prefectureSlug: string,
    municipalitySlug: string
  ): Promise<Municipality | null> {
    const { data, error } = await this.supabase
      .from('municipalities')
      .select('*')
      .eq('prefecture_slug', prefectureSlug)
      .eq('municipality_slug', municipalitySlug)
      .single();

    if (error || !data) {
      return null;
    }

    return toMunicipality(data);
  }

  /**
   * 都道府県内の市町村一覧を取得
   * RLS により is_public=true の市町村のみ
   */
  async getMunicipalitiesByPrefecture(prefectureSlug: string): Promise<Municipality[]> {
    const { data, error } = await this.supabase
      .from('municipalities')
      .select('*')
      .eq('prefecture_slug', prefectureSlug)
      .order('municipality_slug');

    if (error || !data) {
      return [];
    }

    return data.map(toMunicipality);
  }

  /**
   * 公開中の全市町村を取得（generateStaticParams 用）
   * RLS により is_public=true の市町村のみ返却
   */
  async getPublicMunicipalities(): Promise<Municipality[]> {
    const { data, error } = await this.supabase
      .from('municipalities')
      .select('*')
      .order('prefecture_slug')
      .order('municipality_slug');

    if (error || !data) {
      return [];
    }

    return data.map(toMunicipality);
  }

  /**
   * インデックス対象の市町村を取得（sitemap 生成用）
   * RLS により is_public=true が前提、さらに is_indexed=true でフィルタ
   */
  async getIndexedMunicipalities(): Promise<Municipality[]> {
    const { data, error } = await this.supabase
      .from('municipalities')
      .select('*')
      .eq('is_indexed', true)
      .order('prefecture_slug')
      .order('municipality_slug');

    if (error || !data) {
      return [];
    }

    return data.map(toMunicipality);
  }

  /**
   * 都道府県スラッグの一覧を取得
   * RLS により is_public=true の市町村が属する都道府県のみ
   */
  async getPublicPrefectureSlugs(): Promise<string[]> {
    // 型推論が壊れる場合があるため、明示的な型アノテーションを使用
    const { data, error } = (await this.supabase
      .from('municipalities')
      .select('*')
      .order('prefecture_slug')) as { data: MunicipalityRow[] | null; error: unknown };

    if (error || !data) {
      return [];
    }

    // 重複を除去
    const slugs = [...new Set(data.map((row) => row.prefecture_slug))];
    return slugs;
  }
}

// シングルトンインスタンス
let instance: MunicipalityRepository | null = null;

/**
 * MunicipalityRepository のシングルトンインスタンスを取得
 */
export function getMunicipalityRepository(): MunicipalityRepository {
  if (!instance) {
    instance = new MunicipalityRepository();
  }
  return instance;
}
