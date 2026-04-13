# 開発ガイドライン (Development Guidelines)

## コーディング規約

### 命名規則

#### 変数・関数

**TypeScript/JavaScript**:
```typescript
// ✅ 良い例
const coordinateInput = '35.6812, 139.7671';
const parsedLocation = parseLocationInput(input);
function convertToDecimal(dms: DmsCoordinate): number { }

// ❌ 悪い例
const inp = '35.6812, 139.7671';
const loc = parse(inp);
function conv(d: any): number { }
```

**原則**:
- 変数: camelCase、名詞または名詞句
- 関数: camelCase、動詞で始める
- 定数: UPPER_SNAKE_CASE
- Boolean: `is`, `has`, `should`, `can`で始める

```typescript
// Boolean の命名例
const isValidCoordinate = true;
const hasWarning = false;
const shouldShowMap = true;
const canCopyToClipboard = navigator.clipboard !== undefined;
```

#### クラス・インターフェース

```typescript
// クラス: PascalCase、名詞
class InputParser { }
class ConversionService { }
class MapUrlGenerator { }

// インターフェース: PascalCase
interface Coordinate { }
interface ConversionResult { }
interface Warning { }

// 型エイリアス: PascalCase
type InputType = 'coordinate_decimal' | 'coordinate_dms' | 'address' | 'unknown';
type Datum = 'WGS84' | 'JGD2011' | 'TOKYO';
type WarningType = 'coordinate_order_ambiguous' | 'datum_uncertain' | 'outside_japan';
```

#### Reactコンポーネント

```typescript
// コンポーネント: PascalCase
function LocationInput({ onSubmit }: LocationInputProps) { }
function ConversionResult({ result }: ConversionResultProps) { }
function MapButtons({ urls }: MapButtonsProps) { }

// カスタムフック: useプレフィックス
function useConversion() { }
function useClipboard() { }
function useLocalStorage<T>(key: string) { }
```

### コードフォーマット

**インデント**: 2スペース

**行の長さ**: 最大100文字

**Prettier設定**:
```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "arrowParens": "always"
}
```

### コメント規約

**関数・クラスのドキュメント (TSDoc)**:
```typescript
/**
 * 入力文字列を解析して位置情報の種別を判定する
 *
 * @param input - 解析対象の入力文字列
 * @returns 解析結果（入力種別、パース済みデータ、確信度）
 * @throws {ValidationError} 入力が空の場合
 *
 * @example
 * ```typescript
 * const result = parser.parse('35.6812, 139.7671');
 * // result.inputType === 'coordinate_decimal'
 * ```
 */
function parse(input: string): LocationInput {
  // 実装
}
```

**インラインコメント**:
```typescript
// ✅ 良い例: なぜそうするかを説明
// 日本の緯度範囲（約20°〜46°）で判定
const isLatInRange = lat >= 20 && lat <= 46;

// WGS84とJGD2011の差は最大約10mなので、通常は区別不要
// 旧日本測地系との差は約400-500mあり検出可能
const datumDifference = calculateDatumDifference(coord);

// ❌ 悪い例: 何をしているか（コードを見れば分かる）
// 緯度が20以上46以下かチェック
const isLatInRange = lat >= 20 && lat <= 46;
```

### エラーハンドリング

**カスタムエラークラス**:
```typescript
// 検証エラー
class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// パースエラー
class ParseError extends Error {
  constructor(
    message: string,
    public input: string,
    public position?: number
  ) {
    super(message);
    this.name = 'ParseError';
  }
}
```

**エラーハンドリングパターン**:
```typescript
// ✅ 良い例: 適切なエラーハンドリング
function parseCoordinate(input: string): ParsedCoordinate {
  if (!input || input.trim().length === 0) {
    throw new ValidationError('位置情報を入力してください', 'input', input);
  }

  const result = tryParseDecimal(input) || tryParseDms(input);

  if (!result) {
    throw new ParseError('座標の形式を判定できませんでした', input);
  }

  return result;
}

// Reactコンポーネントでのエラーハンドリング
function useConversion() {
  const [error, setError] = useState<string | null>(null);

  const convert = async (input: string) => {
    try {
      setError(null);
      return await conversionService.convert(input);
    } catch (err) {
      if (err instanceof ValidationError) {
        setError(err.message);
      } else if (err instanceof ParseError) {
        setError(`入力を解析できませんでした: ${err.message}`);
      } else {
        setError('予期しないエラーが発生しました');
        console.error('Unexpected error:', err);
      }
      return null;
    }
  };

  return { convert, error };
}
```

### 型定義

**型注釈の原則**:
```typescript
// ✅ 良い例: 明示的な型注釈
function calculateDistance(
  from: Coordinate,
  to: Coordinate
): number {
  // 実装
}

// ❌ 悪い例: any型の使用
function calculateDistance(from: any, to: any) {
  // 実装
}
```

