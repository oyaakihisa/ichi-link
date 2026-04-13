import { MapUrlGenerator } from '@/lib/services/MapUrlGenerator';

describe('MapUrlGenerator', () => {
  let generator: MapUrlGenerator;
  const tokyoStation = { latitude: 35.6812, longitude: 139.7671 };

  beforeEach(() => {
    generator = new MapUrlGenerator();
  });

  describe('generateGoogleMaps', () => {
    it('正しいGoogle Maps URLを生成する', () => {
      const url = generator.generateGoogleMaps(tokyoStation);

      expect(url).toBe('https://www.google.com/maps?q=35.681200,139.767100');
    });

    it('座標がURLエンコードされる', () => {
      const url = generator.generateGoogleMaps(tokyoStation);

      expect(url).toContain('35.681200');
      expect(url).toContain('139.767100');
    });

    it('負の座標を正しく処理する', () => {
      const coord = { latitude: -35.6812, longitude: -139.7671 };
      const url = generator.generateGoogleMaps(coord);

      expect(url).toContain('-35.681200');
      expect(url).toContain('-139.767100');
    });
  });

  describe('generateYahooMap', () => {
    it('正しいYahoo!地図 URLを生成する', () => {
      const url = generator.generateYahooMap(tokyoStation);

      expect(url).toContain('https://map.yahoo.co.jp/place');
      expect(url).toContain('lat=35.681200');
      expect(url).toContain('lon=139.767100');
      expect(url).toContain('zoom=17');
    });
  });

  describe('generateAppleMaps', () => {
    it('正しいApple Maps URLを生成する', () => {
      const url = generator.generateAppleMaps(tokyoStation);

      expect(url).toContain('https://maps.apple.com/');
      expect(url).toContain('ll=35.681200,139.767100');
      expect(url).toContain('q=35.681200,139.767100');
    });
  });

  describe('generateGsiMap', () => {
    it('正しい地理院地図 URLを生成する', () => {
      const url = generator.generateGsiMap(tokyoStation);

      expect(url).toBe('https://maps.gsi.go.jp/#17/35.681200/139.767100');
    });

    it('ズームレベルが含まれる', () => {
      const url = generator.generateGsiMap(tokyoStation);

      expect(url).toContain('#17/');
    });
  });

  describe('generateAll', () => {
    it('全ての地図URLを生成する', () => {
      const urls = generator.generateAll(tokyoStation);

      expect(urls.googleMaps).toBeDefined();
      expect(urls.yahooMap).toBeDefined();
      expect(urls.appleMaps).toBeDefined();
      expect(urls.gsiMap).toBeDefined();
    });

    it('各URLが正しい形式である', () => {
      const urls = generator.generateAll(tokyoStation);

      expect(urls.googleMaps).toContain('google.com/maps');
      expect(urls.yahooMap).toContain('map.yahoo.co.jp');
      expect(urls.appleMaps).toContain('maps.apple.com');
      expect(urls.gsiMap).toContain('maps.gsi.go.jp');
    });
  });
});
