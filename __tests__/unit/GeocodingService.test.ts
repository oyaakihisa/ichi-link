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
        coordinate: { latitude: 35.6812, longitude: 139.7671 },
        matchedAddress: '東京都千代田区丸の内一丁目1番1号',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.geocode('東京都千代田区丸の内1-1-1');

      expect(result.coordinate.latitude).toBeCloseTo(35.6812, 4);
      expect(result.coordinate.longitude).toBeCloseTo(139.7671, 4);
      expect(result.matchedAddress).toBe('東京都千代田区丸の内一丁目1番1号');
    });

    it('API Routeに正しいパラメータでリクエストする', async () => {
      const mockResponse = {
        coordinate: { latitude: 35.6812, longitude: 139.7671 },
        matchedAddress: '東京都千代田区',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await service.geocode('東京都千代田区');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/geocode?address='),
        expect.any(Object)
      );
    });
  });

  describe('住所の正規化', () => {
    it('全角数字が半角数字に変換される', async () => {
      const mockResponse = {
        coordinate: { latitude: 35.6812, longitude: 139.7671 },
        matchedAddress: '東京都千代田区丸の内1-1-1',
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
        coordinate: { latitude: 35.6812, longitude: 139.7671 },
        matchedAddress: '東京都千代田区',
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
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({
          error: { code: 'NOT_FOUND', message: '指定された住所が見つかりませんでした' },
        }),
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
        status: 502,
        json: () => Promise.resolve({
          error: { code: 'API_ERROR', message: 'APIエラーが発生しました（500）' },
        }),
      });

      await expect(service.geocode('東京都千代田区')).rejects.toMatchObject({
        code: 'API_ERROR',
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
