import proj4 from 'proj4';
import { Coordinate } from '@/lib/types';

// 測地系の定義
// WGS84 (EPSG:4326) - proj4のデフォルト
// Tokyo Datum (EPSG:4301) - 旧日本測地系

// 旧日本測地系（Tokyo Datum）の定義
proj4.defs(
  'EPSG:4301',
  '+proj=longlat +ellps=bessel +towgs84=-146.414,507.337,680.507,0,0,0,0 +no_defs +type=crs'
);

/**
 * 測地系変換
 * WGS84 ↔ 旧日本測地系（Tokyo Datum）の相互変換を行う
 */
export class DatumTransformer {
  /** 正規化時の小数点以下桁数 */
  private static readonly DECIMAL_PLACES = 6;

  /**
   * WGS84から旧日本測地系への変換
   * 注: 約400-500m南西方向にシフト
   * @param coord WGS84座標
   * @returns Tokyo Datum座標
   */
  wgs84ToTokyo(coord: Coordinate): Coordinate {
    const result = proj4('EPSG:4326', 'EPSG:4301', [
      coord.longitude,
      coord.latitude,
    ]);
    return this.normalize({
      latitude: result[1],
      longitude: result[0],
    });
  }

  /**
   * 旧日本測地系からWGS84への変換
   * 注: 約400-500m北東方向にシフト
   * @param coord Tokyo Datum座標
   * @returns WGS84座標
   */
  tokyoToWgs84(coord: Coordinate): Coordinate {
    const result = proj4('EPSG:4301', 'EPSG:4326', [
      coord.longitude,
      coord.latitude,
    ]);
    return this.normalize({
      latitude: result[1],
      longitude: result[0],
    });
  }

  /**
   * 座標を正規化（小数点以下6桁）
   */
  private normalize(coord: Coordinate): Coordinate {
    const factor = Math.pow(10, DatumTransformer.DECIMAL_PLACES);
    return {
      latitude: Math.round(coord.latitude * factor) / factor,
      longitude: Math.round(coord.longitude * factor) / factor,
    };
  }
}
