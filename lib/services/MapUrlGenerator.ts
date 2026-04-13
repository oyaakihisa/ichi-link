import { Coordinate, MapUrls } from '@/lib/types';

/**
 * 地図URL生成サービス
 * 各地図サービスのURLを生成する
 */
export class MapUrlGenerator {
  /** デフォルトのズームレベル */
  private static readonly DEFAULT_ZOOM = 17;

  /**
   * 全地図サービスのURLを生成
   * @param coord 座標（WGS84）
   * @returns 各地図サービスのURL
   */
  generateAll(coord: Coordinate): MapUrls {
    return {
      googleMaps: this.generateGoogleMaps(coord),
      yahooMap: this.generateYahooMap(coord),
      appleMaps: this.generateAppleMaps(coord),
      gsiMap: this.generateGsiMap(coord),
    };
  }

  /**
   * Google Maps URL生成
   * @param coord 座標
   * @returns Google Maps URL
   */
  generateGoogleMaps(coord: Coordinate): string {
    const lat = encodeURIComponent(coord.latitude.toFixed(6));
    const lng = encodeURIComponent(coord.longitude.toFixed(6));
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }

  /**
   * Yahoo!地図 URL生成
   * @param coord 座標
   * @returns Yahoo!地図 URL
   */
  generateYahooMap(coord: Coordinate): string {
    const lat = encodeURIComponent(coord.latitude.toFixed(6));
    const lng = encodeURIComponent(coord.longitude.toFixed(6));
    const zoom = MapUrlGenerator.DEFAULT_ZOOM;
    return `https://map.yahoo.co.jp/place?lat=${lat}&lon=${lng}&zoom=${zoom}`;
  }

  /**
   * Apple Maps URL生成
   * @param coord 座標
   * @returns Apple Maps URL
   */
  generateAppleMaps(coord: Coordinate): string {
    const lat = encodeURIComponent(coord.latitude.toFixed(6));
    const lng = encodeURIComponent(coord.longitude.toFixed(6));
    return `https://maps.apple.com/?ll=${lat},${lng}&q=${lat},${lng}`;
  }

  /**
   * 地理院地図 URL生成
   * @param coord 座標
   * @returns 地理院地図 URL
   */
  generateGsiMap(coord: Coordinate): string {
    const lat = coord.latitude.toFixed(6);
    const lng = coord.longitude.toFixed(6);
    const zoom = MapUrlGenerator.DEFAULT_ZOOM;
    // 地理院地図のURLフォーマット: #zoom/lat/lng
    return `https://maps.gsi.go.jp/#${zoom}/${lat}/${lng}`;
  }
}
