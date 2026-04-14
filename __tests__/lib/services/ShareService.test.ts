import {
  generateShareText,
  generateLineShareUrl,
  isWebShareSupported,
} from '@/lib/services/ShareService';

describe('ShareService', () => {
  describe('generateShareText', () => {
    it('座標とURLを含むテキストを生成する', () => {
      const coordinate = { latitude: 35.681236, longitude: 139.767125 };
      const mapUrl = 'https://www.google.com/maps?q=35.681236,139.767125';

      const result = generateShareText(coordinate, mapUrl);

      expect(result).toContain('位置情報');
      expect(result).toContain('35.681236, 139.767125');
      expect(result).toContain(mapUrl);
    });

    it('座標を小数点以下6桁で表示する', () => {
      const coordinate = { latitude: 35.6812361234, longitude: 139.7671254321 };
      const mapUrl = 'https://example.com';

      const result = generateShareText(coordinate, mapUrl);

      expect(result).toContain('35.681236');
      expect(result).toContain('139.767125');
    });
  });

  describe('generateLineShareUrl', () => {
    it('LINE Share URLを生成する', () => {
      const text = '位置情報\n座標: 35.681236, 139.767125';

      const result = generateLineShareUrl(text);

      expect(result).toMatch(/^https:\/\/line\.me\/R\/share\?text=/);
    });

    it('テキストをURLエンコードする', () => {
      const text = '日本語テスト';

      const result = generateLineShareUrl(text);

      expect(result).not.toContain('日本語');
      expect(result).toContain(encodeURIComponent(text));
    });

    it('改行を含むテキストを正しくエンコードする', () => {
      const text = '行1\n行2';

      const result = generateLineShareUrl(text);

      expect(result).toContain(encodeURIComponent('\n'));
    });
  });

  describe('isWebShareSupported', () => {
    const originalNavigator = global.navigator;

    afterEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        configurable: true,
      });
    });

    it('navigator.shareが存在する場合はtrueを返す', () => {
      Object.defineProperty(global, 'navigator', {
        value: { share: jest.fn() },
        configurable: true,
      });

      expect(isWebShareSupported()).toBe(true);
    });

    it('navigator.shareが存在しない場合はfalseを返す', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        configurable: true,
      });

      expect(isWebShareSupported()).toBe(false);
    });

    it('navigatorが存在しない場合はfalseを返す', () => {
      Object.defineProperty(global, 'navigator', {
        value: undefined,
        configurable: true,
      });

      expect(isWebShareSupported()).toBe(false);
    });
  });
});
