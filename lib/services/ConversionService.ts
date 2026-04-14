import {
  ConversionResult,
  Coordinate,
  ParsedCoordinate,
  ParsedAddress,
  InputSource,
  Warning,
} from '@/lib/types';
import { InputParser } from './InputParser';
import { CoordinateConverter } from './CoordinateConverter';
import { DatumTransformer } from './DatumTransformer';
import { ValidationService } from './ValidationService';
import { MapUrlGenerator } from './MapUrlGenerator';
import { GeocodingService } from './GeocodingService';

/**
 * 変換サービス
 * 入力から変換結果までの全体のオーケストレーションを行う
 */
export class ConversionService {
  private inputParser: InputParser;
  private coordinateConverter: CoordinateConverter;
  private datumTransformer: DatumTransformer;
  private validationService: ValidationService;
  private mapUrlGenerator: MapUrlGenerator;
  private geocodingService: GeocodingService;

  constructor(
    inputParser?: InputParser,
    coordinateConverter?: CoordinateConverter,
    datumTransformer?: DatumTransformer,
    validationService?: ValidationService,
    mapUrlGenerator?: MapUrlGenerator,
    geocodingService?: GeocodingService
  ) {
    this.inputParser = inputParser || new InputParser();
    this.coordinateConverter = coordinateConverter || new CoordinateConverter();
    this.datumTransformer = datumTransformer || new DatumTransformer();
    this.validationService = validationService || new ValidationService();
    this.mapUrlGenerator = mapUrlGenerator || new MapUrlGenerator();
    this.geocodingService = geocodingService || new GeocodingService();
  }

  /**
   * 入力文字列を変換して結果を返す（非同期版）
   * 住所入力の場合はジオコーディングを行う
   * @param input 入力文字列
   * @param source 入力ソース（どの入力欄から入力されたか）
   * @returns 変換結果、または入力が不正な場合はnull
   * @throws {GeocodingError} 住所変換に失敗した場合
   */
  async convertAsync(
    input: string,
    source: InputSource
  ): Promise<ConversionResult | null> {
    // 住所入力の場合はジオコーディングを使用
    if (source === 'address') {
      const result = await this.geocodingService.geocode(input);
      const wgs84Coord = result.coordinate;
      const tokyoCoord = this.datumTransformer.wgs84ToTokyo(wgs84Coord);
      const mapUrls = this.mapUrlGenerator.generateAll(wgs84Coord);

      const parsedAddress: ParsedAddress = {
        fullAddress: result.matchedAddress,
      };

      // 入力住所とマッチした住所を比較して警告を生成
      const warnings: Warning[] = [];
      const normalizedInput = this.normalizeAddressForComparison(input);
      const normalizedMatched = this.normalizeAddressForComparison(
        result.matchedAddress
      );

      if (normalizedInput !== normalizedMatched) {
        warnings.push({
          type: 'address_partial_match',
          message: `「${result.matchedAddress}」までの情報で位置を特定しました`,
          severity: 'error',
        });
      }

      return {
        input: {
          rawInput: input,
          inputType: 'address',
          confidence: 1.0,
          parsedData: parsedAddress,
        },
        inputSource: source,
        coordinates: {
          wgs84: wgs84Coord,
          tokyo: tokyoCoord,
        },
        mapUrls,
        warnings,
        timestamp: new Date(),
      };
    }

    // 座標入力の場合は同期版を使用
    return this.convert(input, source);
  }

  /**
   * 入力文字列を変換して結果を返す
   * @param input 入力文字列
   * @param source 入力ソース（どの入力欄から入力されたか）
   * @returns 変換結果、または入力が不正な場合はnull
   */
  convert(input: string, source: InputSource): ConversionResult | null {
    // 住所入力は非同期版を使用する必要がある
    if (source === 'address') {
      return null;
    }

    // 入力をパース
    const locationInput = this.inputParser.parse(input);

    // 判定不能な場合はnullを返す
    if (
      locationInput.inputType === 'unknown' ||
      locationInput.parsedData === null
    ) {
      return null;
    }

    // 座標を取得
    const parsedCoord = locationInput.parsedData as ParsedCoordinate;
    const inputCoord: Coordinate = this.coordinateConverter.normalize({
      latitude: parsedCoord.latitude,
      longitude: parsedCoord.longitude,
    });

    // 入力ソースに応じて変換
    let wgs84Coord: Coordinate;
    let tokyoCoord: Coordinate;

    if (source === 'wgs84') {
      // WGS84入力 → Tokyo Datumに変換
      wgs84Coord = inputCoord;
      tokyoCoord = this.datumTransformer.wgs84ToTokyo(inputCoord);
    } else {
      // Tokyo Datum入力 → WGS84に変換
      tokyoCoord = inputCoord;
      wgs84Coord = this.datumTransformer.tokyoToWgs84(inputCoord);
    }

    // 警告を生成（WGS84座標で検証）
    const warnings = this.validationService.generateWarnings(
      locationInput,
      wgs84Coord
    );

    // 地図URLを生成（WGS84座標を使用）
    const mapUrls = this.mapUrlGenerator.generateAll(wgs84Coord);

    return {
      input: locationInput,
      inputSource: source,
      coordinates: {
        wgs84: wgs84Coord,
        tokyo: tokyoCoord,
      },
      mapUrls,
      warnings,
      timestamp: new Date(),
    };
  }

  /**
   * 住所を比較用に正規化する
   * - 全角数字→半角数字
   * - 全角ハイフン類→半角ハイフン
   * - 空白除去
   * - 「丁目」「番」「号」を正規化
   */
  private normalizeAddressForComparison(address: string): string {
    return address
      .trim()
      // 全角数字→半角
      .replace(/[０-９]/g, (char) =>
        String.fromCharCode(char.charCodeAt(0) - 0xfee0)
      )
      // 全角ハイフン類→半角
      .replace(/[ー−‐―]/g, '-')
      // 「丁目」「番地」「番」「号」をハイフンに統一
      .replace(/丁目|番地|番|号/g, '-')
      // 連続するハイフンを1つに
      .replace(/-+/g, '-')
      // 末尾のハイフンを除去
      .replace(/-$/, '')
      // 空白除去
      .replace(/\s+/g, '');
  }
}
