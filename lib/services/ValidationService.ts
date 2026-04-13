import { Coordinate, LocationInput, Warning, WarningType } from '@/lib/types';

/**
 * 検証・警告生成サービス
 * 入力値の妥当性検証と警告の生成を行う
 */
export class ValidationService {
  // 日本の緯度範囲（概算）
  private static readonly JAPAN_LAT_MIN = 20; // 沖ノ鳥島
  private static readonly JAPAN_LAT_MAX = 46; // 択捉島

  // 日本の経度範囲（概算）
  private static readonly JAPAN_LNG_MIN = 122; // 与那国島
  private static readonly JAPAN_LNG_MAX = 154; // 南鳥島

  // 確信度のしきい値
  private static readonly LOW_CONFIDENCE_THRESHOLD = 0.7;

  /**
   * 座標が日本国内かどうかを検証
   * @param coord 座標
   * @returns 日本国内ならtrue
   */
  isWithinJapan(coord: Coordinate): boolean {
    return (
      coord.latitude >= ValidationService.JAPAN_LAT_MIN &&
      coord.latitude <= ValidationService.JAPAN_LAT_MAX &&
      coord.longitude >= ValidationService.JAPAN_LNG_MIN &&
      coord.longitude <= ValidationService.JAPAN_LNG_MAX
    );
  }

  /**
   * 緯度経度の順番が妥当かを検証
   * 日本の座標として妥当かどうかを判定
   * @param lat 緯度として入力された値
   * @param lng 経度として入力された値
   * @returns 順番が正しいと思われる場合はtrue
   */
  validateCoordinateOrder(lat: number, lng: number): boolean {
    const isLatInRange =
      lat >= ValidationService.JAPAN_LAT_MIN &&
      lat <= ValidationService.JAPAN_LAT_MAX;
    const isLngInRange =
      lng >= ValidationService.JAPAN_LNG_MIN &&
      lng <= ValidationService.JAPAN_LNG_MAX;

    // 両方が範囲内なら正しい順序
    if (isLatInRange && isLngInRange) {
      return true;
    }

    // 入れ替えた方が範囲内に収まるか確認
    const swappedLatInRange =
      lng >= ValidationService.JAPAN_LAT_MIN &&
      lng <= ValidationService.JAPAN_LAT_MAX;
    const swappedLngInRange =
      lat >= ValidationService.JAPAN_LNG_MIN &&
      lat <= ValidationService.JAPAN_LNG_MAX;

    if (swappedLatInRange && swappedLngInRange) {
      // 入れ替えた方が正しい可能性が高い
      return false;
    }

    // どちらも判定できない場合は現在の順序を信頼
    return true;
  }

  /**
   * 警告を生成
   * @param input 入力データ
   * @param coord 座標
   * @returns 警告一覧
   */
  generateWarnings(input: LocationInput, coord: Coordinate): Warning[] {
    const warnings: Warning[] = [];

    // 確信度が低い場合の警告
    if (input.confidence < ValidationService.LOW_CONFIDENCE_THRESHOLD) {
      warnings.push({
        type: 'low_confidence' as WarningType,
        message: '入力形式の判定が不確実です。結果を確認してください。',
        severity: 'warning',
      });
    }

    // 日本国外の座標の警告
    if (!this.isWithinJapan(coord)) {
      warnings.push({
        type: 'outside_japan' as WarningType,
        message: '指定された座標は日本国外です。',
        severity: 'warning',
      });
    }

    // 緯度経度の順番が不自然な場合の警告
    if (!this.validateCoordinateOrder(coord.latitude, coord.longitude)) {
      const swapped = this.suggestSwappedCoordinate(coord);
      if (swapped) {
        warnings.push({
          type: 'coordinate_swap_suggested' as WarningType,
          message: `緯度経度の順番が逆の可能性があります。入れ替え候補: ${swapped.latitude}, ${swapped.longitude}`,
          severity: 'warning',
        });
      } else {
        warnings.push({
          type: 'coordinate_order_ambiguous' as WarningType,
          message: '緯度経度の順番を確認してください。',
          severity: 'warning',
        });
      }
    }

    return warnings;
  }

  /**
   * 緯度経度入れ替え候補を生成
   * @param coord 座標
   * @returns 入れ替え候補（入れ替えが妥当な場合）、またはnull
   */
  suggestSwappedCoordinate(coord: Coordinate): Coordinate | null {
    const swapped = {
      latitude: coord.longitude,
      longitude: coord.latitude,
    };

    // 入れ替え後が日本国内なら候補として返す
    if (this.isWithinJapan(swapped)) {
      return swapped;
    }

    return null;
  }
}
