import {
  LocationInput,
  InputType,
  ParsedCoordinate,
  CoordinateFormat,
} from '@/lib/types';
import { CoordinateConverter } from './CoordinateConverter';

/**
 * 入力パーサー
 * 入力文字列の種別を自動判定し、座標をパースする
 */
export class InputParser {
  private converter: CoordinateConverter;

  // 十進度形式のパターン
  private static readonly DECIMAL_PATTERNS = [
    // カンマ区切り: 35.6812, 139.7671 または 35.6812,139.7671
    /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/,
    // 空白区切り: 35.6812 139.7671
    /^(-?\d+\.?\d*)\s+(-?\d+\.?\d*)$/,
    // N/E表記: N35.6812 E139.7671 または 35.6812N 139.7671E
    /^[NS]?\s*(-?\d+\.?\d*)\s*[NS]?\s*[,\s]\s*[EW]?\s*(-?\d+\.?\d*)\s*[EW]?$/i,
  ];

  // 度分秒形式のパターン
  private static readonly DMS_PATTERNS = [
    // 記号付き: 35°40'52"N 139°46'2"E
    /(\d+)[°度]\s*(\d+)[′'分]\s*([\d.]+)[″"秒]?\s*([NS]?)\s*[,\s]?\s*(\d+)[°度]\s*(\d+)[′'分]\s*([\d.]+)[″"秒]?\s*([EW]?)/i,
    // 記号付き（Nなし）: 35°40'52" 139°46'2"
    /(\d+)[°度]\s*(\d+)[′'分]\s*([\d.]+)[″"秒]?\s*[,\s]?\s*(\d+)[°度]\s*(\d+)[′'分]\s*([\d.]+)[″"秒]?/,
  ];

  constructor(converter?: CoordinateConverter) {
    this.converter = converter || new CoordinateConverter();
  }

  /**
   * 入力を解析して種別を判定
   * @param input 入力文字列
   * @returns LocationInput
   */
  parse(input: string): LocationInput {
    const normalized = this.normalizeInput(input);

    if (!normalized) {
      return this.createUnknownResult(input);
    }

    // 十進度座標を試行
    const decimalResult = this.parseDecimalCoordinate(normalized);
    if (decimalResult) {
      return {
        rawInput: input,
        inputType: 'coordinate_decimal',
        confidence: decimalResult.confidence,
        parsedData: decimalResult.coordinate,
      };
    }

    // 度分秒座標を試行
    const dmsResult = this.parseDmsCoordinate(normalized);
    if (dmsResult) {
      return {
        rawInput: input,
        inputType: 'coordinate_dms',
        confidence: dmsResult.confidence,
        parsedData: dmsResult.coordinate,
      };
    }

    // 判定不能
    return this.createUnknownResult(input);
  }

  /**
   * 入力文字列を正規化
   */
  private normalizeInput(input: string): string {
    return (
      input
        // 全角数字を半角に変換
        .replace(/[０-９]/g, (s) =>
          String.fromCharCode(s.charCodeAt(0) - 0xfee0)
        )
        // 全角記号を半角に変換
        .replace(/[．]/g, '.')
        .replace(/[，]/g, ',')
        .replace(/[　]/g, ' ')
        // 前後の空白を除去
        .trim()
        // 複数の空白を単一に正規化
        .replace(/\s+/g, ' ')
    );
  }

  /**
   * 十進度座標かどうかを判定
   */
  private isDecimalCoordinate(input: string): boolean {
    return InputParser.DECIMAL_PATTERNS.some((pattern) => pattern.test(input));
  }

  /**
   * 度分秒座標かどうかを判定
   */
  private isDmsCoordinate(input: string): boolean {
    return InputParser.DMS_PATTERNS.some((pattern) => pattern.test(input));
  }

  /**
   * 十進度座標をパース
   */
  private parseDecimalCoordinate(
    input: string
  ): { coordinate: ParsedCoordinate; confidence: number } | null {
    for (const pattern of InputParser.DECIMAL_PATTERNS) {
      const match = input.match(pattern);
      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);

        // 基本的な妥当性チェック
        if (isNaN(lat) || isNaN(lng)) {
          continue;
        }

        // 緯度は-90〜90、経度は-180〜180
        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
          continue;
        }

        return {
          coordinate: {
            latitude: lat,
            longitude: lng,
            originalFormat: 'decimal' as CoordinateFormat,
          },
          confidence: 0.9,
        };
      }
    }
    return null;
  }

  /**
   * 度分秒座標をパース
   */
  private parseDmsCoordinate(
    input: string
  ): { coordinate: ParsedCoordinate; confidence: number } | null {
    // パターン1: N/S, E/W付き
    const pattern1 = InputParser.DMS_PATTERNS[0];
    const match1 = input.match(pattern1);
    if (match1) {
      const latDeg = parseInt(match1[1], 10);
      const latMin = parseInt(match1[2], 10);
      const latSec = parseFloat(match1[3]);
      const latDir = match1[4]?.toUpperCase() || 'N';

      const lngDeg = parseInt(match1[5], 10);
      const lngMin = parseInt(match1[6], 10);
      const lngSec = parseFloat(match1[7]);
      const lngDir = match1[8]?.toUpperCase() || 'E';

      let lat = this.converter.dmsToDecimal(latDeg, latMin, latSec);
      let lng = this.converter.dmsToDecimal(lngDeg, lngMin, lngSec);

      if (latDir === 'S') lat = -lat;
      if (lngDir === 'W') lng = -lng;

      return {
        coordinate: {
          latitude: lat,
          longitude: lng,
          originalFormat: 'dms' as CoordinateFormat,
        },
        confidence: 0.95,
      };
    }

    // パターン2: N/S, E/Wなし
    const pattern2 = InputParser.DMS_PATTERNS[1];
    const match2 = input.match(pattern2);
    if (match2) {
      const latDeg = parseInt(match2[1], 10);
      const latMin = parseInt(match2[2], 10);
      const latSec = parseFloat(match2[3]);

      const lngDeg = parseInt(match2[4], 10);
      const lngMin = parseInt(match2[5], 10);
      const lngSec = parseFloat(match2[6]);

      const lat = this.converter.dmsToDecimal(latDeg, latMin, latSec);
      const lng = this.converter.dmsToDecimal(lngDeg, lngMin, lngSec);

      return {
        coordinate: {
          latitude: lat,
          longitude: lng,
          originalFormat: 'dms' as CoordinateFormat,
        },
        confidence: 0.85,
      };
    }

    return null;
  }

  /**
   * 判定不能な結果を作成
   */
  private createUnknownResult(input: string): LocationInput {
    return {
      rawInput: input,
      inputType: 'unknown' as InputType,
      confidence: 0,
      parsedData: null,
    };
  }
}