**インターフェース vs 型エイリアス**:
```typescript
// インターフェース: オブジェクト型、拡張が必要な場合
interface Coordinate {
  latitude: number;
  longitude: number;
}

interface ExtendedCoordinate extends Coordinate {
  altitude?: number;
}

// 型エイリアス: ユニオン型、プリミティブ型
type InputType = 'coordinate_decimal' | 'coordinate_dms' | 'address' | 'unknown';
type Nullable<T> = T | null;
```

### 関数設計

**単一責務の原則**:
```typescript
// ✅ 良い例: 単一の責務
function parseDecimalCoordinate(input: string): ParsedCoordinate | null {
  // 十進度座標のパースのみ
}

function parseDmsCoordinate(input: string): ParsedCoordinate | null {
  // 度分秒座標のパースのみ
}

function validateCoordinateRange(coord: Coordinate): Warning[] {
  // 座標範囲の検証のみ
}

// ❌ 悪い例: 複数の責務
function parseAndValidateCoordinate(input: string): { coord: Coordinate; warnings: Warning[] } {
  // パースと検証を両方行う
}
```

**パラメータの数**:
```typescript
// ✅ 良い例: オブジェクトでまとめる
interface ConversionOptions {
  input: string;
  assumedDatum?: Datum;
  generateMapUrls?: boolean;
}

function convert(options: ConversionOptions): ConversionResult {
  // 実装
}

// ❌ 悪い例: パラメータが多すぎる
function convert(
  input: string,
  assumedDatum: Datum,
  generateMapUrls: boolean,
  includeWarnings: boolean,
  saveToHistory: boolean
): ConversionResult {
  // 実装
}
```

## Git運用ルール

### ブランチ戦略（Git Flow採用）

**ブランチ構成**:
```
main (本番環境)
└── develop (開発・統合環境)
    ├── feature/* (新機能開発)
    ├── fix/* (バグ修正)
    └── refactor/* (リファクタリング)
```

**ブランチ種別**:
- `main`: 本番環境にデプロイ可能な状態
- `develop`: 開発の最新状態
- `feature/[機能名]`: 新機能開発（例: `feature/coordinate-input`）
- `fix/[修正内容]`: バグ修正（例: `fix/dms-parse-error`）
- `refactor/[対象]`: リファクタリング（例: `refactor/input-parser`）

**運用ルール**:
- `main`への直接コミット禁止
- すべての変更はPR経由でマージ
- マージ前にCI（テスト、lint、型チェック）が通ること

### コミットメッセージ規約

**フォーマット（Conventional Commits）**:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type**:
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: コードフォーマット（動作に影響なし）
- `refactor`: リファクタリング
- `perf`: パフォーマンス改善
- `test`: テスト追加・修正
- `chore`: ビルド、依存関係等

**例**:
```
feat(parser): 度分秒形式の座標パースを実装

緯度経度の度分秒表記（35°40'52"N 139°46'2"E）をパースできるようにしました。

実装内容:
- DmsCoordinateParserクラスの追加
- 複数の表記パターンに対応（記号あり/なし、N/S/E/W表記）
- 入力正規化処理の追加

Closes #15
```

### プルリクエストプロセス

**作成前のチェック**:
- [ ] 全てのテストがパス
- [ ] Lintエラーがない
- [ ] 型チェックがパス
- [ ] 競合が解決されている

**PRテンプレート**:
```markdown
## 概要
[変更内容の簡潔な説明]

## 変更理由
[なぜこの変更が必要か]

## 変更内容
- [変更点1]
- [変更点2]

## テスト
- [ ] ユニットテスト追加
- [ ] 手動テスト実施

## スクリーンショット（該当する場合）
[画像]

## 関連Issue
Closes #[Issue番号]
```

**レビュープロセス**:
1. セルフレビュー
2. 自動テスト実行（CI）
3. レビュアーアサイン
4. レビューフィードバック対応
5. 承認後マージ（Squash merge推奨）

## テスト戦略

### テストの種類

**テストピラミッド**:
```
       /\
      /E2E\       少 (遅い、高コスト)
     /------\
    / 統合   \     中
   /----------\
  / ユニット   \   多 (速い、低コスト)
 /--------------\
```

**目標比率**:
- ユニットテスト: 70%
- 統合テスト: 20%
- E2Eテスト: 10%

### ユニットテスト

**対象**: 個別の関数・クラス

**カバレッジ目標**: 80%以上（サービスレイヤー）

**例**:
```typescript
describe('InputParser', () => {
  describe('parse', () => {
    it('十進度形式の座標を正しく判定する', () => {
      // Given
      const parser = new InputParser();
      const input = '35.6812, 139.7671';

      // When
      const result = parser.parse(input);

      // Then
      expect(result.inputType).toBe('coordinate_decimal');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.parsedData).toEqual({
        latitude: 35.6812,
        longitude: 139.7671,
      });
    });

    it('空の入力でValidationErrorをスローする', () => {
      // Given
      const parser = new InputParser();
      const input = '';

      // When/Then
      expect(() => parser.parse(input)).toThrow(ValidationError);
    });
  });
});
```

