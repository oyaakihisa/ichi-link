import {
  ConversionResult,
  Coordinate,
  ParsedCoordinate,
  InputSource,
} from '@/lib/types';
import { InputParser } from './InputParser';
import { CoordinateConverter } from './CoordinateConverter';
import { DatumTransformer } from './DatumTransformer';
import { ValidationService } from './ValidationService';
import { MapUrlGenerator } from './MapUrlGenerator';

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

  constructor(
    inputParser?: InputParser,
    coordinateConverter?: CoordinateConverter,
    datumTransformer?: DatumTransformer,
    validationService?: ValidationService,
    mapUrlGenerator?: MapUrlGenerator
  ) {
    this.inputParser = inputParser || new InputParser();
    this.coordinateConverter = coordinateConverter || new CoordinateConverter();
    this.datumTransformer = datumTransformer || new DatumTransformer();
    this.validationService = validationService || new ValidationService();
    this.mapUrlGenerator = mapUrlGenerator || new MapUrlGenerator();
  }

  /**
   * 入力文字列を変換して結果を返す
   * @param input 入力文字列
   * @param source 入力ソース（どの入力欄から入力されたか）
   * @returns 変換結果、または入力が不正な場合はnull
   */
  convert(input: string, source: InputSource): ConversionResult | null {
    // 住所入力は現在未対応
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
}
