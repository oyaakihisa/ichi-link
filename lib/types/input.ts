import { CoordinateFormat } from './coordinate';

/**
 * 入力種別
 */
export type InputType =
  | 'coordinate_decimal' // 十進度形式の座標
  | 'coordinate_dms' // 度分秒形式の座標
  | 'address' // 住所
  | 'unknown'; // 判定不能

/**
 * パース済み座標
 */
export interface ParsedCoordinate {
  /** 緯度（十進度） */
  latitude: number;
  /** 経度（十進度） */
  longitude: number;
  /** 元の形式 */
  originalFormat: CoordinateFormat;
}

/**
 * パース済み住所
 */
export interface ParsedAddress {
  /** 正規化された住所 */
  fullAddress: string;
  /** 都道府県 */
  prefecture?: string;
  /** 市区町村 */
  city?: string;
  /** 町名 */
  town?: string;
  /** 番地 */
  block?: string;
}

/**
 * 入力データ
 */
export interface LocationInput {
  /** 生の入力文字列 */
  rawInput: string;
  /** 判定された入力種別 */
  inputType: InputType;
  /** 判定の確信度 (0-1) */
  confidence: number;
  /** パース結果 */
  parsedData: ParsedCoordinate | ParsedAddress | null;
}
