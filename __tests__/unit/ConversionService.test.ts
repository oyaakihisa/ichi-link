import { ConversionService } from '@/lib/services/ConversionService';
import {
  GeocodingService,
  GeocodingError,
} from '@/lib/services/GeocodingService';

describe('ConversionService', () => {
  let service: ConversionService;

  beforeEach(() => {
    service = new ConversionService();
  });

  describe('WGS84入力からの変換', () => {
    it('カンマ区切りの十進度を正しく変換する', () => {
      const result = service.convert('35.6812, 139.7671', 'wgs84');

      expect(result).not.toBeNull();
      expect(result!.input.inputType).toBe('coordinate_decimal');
      expect(result!.inputSource).toBe('wgs84');
      expect(result!.coordinates.wgs84.latitude).toBeCloseTo(35.6812, 4);
      expect(result!.coordinates.wgs84.longitude).toBeCloseTo(139.7671, 4);
    });

    it('空白区切りの十進度を正しく変換する', () => {
      const result = service.convert('35.6812 139.7671', 'wgs84');

      expect(result).not.toBeNull();
      expect(result!.input.inputType).toBe('coordinate_decimal');
    });

    it('Tokyo Datum座標が生成される', () => {
      const result = service.convert('35.6812, 139.7671', 'wgs84');

      expect(result).not.toBeNull();
      expect(result!.coordinates.tokyo).toBeDefined();
      // WGS84→Tokyo Datumでは約0.003度の差がある
      const latDiff = Math.abs(result!.coordinates.tokyo.latitude - 35.6812);
      const lngDiff = Math.abs(result!.coordinates.tokyo.longitude - 139.7671);
      expect(latDiff).toBeGreaterThan(0.001);
      expect(lngDiff).toBeGreaterThan(0.001);
    });

    it('地図URLが生成される', () => {
      const result = service.convert('35.6812, 139.7671', 'wgs84');

      expect(result).not.toBeNull();
      expect(result!.mapUrls.googleMaps).toContain('google.com/maps');
      expect(result!.mapUrls.yahooMap).toContain('map.yahoo.co.jp');
      expect(result!.mapUrls.appleMaps).toContain('maps.apple.com');
      expect(result!.mapUrls.gsiMap).toContain('maps.gsi.go.jp');
    });
  });

  describe('度分秒入力の変換', () => {
    it("度分秒形式を正しく変換する", () => {
      const result = service.convert('35°40\'52"N 139°46\'2"E', 'wgs84');

      expect(result).not.toBeNull();
      expect(result!.input.inputType).toBe('coordinate_dms');
      expect(result!.coordinates.wgs84.latitude).toBeCloseTo(35.681111, 4);
      expect(result!.coordinates.wgs84.longitude).toBeCloseTo(139.767222, 4);
    });

    it("日本語の度分秒を正しく変換する", () => {
      const result = service.convert('35度40分52秒 139度46分2秒', 'wgs84');

      expect(result).not.toBeNull();
      expect(result!.input.inputType).toBe('coordinate_dms');
    });
  });

  describe('Tokyo Datum入力からの変換', () => {
    it('Tokyo Datum座標からWGS84に変換する', () => {
      const result = service.convert('35.6779, 139.7707', 'tokyo');

      expect(result).not.toBeNull();
      expect(result!.inputSource).toBe('tokyo');
      // 入力値がそのままtokyo座標として保持される
      expect(result!.coordinates.tokyo.latitude).toBeCloseTo(35.6779, 4);
      expect(result!.coordinates.tokyo.longitude).toBeCloseTo(139.7707, 4);
      // WGS84座標は変換される
      const latDiff = Math.abs(result!.coordinates.wgs84.latitude - 35.6779);
      const lngDiff = Math.abs(result!.coordinates.wgs84.longitude - 139.7707);
      expect(latDiff).toBeGreaterThan(0.001);
      expect(lngDiff).toBeGreaterThan(0.001);
    });
  });

  describe('警告付き変換', () => {
    it('日本国外の座標で警告が生成される', () => {
      const result = service.convert('40.7128, -74.006', 'wgs84');

      expect(result).not.toBeNull();
      expect(result!.warnings.some((w) => w.type === 'outside_japan')).toBe(
        true
      );
    });

    it('緯度経度の順序が曖昧な場合（日本の緯度範囲内だが経度範囲外）に警告が生成される', () => {
      // 35.6812, 39.7671 は緯度範囲内だが経度が日本の範囲外
      // このケースでは outside_japan 警告が生成される
      const result = service.convert('35.6812, 39.7671', 'wgs84');

      expect(result).not.toBeNull();
      expect(
        result!.warnings.some((w) => w.type === 'outside_japan')
      ).toBe(true);
    });

    it('正常な入力では警告がない', () => {
      const result = service.convert('35.6812, 139.7671', 'wgs84');

      expect(result).not.toBeNull();
      expect(result!.warnings.length).toBe(0);
    });
  });

  describe('無効な入力', () => {
    it('空文字列はnullを返す', () => {
      const result = service.convert('', 'wgs84');

      expect(result).toBeNull();
    });

    it('判定不能な入力はnullを返す', () => {
      const result = service.convert('abc xyz', 'wgs84');

      expect(result).toBeNull();
    });

    it('範囲外の座標はnullを返す', () => {
      const result = service.convert('100.0, 200.0', 'wgs84');

      expect(result).toBeNull();
    });

    it('住所入力はnullを返す（同期版では未対応）', () => {
      const result = service.convert('東京都千代田区', 'address');

      expect(result).toBeNull();
    });
  });

  describe('タイムスタンプ', () => {
    it('変換結果にタイムスタンプが含まれる', () => {
      const before = new Date();
      const result = service.convert('35.6812, 139.7671', 'wgs84');
      const after = new Date();

      expect(result).not.toBeNull();
      expect(result!.timestamp).toBeInstanceOf(Date);
      expect(result!.timestamp.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
      expect(result!.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('住所入力からの非同期変換（convertAsync）', () => {
    it('住所を変換してWGS84とTokyo Datum座標を返す', async () => {
      const mockGeocodingService = {
        geocode: jest.fn().mockResolvedValue({
          coordinate: { latitude: 35.6812, longitude: 139.7671 },
          matchedAddress: '東京都千代田区',
        }),
      } as unknown as GeocodingService;

      const serviceWithMock = new ConversionService(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        mockGeocodingService
      );

      const result = await serviceWithMock.convertAsync(
        '東京都千代田区',
        'address'
      );

      expect(result).not.toBeNull();
      expect(result!.inputSource).toBe('address');
      expect(result!.input.inputType).toBe('address');
      expect(result!.coordinates.wgs84.latitude).toBeCloseTo(35.6812, 4);
      expect(result!.coordinates.wgs84.longitude).toBeCloseTo(139.7671, 4);
      expect(result!.coordinates.tokyo).toBeDefined();
      expect(result!.mapUrls.googleMaps).toContain('google.com/maps');
    });

    it('座標入力は同期版と同じ結果を返す', async () => {
      const syncResult = service.convert('35.6812, 139.7671', 'wgs84');
      const asyncResult = await service.convertAsync('35.6812, 139.7671', 'wgs84');

      expect(asyncResult).not.toBeNull();
      expect(asyncResult!.coordinates.wgs84.latitude).toBeCloseTo(
        syncResult!.coordinates.wgs84.latitude,
        6
      );
      expect(asyncResult!.coordinates.wgs84.longitude).toBeCloseTo(
        syncResult!.coordinates.wgs84.longitude,
        6
      );
    });

    it('ジオコーディングエラーがスローされる', async () => {
      const mockGeocodingService = {
        geocode: jest
          .fn()
          .mockRejectedValue(
            new GeocodingError('NOT_FOUND', '指定された住所が見つかりませんでした')
          ),
      } as unknown as GeocodingService;

      const serviceWithMock = new ConversionService(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        mockGeocodingService
      );

      await expect(
        serviceWithMock.convertAsync('存在しない住所', 'address')
      ).rejects.toThrow(GeocodingError);
    });

    it('入力住所とマッチした住所が異なる場合に警告を生成する', async () => {
      const mockGeocodingService = {
        geocode: jest.fn().mockResolvedValue({
          coordinate: { latitude: 37.424613, longitude: 137.088336 },
          matchedAddress: '石川県輪島市町野町広江3-2-1',
        }),
      } as unknown as GeocodingService;

      const serviceWithMock = new ConversionService(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        mockGeocodingService
      );

      const result = await serviceWithMock.convertAsync(
        '石川県輪島市町野町広江3-2-1-hogehoge',
        'address'
      );

      expect(result).not.toBeNull();
      expect(result!.warnings.length).toBe(1);
      expect(result!.warnings[0].type).toBe('address_partial_match');
      expect(result!.warnings[0].severity).toBe('info');
      expect(result!.warnings[0].message).toContain('石川県輪島市町野町広江3-2-1');
    });

    it('入力住所とマッチした住所が同じ場合は警告なし', async () => {
      const mockGeocodingService = {
        geocode: jest.fn().mockResolvedValue({
          coordinate: { latitude: 35.6812, longitude: 139.7671 },
          matchedAddress: '東京都千代田区丸の内1-1-1',
        }),
      } as unknown as GeocodingService;

      const serviceWithMock = new ConversionService(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        mockGeocodingService
      );

      const result = await serviceWithMock.convertAsync(
        '東京都千代田区丸の内1-1-1',
        'address'
      );

      expect(result).not.toBeNull();
      expect(result!.warnings.length).toBe(0);
    });

    it('丁目表記の違いは同一住所として扱う', async () => {
      const mockGeocodingService = {
        geocode: jest.fn().mockResolvedValue({
          coordinate: { latitude: 35.6812, longitude: 139.7671 },
          matchedAddress: '東京都千代田区丸の内1丁目1番1号',
        }),
      } as unknown as GeocodingService;

      const serviceWithMock = new ConversionService(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        mockGeocodingService
      );

      const result = await serviceWithMock.convertAsync(
        '東京都千代田区丸の内1-1-1',
        'address'
      );

      expect(result).not.toBeNull();
      expect(result!.warnings.length).toBe(0);
    });
  });
});
