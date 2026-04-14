import { Coordinate } from './coordinate';

/**
 * ピン位置情報
 */
export interface PinLocation {
  /** WGS84座標（ピン位置） */
  coordinate: Coordinate;
  /** Tokyo Datum座標 */
  tokyoCoordinate: Coordinate;
  /** 逆ジオコーディングで取得した住所 */
  address?: string;
  /** ピン設置日時 */
  timestamp: Date;
}

/**
 * マップ状態
 */
export interface MapState {
  /** マップ中心座標 */
  center: Coordinate;
  /** ズームレベル（1-22） */
  zoom: number;
  /** 現在のピン位置 */
  pin: PinLocation | null;
}

/**
 * マップインタラクション状態
 */
export interface MapInteractionState {
  /** 現在のピン */
  pin: PinLocation | null;
  /** パネルが開いているか */
  isPanelOpen: boolean;
  /** 住所取得中か */
  isLoadingAddress: boolean;
}

/**
 * タブの種類
 */
export type TabType = 'converter' | 'map';

/**
 * タブ定義
 */
export interface Tab {
  id: TabType;
  label: string;
}

/**
 * デフォルトのマップ状態
 */
export const DEFAULT_MAP_STATE: MapState = {
  center: { latitude: 35.6812, longitude: 139.7671 }, // 東京駅
  zoom: 5, // 日本全体が見える程度
  pin: null,
};

/**
 * タブ一覧
 */
export const TABS: Tab[] = [
  { id: 'converter', label: '変換ツール' },
  { id: 'map', label: 'マップ' },
];
