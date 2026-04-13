import { ValidationService } from '@/lib/services/ValidationService';
import { LocationInput } from '@/lib/types';

describe('ValidationService', () => {
  let validator: ValidationService;

  beforeEach(() => {
    validator = new ValidationService();
  });

  describe('isWithinJapan', () => {
    it('東京駅は日本国内と判定される', () => {
      const coord = { latitude: 35.6812, longitude: 139.7671 };
      expect(validator.isWithinJapan(coord)).toBe(true);
    });

    it('沖縄は日本国内と判定される', () => {
      const coord = { latitude: 26.2124, longitude: 127.6809 };
      expect(validator.isWithinJapan(coord)).toBe(true);
    });

    it('北海道は日本国内と判定される', () => {
      const coord = { latitude: 43.0618, longitude: 141.3545 };
      expect(validator.isWithinJapan(coord)).toBe(true);
    });

    it('ニューヨークは日本国外と判定される', () => {
      const coord = { latitude: 40.7128, longitude: -74.006 };
      expect(validator.isWithinJapan(coord)).toBe(false);
    });

    it('ロンドンは日本国外と判定される', () => {
      const coord = { latitude: 51.5074, longitude: -0.1278 };
      expect(validator.isWithinJapan(coord)).toBe(false);
    });
  });

  describe('validateCoordinateOrder', () => {
    it('正しい順序（東京駅）はtrueを返す', () => {
      expect(validator.validateCoordinateOrder(35.6812, 139.7671)).toBe(true);
    });

    it('入れ替わった順序（経度, 緯度）はfalseを返す', () => {
      // 139.7671, 35.6812 → 緯度経度が逆
      expect(validator.validateCoordinateOrder(139.7671, 35.6812)).toBe(false);
    });

    it('日本国外の座標でも順序判定を行う', () => {
      // 緯度40, 経度-74 → ニューヨーク近辺、日本国外だが順序は正しい
      expect(validator.validateCoordinateOrder(40.7128, -74.006)).toBe(true);
    });
  });

  describe('suggestSwappedCoordinate', () => {
    it('入れ替わった座標に対して入れ替え候補を返す', () => {
      const coord = { latitude: 139.7671, longitude: 35.6812 };
      const swapped = validator.suggestSwappedCoordinate(coord);

      expect(swapped).not.toBeNull();
      expect(swapped!.latitude).toBe(35.6812);
      expect(swapped!.longitude).toBe(139.7671);
    });

    it('正しい座標に対してはnullを返す', () => {
      const coord = { latitude: 35.6812, longitude: 139.7671 };
      const swapped = validator.suggestSwappedCoordinate(coord);

      expect(swapped).toBeNull();
    });

    it('日本国外の座標にはnullを返す', () => {
      const coord = { latitude: 40.7128, longitude: -74.006 };
      const swapped = validator.suggestSwappedCoordinate(coord);

      expect(swapped).toBeNull();
    });
  });

  describe('generateWarnings', () => {
    it('低い確信度で警告を生成する', () => {
      const input: LocationInput = {
        rawInput: '35.6812, 139.7671',
        inputType: 'coordinate_decimal',
        confidence: 0.5,
        parsedData: {
          latitude: 35.6812,
          longitude: 139.7671,
          originalFormat: 'decimal',
        },
      };
      const coord = { latitude: 35.6812, longitude: 139.7671 };

      const warnings = validator.generateWarnings(input, coord);

      expect(warnings.some((w) => w.type === 'low_confidence')).toBe(true);
    });

    it('日本国外の座標で警告を生成する', () => {
      const input: LocationInput = {
        rawInput: '40.7128, -74.006',
        inputType: 'coordinate_decimal',
        confidence: 0.9,
        parsedData: {
          latitude: 40.7128,
          longitude: -74.006,
          originalFormat: 'decimal',
        },
      };
      const coord = { latitude: 40.7128, longitude: -74.006 };

      const warnings = validator.generateWarnings(input, coord);

      expect(warnings.some((w) => w.type === 'outside_japan')).toBe(true);
    });

    it('緯度経度が入れ替わっている場合に警告を生成する', () => {
      const input: LocationInput = {
        rawInput: '139.7671, 35.6812',
        inputType: 'coordinate_decimal',
        confidence: 0.9,
        parsedData: {
          latitude: 139.7671,
          longitude: 35.6812,
          originalFormat: 'decimal',
        },
      };
      const coord = { latitude: 139.7671, longitude: 35.6812 };

      const warnings = validator.generateWarnings(input, coord);

      expect(warnings.some((w) => w.type === 'coordinate_swap_suggested')).toBe(
        true
      );
    });

    it('正常な入力では警告を生成しない', () => {
      const input: LocationInput = {
        rawInput: '35.6812, 139.7671',
        inputType: 'coordinate_decimal',
        confidence: 0.9,
        parsedData: {
          latitude: 35.6812,
          longitude: 139.7671,
          originalFormat: 'decimal',
        },
      };
      const coord = { latitude: 35.6812, longitude: 139.7671 };

      const warnings = validator.generateWarnings(input, coord);

      expect(warnings.length).toBe(0);
    });
  });
});
