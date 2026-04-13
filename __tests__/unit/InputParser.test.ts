import { InputParser } from '@/lib/services/InputParser';
import { ParsedCoordinate } from '@/lib/types';

describe('InputParser', () => {
  let parser: InputParser;

  beforeEach(() => {
    parser = new InputParser();
  });

  describe('十進度形式の判定', () => {
    describe('カンマ区切り', () => {
      it('35.6812, 139.7671 を正しくパースする', () => {
        const result = parser.parse('35.6812, 139.7671');
        expect(result.inputType).toBe('coordinate_decimal');
        expect(result.confidence).toBeGreaterThan(0.8);

        const coord = result.parsedData as ParsedCoordinate;
        expect(coord.latitude).toBeCloseTo(35.6812, 4);
        expect(coord.longitude).toBeCloseTo(139.7671, 4);
      });

      it('スペースなしのカンマ区切りを正しくパースする', () => {
        const result = parser.parse('35.6812,139.7671');
        expect(result.inputType).toBe('coordinate_decimal');

        const coord = result.parsedData as ParsedCoordinate;
        expect(coord.latitude).toBeCloseTo(35.6812, 4);
        expect(coord.longitude).toBeCloseTo(139.7671, 4);
      });

      it('全角数字を正しく処理する', () => {
        const result = parser.parse('３５.６８１２, １３９.７６７１');
        expect(result.inputType).toBe('coordinate_decimal');

        const coord = result.parsedData as ParsedCoordinate;
        expect(coord.latitude).toBeCloseTo(35.6812, 4);
        expect(coord.longitude).toBeCloseTo(139.7671, 4);
      });
    });

    describe('空白区切り', () => {
      it('35.6812 139.7671 を正しくパースする', () => {
        const result = parser.parse('35.6812 139.7671');
        expect(result.inputType).toBe('coordinate_decimal');

        const coord = result.parsedData as ParsedCoordinate;
        expect(coord.latitude).toBeCloseTo(35.6812, 4);
        expect(coord.longitude).toBeCloseTo(139.7671, 4);
      });

      it('複数スペースを正しく処理する', () => {
        const result = parser.parse('35.6812   139.7671');
        expect(result.inputType).toBe('coordinate_decimal');
      });
    });

    describe('負の座標', () => {
      it('負の緯度を正しくパースする', () => {
        const result = parser.parse('-35.6812, 139.7671');
        expect(result.inputType).toBe('coordinate_decimal');

        const coord = result.parsedData as ParsedCoordinate;
        expect(coord.latitude).toBeCloseTo(-35.6812, 4);
      });

      it('負の経度を正しくパースする', () => {
        const result = parser.parse('35.6812, -139.7671');
        expect(result.inputType).toBe('coordinate_decimal');

        const coord = result.parsedData as ParsedCoordinate;
        expect(coord.longitude).toBeCloseTo(-139.7671, 4);
      });
    });
  });

  describe('度分秒形式の判定', () => {
    it("35°40'52\"N 139°46'2\"E を正しくパースする", () => {
      const result = parser.parse('35°40\'52"N 139°46\'2"E');
      expect(result.inputType).toBe('coordinate_dms');
      expect(result.confidence).toBeGreaterThan(0.8);

      const coord = result.parsedData as ParsedCoordinate;
      expect(coord.latitude).toBeCloseTo(35.681111, 4);
      expect(coord.longitude).toBeCloseTo(139.767222, 4);
    });

    it("N/E なしの度分秒を正しくパースする", () => {
      const result = parser.parse('35°40\'52" 139°46\'2"');
      expect(result.inputType).toBe('coordinate_dms');

      const coord = result.parsedData as ParsedCoordinate;
      expect(coord.latitude).toBeCloseTo(35.681111, 4);
      expect(coord.longitude).toBeCloseTo(139.767222, 4);
    });

    it("南半球の座標を正しくパースする", () => {
      const result = parser.parse('35°40\'52"S 139°46\'2"E');
      expect(result.inputType).toBe('coordinate_dms');

      const coord = result.parsedData as ParsedCoordinate;
      expect(coord.latitude).toBeCloseTo(-35.681111, 4);
    });

    it("日本語の度分秒記号を正しくパースする", () => {
      const result = parser.parse('35度40分52秒 139度46分2秒');
      expect(result.inputType).toBe('coordinate_dms');

      const coord = result.parsedData as ParsedCoordinate;
      expect(coord.latitude).toBeCloseTo(35.681111, 4);
      expect(coord.longitude).toBeCloseTo(139.767222, 4);
    });
  });

  describe('不明形式の判定', () => {
    it('空文字列は unknown を返す', () => {
      const result = parser.parse('');
      expect(result.inputType).toBe('unknown');
      expect(result.confidence).toBe(0);
      expect(result.parsedData).toBeNull();
    });

    it('無効な入力は unknown を返す', () => {
      const result = parser.parse('abc xyz');
      expect(result.inputType).toBe('unknown');
    });

    it('範囲外の緯度は unknown を返す', () => {
      const result = parser.parse('100.0, 139.7671');
      expect(result.inputType).toBe('unknown');
    });

    it('範囲外の経度は unknown を返す', () => {
      const result = parser.parse('35.6812, 200.0');
      expect(result.inputType).toBe('unknown');
    });
  });
});
