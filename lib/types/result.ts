import { Coordinate, InputSource } from './coordinate';
import { LocationInput } from './input';

/**
 * 警告種別
 */
export type WarningType =
  | 'coordinate_order_ambiguous' // 緯度経度の順番が曖昧
  | 'outside_japan' // 日本国外の座標
  | 'low_confidence' // 判定の確信度が低い
  | 'coordinate_swap_suggested' // 緯度経度入れ替えの提案
  | 'address_partial_match'; // 住所が部分的にマッチ（入力より短い住所でマッチ）

/**
 * 警告の重要度
 */
export type WarningSeverity = 'info' | 'warning' | 'error';

/**
 * 警告
 */
export interface Warning {
  /** 警告種別 */
  type: WarningType;
  /** 警告メッセージ */
  message: string;
  /** 重要度 */
  severity: WarningSeverity;
}

/**
 * 地図サービスのURL
 */
export interface MapUrls {
  /** Google Maps */
  googleMaps: string;
  /** Yahoo!地図 */
  yahooMap: string;
  /** Apple Maps */
  appleMaps: string;
  /** 地理院地図 */
  gsiMap: string;
}

/**
 * 変換結果
 */
export interface ConversionResult {
  /** 入力データ */
  input: LocationInput;
  /** 入力ソース（どの入力欄から） */
  inputSource: InputSource;
  /** 変換後の座標 */
  coordinates: {
    /** WGS84座標 */
    wgs84: Coordinate;
    /** 旧日本測地系（Tokyo Datum）座標 */
    tokyo: Coordinate;
  };
  /** 逆ジオコーディング結果（将来用） */
  address?: string;
  /** 各地図サービスのURL */
  mapUrls: MapUrls;
  /** 警告一覧 */
  warnings: Warning[];
  /** 変換日時 */
  timestamp: Date;
}
