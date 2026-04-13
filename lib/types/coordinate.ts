/**
 * 座標を表す型
 */
export interface Coordinate {
  /** 緯度（十進度、小数点以下6桁） */
  latitude: number;
  /** 経度（十進度、小数点以下6桁） */
  longitude: number;
}

/**
 * 座標形式
 */
export type CoordinateFormat =
  | 'decimal' // 十進度 (35.6812)
  | 'dms' // 度分秒 (35°40'52")
  | 'dmm'; // 度分 (35°40.867')

/**
 * 測地系
 */
export type Datum =
  | 'WGS84' // 世界測地系
  | 'TOKYO'; // 旧日本測地系

/**
 * 入力ソース（どの入力欄から入力されたか）
 */
export type InputSource =
  | 'address' // 住所入力欄
  | 'wgs84' // WGS84座標入力欄
  | 'tokyo'; // Tokyo Datum座標入力欄