### 統合テスト

**対象**: 複数コンポーネントの連携

**例**:
```typescript
describe('Conversion Flow', () => {
  it('入力から地図URL生成まで一連の処理が正しく動作する', async () => {
    // Given
    const service = new ConversionService();
    const input = '35.6812, 139.7671';

    // When
    const result = await service.convert(input);

    // Then
    expect(result.coordinates.wgs84).toEqual({
      latitude: 35.6812,
      longitude: 139.7671,
    });
    expect(result.mapUrls.googleMaps).toContain('35.6812');
    expect(result.mapUrls.googleMaps).toContain('139.7671');
    expect(result.warnings).toHaveLength(0);
  });
});
```

### E2Eテスト

**対象**: ユーザーシナリオ全体

**ツール**: Playwright

**例**:
```typescript
describe('座標変換フロー', () => {
  it('ユーザーが座標を入力して地図を開ける', async ({ page }) => {
    // ページを開く
    await page.goto('/');

    // 座標を入力
    await page.fill('[data-testid="location-input"]', '35.6812, 139.7671');
    await page.click('[data-testid="convert-button"]');

    // 結果を確認
    await expect(page.locator('[data-testid="wgs84-result"]')).toContainText('35.681200');
    await expect(page.locator('[data-testid="warning-display"]')).toBeHidden();

    // 地図ボタンが有効になっている
    await expect(page.locator('[data-testid="google-maps-button"]')).toBeEnabled();
  });
});
```

### テスト命名規則

**パターン**: `[対象]_[条件]_[期待結果]` または日本語で明確に記述

```typescript
// ✅ 良い例
it('十進度形式の座標を正しく判定する', () => { });
it('空の入力でValidationErrorをスローする', () => { });
it('日本国外の座標で警告を生成する', () => { });

// ❌ 悪い例
it('test1', () => { });
it('works', () => { });
it('should work correctly', () => { });
```

## コードレビュー基準

### レビューポイント

**機能性**:
- [ ] 要件（PRD/受け入れ条件）を満たしているか
- [ ] エッジケースが考慮されているか
- [ ] エラーハンドリングが適切か

**可読性**:
- [ ] 命名が明確か
- [ ] コメントが適切か
- [ ] 複雑なロジックが説明されているか

**保守性**:
- [ ] 重複コードがないか
- [ ] 責務が明確に分離されているか
- [ ] 変更の影響範囲が限定的か

**パフォーマンス**:
- [ ] 不要な計算がないか
- [ ] 適切なデータ構造を使用しているか

**セキュリティ**:
- [ ] 入力検証が適切か
- [ ] 機密情報がハードコードされていないか

### レビューコメントの書き方

**優先度の明示**:
- `[必須]`: 修正必須
- `[推奨]`: 修正推奨
- `[提案]`: 検討してほしい
- `[質問]`: 理解のための質問

**建設的なフィードバック**:
```markdown
## ✅ 良い例
[推奨] この実装だと座標が日本国外の場合にパフォーマンスが低下する可能性があります。
早期リターンを追加してはどうでしょうか？

```typescript
if (!isWithinJapan(coord)) {
  return [{ type: 'outside_japan', ... }];
}
```

## ❌ 悪い例
この書き方は良くないです。
```

## 開発環境セットアップ

### 必要なツール

| ツール | バージョン | インストール方法 |
|--------|-----------|-----------------|
| Node.js | v24.11.0 | [nvm](https://github.com/nvm-sh/nvm) または [公式サイト](https://nodejs.org/) |
| npm | 11.x | Node.jsに同梱 |
| Git | 2.x | [公式サイト](https://git-scm.com/) |

### セットアップ手順

```bash
# 1. リポジトリのクローン
git clone https://github.com/[org]/ichi-link.git
cd ichi-link

# 2. 依存関係のインストール
npm install

# 3. 開発サーバーの起動
npm run dev
```

### 利用可能なnpmスクリプト

```bash
npm run dev        # 開発サーバー起動
npm run build      # 本番ビルド
npm run preview    # ビルド結果のプレビュー
npm run test       # テスト実行
npm run test:watch # テスト（watchモード）
npm run lint       # Lintチェック
npm run lint:fix   # Lint自動修正
npm run typecheck  # 型チェック
npm run format     # コードフォーマット
```

### 推奨VS Code拡張機能

- **ESLint**: dbaeumer.vscode-eslint
- **Prettier**: esbenp.prettier-vscode
- **TypeScript**: ms-vscode.vscode-typescript-next
- **Tailwind CSS IntelliSense**: bradlc.vscode-tailwindcss

### VS Code設定（.vscode/settings.json）

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## 自動化設定

### CI/CD（GitHub Actions）

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - run: npm run build
```

### Pre-commit フック（Husky + lint-staged）

```json
// package.json
{
  "scripts": {
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

```bash
# .husky/pre-commit
npm run lint-staged
npm run typecheck
```
