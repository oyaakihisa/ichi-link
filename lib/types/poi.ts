import type { Coordinate } from './coordinate';

/**
 * POI種別
 */
export type POIType = 'aed' | 'fireHydrant' | 'fireCistern';

/**
 * POI基本インターフェース
 * 公開設備情報の共通構造
 */
export interface POI {
  /** 一意識別子 */
  id: string;
  /** POI種別 */
  type: POIType;
  /** 名称 */
  name: string;
  /** WGS84座標 */
  coordinate: Coordinate;
  /** 住所 */
  address?: string;
  /** 設置場所詳細などの補足情報 */
  detailText?: string;
  /** 利用可能時間などの可用性情報 */
  availabilityText?: string;
  /** データソース */
  source: string;
  /** データ更新日時 */
  updatedAt?: Date;
}

/**
 * AED固有の詳細情報
 */
export interface AEDDetail extends POI {
  type: 'aed';
  /** 利用可能時間（例: "24時間"） */
  availableHours?: string;
  /** 設置場所詳細（例: "1階ロビー"） */
  locationDetail?: string;
  /** 小児対応パッド有無 */
  childPadAvailable?: boolean;
}

/**
 * 消火栓固有の詳細情報
 * 注: 利用可否は位置情報とは別概念。MVPでは位置情報レイヤーとして扱い、利用可否は保証しない
 */
export interface FireHydrantDetail extends POI {
  type: 'fireHydrant';
  /** 注記（例: "利用可否は別途確認が必要です"） */
  note: string;
}

/**
 * レイヤー表示状態
 */
export interface LayerVisibility {
  /** AEDレイヤー表示 */
  aed: boolean;
  /** 消火栓レイヤー表示 */
  fireHydrant: boolean;
}

/**
 * レイヤー表示状態の初期値
 * AED=ON（初見で価値が伝わりやすい）、消火栓=OFF（情報過多を避ける）
 */
export const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
  aed: true,
  fireHydrant: false,
};

/**
 * 地図表示範囲
 */
export interface MapBounds {
  /** 北端緯度 */
  north: number;
  /** 南端緯度 */
  south: number;
  /** 東端経度 */
  east: number;
  /** 西端経度 */
  west: number;
}

/**
 * POI取得オプション
 */
export interface POIQueryOptions {
  /** 表示範囲 */
  bounds: MapBounds;
  /** 取得するPOI種別 */
  types: POIType[];
  /** 最大取得件数 */
  limit?: number;
}
