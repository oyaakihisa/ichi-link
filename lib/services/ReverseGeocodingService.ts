import { Coordinate } from '@/lib/types';

interface ReverseGeocodeResult {
  address: string;
  placeName?: string;
}

/**
 * 逆ジオコーディングサービス
 * 座標から住所を取得する
 */
export class ReverseGeocodingService {
  private readonly accessToken: string;

  constructor() {
    const token = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      throw new Error('Mapbox access token is not configured');
    }
    this.accessToken = token;
  }

  /**
   * 座標から住所を取得（Mapbox Geocoding API使用）
   * @param coordinate WGS84座標
   * @returns 住所情報
   */
  async reverseGeocode(coordinate: Coordinate): Promise<ReverseGeocodeResult> {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinate.longitude},${coordinate.latitude}.json?access_token=${this.accessToken}&language=ja&types=address,poi,place,locality,neighborhood&country=JP`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return {
        address: '住所が見つかりませんでした',
      };
    }

    const feature = data.features[0];

    // 日本の住所形式に整形
    const address = this.formatJapaneseAddress(feature);

    return {
      address,
      placeName: feature.text,
    };
  }

  /**
   * Mapboxのレスポンスを日本の住所形式に整形
   */
  private formatJapaneseAddress(feature: {
    place_name: string;
    context?: Array<{ id: string; text: string }>;
  }): string {
    // place_nameがすでに日本語住所の場合はそのまま使用
    if (feature.place_name && /^日本/.test(feature.place_name)) {
      // 「日本、」プレフィックスを削除
      return feature.place_name.replace(/^日本、\s*/, '');
    }

    // contextから都道府県、市区町村等を抽出
    const context = feature.context || [];
    const parts: string[] = [];

    // region (都道府県)
    const region = context.find((c) => c.id.startsWith('region'));
    if (region) parts.push(region.text);

    // place (市区町村)
    const place = context.find((c) => c.id.startsWith('place'));
    if (place) parts.push(place.text);

    // locality (地域)
    const locality = context.find((c) => c.id.startsWith('locality'));
    if (locality) parts.push(locality.text);

    // neighborhood (町名)
    const neighborhood = context.find((c) => c.id.startsWith('neighborhood'));
    if (neighborhood) parts.push(neighborhood.text);

    if (parts.length > 0) {
      return parts.join('');
    }

    // フォールバック: place_nameをそのまま返す
    return feature.place_name || '住所が見つかりませんでした';
  }
}
