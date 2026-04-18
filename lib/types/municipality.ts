import type { POIType } from './poi';
import type { MunicipalityRow, MunicipalityLayerStatusRow } from './database';

/**
 * 市町村公開状態
 * isPublic: ページ公開可否（RLSで制御）
 * isIndexed: 検索エンジンインデックス可否
 */
export interface MunicipalityStatus {
  /** ページを公開対象にするか */
  isPublic: boolean;
  /** 検索エンジンの index 対象にするか */
  isIndexed: boolean;
}

/**
 * 市町村マップ設定
 */
export interface MunicipalityMapConfig {
  /** 地図中心座標 */
  center: {
    lat: number;
    lng: number;
  };
  /** 表示範囲 */
  bbox: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  /** 初期ズームレベル */
  initialZoom: number;
}

/**
 * 市町村レイヤー設定
 */
export interface MunicipalityLayerConfig {
  /** 初期表示するレイヤー */
  defaultLayers: POIType[];
  /** 利用可能なレイヤー */
  availableLayers: POIType[];
}

/**
 * 市町村SEO設定
 */
export interface MunicipalitySeoConfig {
  /** ページタイトル */
  title: string;
  /** メタディスクリプション */
  description: string;
  /** H1テキスト */
  h1?: string;
  /** canonicalパス */
  canonicalPath: string;
}

/**
 * 市町村コンテンツ設定
 */
export interface MunicipalityContentConfig {
  /** 導入テキスト */
  introText?: string;
  /** 注意事項テキスト */
  cautionText?: string;
}

/**
 * 市町村マスタ
 */
export interface Municipality {
  /** 全国地方公共団体コード（JIS X 0401 + 0402） */
  jisCode: string;
  /** 都道府県スラッグ（URL用） */
  prefectureSlug: string;
  /** 市町村スラッグ（URL用） */
  municipalitySlug: string;
  /** 都道府県名（日本語） */
  prefectureNameJa: string;
  /** 市町村名（日本語） */
  municipalityNameJa: string;
  /** ページパス（例: /maps/ishikawa/wajima） */
  path: string;
  /** マップ設定 */
  map: MunicipalityMapConfig;
  /** レイヤー設定 */
  layers: MunicipalityLayerConfig;
  /** SEO設定 */
  seo: MunicipalitySeoConfig;
  /** コンテンツ設定 */
  content: MunicipalityContentConfig;
  /** 公開状態 */
  status: MunicipalityStatus;
  /** 作成日時 */
  createdAt: Date;
  /** 更新日時 */
  updatedAt: Date;
}

/**
 * 市町村別レイヤー状態（動的情報）
 * 更新日時や件数などの変動する情報を管理
 */
export interface MunicipalityLayerStatus {
  /** 市町村コード */
  municipalityJisCode: string;
  /** レイヤー種別 */
  layerType: POIType;
  /** POI件数 */
  itemCount: number;
  /**
   * 最終インポート日時
   * - 自前DBへの反映日時
   * - ページ上で「最終更新日」として表示
   * - sitemap の lastModified に使用
   */
  lastImportedAt: Date | null;
  /**
   * ソース側更新日時（オプション）
   * - 元データ（公開データソース）の更新日時
   * - 参照情報として補足表示
   * - ソースが日時を提供しない場合は null
   */
  sourceUpdatedAt: Date | null;
  /** 利用可能状態 */
  isAvailable: boolean;
}

/**
 * データベース行から Municipality を変換
 */
export function toMunicipality(row: MunicipalityRow): Municipality {
  return {
    jisCode: row.jis_code,
    prefectureSlug: row.prefecture_slug,
    municipalitySlug: row.municipality_slug,
    prefectureNameJa: row.prefecture_name_ja,
    municipalityNameJa: row.municipality_name_ja,
    path: `/maps/${row.prefecture_slug}/${row.municipality_slug}`,
    map: {
      center: {
        lat: row.center_lat,
        lng: row.center_lng,
      },
      bbox: {
        north: row.bbox_north,
        south: row.bbox_south,
        east: row.bbox_east,
        west: row.bbox_west,
      },
      initialZoom: row.initial_zoom,
    },
    layers: {
      defaultLayers: row.default_layers as POIType[],
      availableLayers: row.available_layers as POIType[],
    },
    seo: {
      title: row.seo_title ?? `${row.municipality_name_ja} 消防設備マップ | ichi-link`,
      description:
        row.seo_description ??
        `${row.prefecture_name_ja}${row.municipality_name_ja}の消防設備の位置情報マップ`,
      h1: row.seo_h1 ?? undefined,
      canonicalPath: `/maps/${row.prefecture_slug}/${row.municipality_slug}`,
    },
    content: {
      introText: row.content_intro_text ?? undefined,
      cautionText: row.content_caution_text ?? undefined,
    },
    status: {
      isPublic: row.is_public,
      isIndexed: row.is_indexed,
    },
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * データベース行から MunicipalityLayerStatus を変換
 */
export function toMunicipalityLayerStatus(
  row: MunicipalityLayerStatusRow
): MunicipalityLayerStatus {
  return {
    municipalityJisCode: row.municipality_jis_code,
    layerType: row.layer_type as POIType,
    itemCount: row.item_count,
    lastImportedAt: row.last_imported_at ? new Date(row.last_imported_at) : null,
    sourceUpdatedAt: row.source_updated_at ? new Date(row.source_updated_at) : null,
    isAvailable: row.is_available,
  };
}
