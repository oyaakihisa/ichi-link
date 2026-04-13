import { Coordinate } from '@/lib/types';

/**
 * 度分秒の構成要素
 */
export interface DmsComponents {
  degrees: number;
  minutes: number;
  seconds: number;
}

/**
 * 座標変換エンジン
 * 度分秒 ↔ 十進度 の相互変換と座標の正規化を行う
 */
export class CoordinateConverter {
  /** 正規化時の小数点以下桁数 */
  private static readonly DECIMAL_PLACES = 6;

  /**
   * 度分秒を十進度に変換
   * @param degrees 度
   * @param minutes 分
   * @param seconds 秒
   * @returns 十進度
   */
  dmsToDecimal(degrees: number, minutes: number, seconds: number): number {
    const sign = degrees < 0 ? -1 : 1;
    const absDegrees = Math.abs(degrees);
    return sign * (absDegrees + minutes / 60 + seconds / 3600);
  }

  /**
   * 十進度を度分秒に変換
   * @param decimal 十進度
   * @returns 度分秒の構成要素
   */
  decimalToDms(decimal: number): DmsComponents {
    const sign = decimal < 0 ? -1 : 1;
    const absDecimal = Math.abs(decimal);

    const degrees = Math.floor(absDecimal);
    const minutesDecimal = (absDecimal - degrees) * 60;
    const minutes = Math.floor(minutesDecimal);
    const seconds = (minutesDecimal - minutes) * 60;

    return {
      degrees: sign * degrees,
      minutes,
      seconds: Math.round(seconds * 1000) / 1000, // 小数点以下3桁で丸め
    };
  }

  /**
   * 座標を正規化（小数点以下6桁）
   * @param coordinate 座標
   * @returns 正規化された座標
   */
  normalize(coordinate: Coordinate): Coordinate {
    const factor = Math.pow(10, CoordinateConverter.DECIMAL_PLACES);
    return {
      latitude: Math.round(coordinate.latitude * factor) / factor,
      longitude: Math.round(coordinate.longitude * factor) / factor,
    };
  }
}
