import {
  GeocodingService,
  GeocodingError,
} from '@/lib/services/GeocodingService';

describe('GeocodingService', () => {
  let service: GeocodingService;

  beforeEach(() => {
    service = new GeocodingService();
    jest.clearAllMocks();
  });

  describe('正常系', () => {
    it('住所を座標に変換できる', async () => {
      const mockResponse = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [139.7671, 35.6812], // [longitude, latitude]
            },
            properties: {
              title: '東京都千代田区',
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.geocode('東京都千代田区');

      expect(result.coordinate.latitude).toBeCloseTo(35.6812, 4);
      expect(result.coordinate.longitude).toBeCloseTo(139.7671, 4);
      expect(result.matchedAddress).toBe('東京都千代田区');
    });

    it('座標が小数点以下6桁に丸められる', async () => {
      const mockResponse = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [139.76712345678, 35.68123456789],
            },
            properties: {
              title: '東京都千代田区',
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.geocode('東京都千代田区');

      expect(result.coordinate.latitude).toBe(35.681235);
      expect(result.coordinate.longitude).toBe(139.767123);
    });
  });

  describe('住所の正規化', () => {
    it('全角数字が半角数字に変換される', async () => {
      const mockResponse = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [139.7671, 35.6812],
            },
            properties: {
              title: '東京都千代田区丸の内1-1-1',
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await service.geocode('東京都千代田区丸の内１−１−１');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          encodeURIComponent('東京都千代田区丸の内1−1−1')
        ),
        expect.any(Object)
      );
    });

    it('前後の空白が除去される', async () => {
      const mockResponse = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [139.7671, 35.6812],
            },
            properties: {
              title: '東京都千代田区',
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await service.geocode('  東京都千代田区  ');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent('東京都千代田区')),
        expect.any(Object)
      );
    });
  });

  describe('エラー系', () => {
    it('空の入力でNOT_FOUNDエラーを投げる', async () => {
      await expect(service.geocode('')).rejects.toThrow(GeocodingError);
      await expect(service.geocode('')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: '住所を入力してください',
      });
    });

    it('空白のみの入力でNOT_FOUNDエラーを投げる', async () => {
      await expect(service.geocode('   ')).rejects.toThrow(GeocodingError);
      await expect(service.geocode('   ')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('住所が見つからない場合NOT_FOUNDエラーを投げる', async () => {
      const mockResponse = {
        type: 'FeatureCollection',
        features: [],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await expect(
        service.geocode('存在しない住所12345')
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: '指定された住所が見つかりませんでした',
      });
    });

    it('ネットワークエラーでNETWORK_ERRORを投げる', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(service.geocode('東京都千代田区')).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        message: 'ネットワークエラーが発生しました',
      });
    });

    it('タイムアウトでNETWORK_ERRORを投げる', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      global.fetch = jest.fn().mockRejectedValue(abortError);

      await expect(service.geocode('東京都千代田区')).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        message: '接続がタイムアウトしました',
      });
    });

    it('APIエラーレスポンスでAPI_ERRORを投げる', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(service.geocode('東京都千代田区')).rejects.toMatchObject({
        code: 'API_ERROR',
        message: 'APIエラーが発生しました（500）',
      });
    });

    it('不正なJSONレスポンスでAPI_ERRORを投げる', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(service.geocode('東京都千代田区')).rejects.toMatchObject({
        code: 'API_ERROR',
        message: 'APIレスポンスの解析に失敗しました',
      });
    });
  });

  describe('GeocodingError', () => {
    it('正しいプロパティを持つ', () => {
      const error = new GeocodingError('NOT_FOUND', 'テストメッセージ');

      expect(error.name).toBe('GeocodingError');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('テストメッセージ');
      expect(error instanceof Error).toBe(true);
    });
  });
});
