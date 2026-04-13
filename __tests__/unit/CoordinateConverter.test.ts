import { CoordinateConverter } from '@/lib/services/CoordinateConverter';

describe('CoordinateConverter', () => {
  let converter: CoordinateConverter;

  beforeEach(() => {
    converter = new CoordinateConverter();
  });

  describe('dmsToDecimal', () => {
    it('度分秒を十進度に正しく変換する（東京駅）', () => {
      // 35°40'52"N → 35.681111...
      const result = converter.dmsToDecimal(35, 40, 52);
      expect(result).toBeCloseTo(35.681111, 5);
    });

    it('度分秒を十進度に正しく変換する（経度）', () => {
      // 139°46'2"E → 139.767222...
      const result = converter.dmsToDecimal(139, 46, 2);
      expect(result).toBeCloseTo(139.767222, 5);
    });

    it('負の度数を正しく処理する', () => {
      // -35°40'52" → -35.681111...
      const result = converter.dmsToDecimal(-35, 40, 52);
      expect(result).toBeCloseTo(-35.681111, 5);
    });

    it('0度を正しく処理する', () => {
      const result = converter.dmsToDecimal(0, 30, 0);
      expect(result).toBeCloseTo(0.5, 5);
    });
  });

  describe('decimalToDms', () => {
    it('十進度を度分秒に正しく変換する（東京駅緯度）', () => {
      const result = converter.decimalToDms(35.681111);
      expect(result.degrees).toBe(35);
      expect(result.minutes).toBe(40);
      expect(result.seconds).toBeCloseTo(52, 0);
    });

    it('十進度を度分秒に正しく変換する（経度）', () => {
      const result = converter.decimalToDms(139.767222);
      expect(result.degrees).toBe(139);
      expect(result.minutes).toBe(46);
      expect(result.seconds).toBeCloseTo(2, 0);
    });

    it('負の十進度を正しく処理する', () => {
      const result = converter.decimalToDms(-35.681111);
      expect(result.degrees).toBe(-35);
      expect(result.minutes).toBe(40);
      expect(result.seconds).toBeCloseTo(52, 0);
    });

    it('0度を正しく処理する', () => {
      const result = converter.decimalToDms(0.5);
      expect(result.degrees).toBe(0);
      expect(result.minutes).toBe(30);
      expect(result.seconds).toBeCloseTo(0, 0);
    });
  });

  describe('normalize', () => {
    it('座標を小数点以下6桁に正規化する', () => {
      const result = converter.normalize({
        latitude: 35.6811111111,
        longitude: 139.7672222222,
      });
      expect(result.latitude).toBe(35.681111);
      expect(result.longitude).toBe(139.767222);
    });

    it('丸め処理が正しく行われる', () => {
      const result = converter.normalize({
        latitude: 35.6811115,
        longitude: 139.7672225,
      });
      expect(result.latitude).toBe(35.681112);
      expect(result.longitude).toBe(139.767223);
    });

    it('負の座標を正しく処理する', () => {
      const result = converter.normalize({
        latitude: -35.6811111111,
        longitude: -139.7672222222,
      });
      expect(result.latitude).toBe(-35.681111);
      expect(result.longitude).toBe(-139.767222);
    });
  });
});
