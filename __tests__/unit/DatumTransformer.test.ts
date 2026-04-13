import { DatumTransformer } from '@/lib/services/DatumTransformer';

describe('DatumTransformer', () => {
  let transformer: DatumTransformer;

  beforeEach(() => {
    transformer = new DatumTransformer();
  });

  describe('wgs84ToTokyo', () => {
    it('WGS84座標を旧日本測地系に変換する（東京駅）', () => {
      const wgs84 = { latitude: 35.6812, longitude: 139.7671 };
      const result = transformer.wgs84ToTokyo(wgs84);

      // WGS84→Tokyo Datumでは約400-500mのズレがある
      // 変換後の値が妥当な範囲にあることを確認
      expect(result.latitude).toBeGreaterThan(35.67);
      expect(result.latitude).toBeLessThan(35.69);
      expect(result.longitude).toBeGreaterThan(139.76);
      expect(result.longitude).toBeLessThan(139.78);
    });

    it('WGS84からの変換で座標が変化する', () => {
      const wgs84 = { latitude: 35.6812, longitude: 139.7671 };
      const result = transformer.wgs84ToTokyo(wgs84);

      // 変換により値が変化することを確認
      // WGS84→Tokyo Datumでは約0.003度程度のズレ
      const latDiff = Math.abs(result.latitude - wgs84.latitude);
      const lngDiff = Math.abs(result.longitude - wgs84.longitude);

      expect(latDiff).toBeGreaterThan(0.001);
      expect(lngDiff).toBeGreaterThan(0.001);
    });

    it('結果が6桁に正規化される', () => {
      const wgs84 = { latitude: 35.68123456789, longitude: 139.76712345678 };
      const result = transformer.wgs84ToTokyo(wgs84);

      // 小数点以下6桁に丸められる
      expect(result.latitude.toString().split('.')[1]?.length).toBeLessThanOrEqual(6);
      expect(result.longitude.toString().split('.')[1]?.length).toBeLessThanOrEqual(6);
    });

    it('往復変換で元の値に戻る', () => {
      const original = { latitude: 35.6812, longitude: 139.7671 };
      const tokyo = transformer.wgs84ToTokyo(original);
      const result = transformer.tokyoToWgs84(tokyo);

      expect(result.latitude).toBeCloseTo(original.latitude, 5);
      expect(result.longitude).toBeCloseTo(original.longitude, 5);
    });
  });

  describe('tokyoToWgs84', () => {
    it('旧日本測地系座標をWGS84に変換する（東京駅）', () => {
      // 旧日本測地系での東京駅（概算値）
      const tokyo = { latitude: 35.6779, longitude: 139.7707 };
      const result = transformer.tokyoToWgs84(tokyo);

      // 旧日本測地系→WGS84では約400-500mのズレがある
      // 変換後の値が妥当な範囲にあることを確認
      expect(result.latitude).toBeGreaterThan(35.67);
      expect(result.latitude).toBeLessThan(35.69);
      expect(result.longitude).toBeGreaterThan(139.76);
      expect(result.longitude).toBeLessThan(139.78);
    });

    it('旧日本測地系からの変換で座標が変化する', () => {
      const tokyo = { latitude: 35.6812, longitude: 139.7671 };
      const result = transformer.tokyoToWgs84(tokyo);

      // 変換により値が変化することを確認
      // 旧日本測地系→WGS84では約0.003度程度のズレ
      const latDiff = Math.abs(result.latitude - tokyo.latitude);
      const lngDiff = Math.abs(result.longitude - tokyo.longitude);

      expect(latDiff).toBeGreaterThan(0.001);
      expect(lngDiff).toBeGreaterThan(0.001);
    });

    it('結果が6桁に正規化される', () => {
      const tokyo = { latitude: 35.6812, longitude: 139.7671 };
      const result = transformer.tokyoToWgs84(tokyo);

      expect(result.latitude.toString().split('.')[1]?.length).toBeLessThanOrEqual(6);
      expect(result.longitude.toString().split('.')[1]?.length).toBeLessThanOrEqual(6);
    });
  });
});
