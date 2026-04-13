# 設計書

## アーキテクチャ概要

レイヤードアーキテクチャを採用。UIレイヤーはサービスレイヤーに依存し、サービスレイヤーは独立してテスト可能。

```
┌─────────────────────────────────────────┐
│   UIレイヤー (React Components)          │ ← ユーザー入力の受付と結果表示
│   - LocationInput                        │
│   - ConversionResult                     │
│   - WarningDisplay                       │
│   - MapButtons                           │
│   - CopyButton                           │
├─────────────────────────────────────────┤
│   サービスレイヤー (Domain Services)      │ ← 座標変換・判定ロジック
│   - InputParser                          │
│   - CoordinateConverter                  │
│   - DatumTransformer                     │
│   - ValidationService                    │
│   - MapUrlGenerator                      │
│   - ConversionService (統合)             │
├─────────────────────────────────────────┤
│   データレイヤー (Storage) [将来]         │ ← 履歴の永続化
│   - HistoryStorage                       │
└─────────────────────────────────────────┘
```

## コンポーネント設計

### 1. InputParser

**責務**:
- 入力文字列の種別を自動判定
- 十進度/度分秒座標のパース
- 確信度の計算

**実装の要点**:
- 正規表現による入力パターンマッチ
- 全角数字→半角数字の正規化
- 複数パターンの優先順位付き判定

### 2. CoordinateConverter

**責務**:
- 度分秒 → 十進度 変換
- 十進度 → 度分秒 変換
- 座標の正規化（6桁）

**実装の要点**:
- 純粋な計算処理（外部依存なし）
- 浮動小数点精度の考慮

### 3. DatumTransformer

**責務**:
- WGS84 ↔ JGD2011 変換
- Tokyo Datum → WGS84 変換

**実装の要点**:
- proj4jsライブラリを使用
- 測地系定義の事前登録

### 4. ValidationService

**責務**:
- 日本国内座標の検証
- 緯度経度順序の検証
- 警告生成

**実装の要点**:
- 日本の緯度範囲: 20°〜46°
- 日本の経度範囲: 122°〜154°

### 5. MapUrlGenerator

**責務**:
- 4つの地図サービスURL生成

**実装の要点**:
- URLエンコードによるXSS対策
- 各サービスのURL形式を正確に

### 6. ConversionService

**責務**:
- 全サービスの統合
- 変換フロー全体のオーケストレーション

**実装の要点**:
- 各サービスをDIで受け取る
- エラーハンドリングの一元化

## データフロー

### 座標入力→地図起動

```
1. ユーザーが座標を入力（例: "35.6812, 139.7671"）
2. InputParser.parse() で入力種別を判定
3. CoordinateConverter.normalize() で座標を正規化
4. DatumTransformer.wgs84ToJgd2011() でJGD2011座標を生成
5. ValidationService.generateWarnings() で警告を生成
6. MapUrlGenerator.generateAll() で地図URLを生成
7. UIに結果を表示
8. ユーザーが地図ボタンをクリック → 地図が開く
```

## エラーハンドリング戦略

### カスタムエラークラス

```typescript
// 入力検証エラー
class ValidationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// パースエラー
class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}
```

### エラーハンドリングパターン

- 空入力: ValidationError('位置情報を入力してください')
- 判定不能: 結果をnullで返し、UIで「判定できませんでした」を表示
- 座標範囲外: 警告を追加して結果を返す（処理は続行）

## テスト戦略

### ユニットテスト

- InputParser: 各入力パターンの判定
  - 十進度: "35.6812, 139.7671"
  - 度分秒: "35°40'52\"N 139°46'2\"E"
  - 空白区切り: "35.6812 139.7671"
- CoordinateConverter: 変換精度
- DatumTransformer: 測地系変換精度
- ValidationService: 警告生成条件
- MapUrlGenerator: URL形式

### 統合テスト

- ConversionService: 入力から結果までの一連フロー
- 各種入力パターンの網羅

## 依存ライブラリ

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "proj4": "^2.9.0"
  },
  "devDependencies": {
    "typescript": "~5.3.0",
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "@types/proj4": "^2.5.0",
    "tailwindcss": "^3.0.0",
    "postcss": "^8.0.0",
    "autoprefixer": "^10.0.0",
    "jest": "^29.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0"
  }
}
```

## ディレクトリ構造

```
ichi-link/
├── app/
│   ├── layout.tsx           # ルートレイアウト
│   ├── page.tsx             # メインページ
│   └── globals.css          # グローバルスタイル
├── components/
│   ├── input/
│   │   └── LocationInput.tsx
│   ├── result/
│   │   ├── ConversionResult.tsx
│   │   ├── WarningDisplay.tsx
│   │   └── MapButtons.tsx
│   ├── common/
│   │   └── CopyButton.tsx
│   └── hooks/
│       └── useConversion.ts
├── lib/
│   ├── services/
│   │   ├── InputParser.ts
│   │   ├── CoordinateConverter.ts
│   │   ├── DatumTransformer.ts
│   │   ├── ValidationService.ts
│   │   ├── MapUrlGenerator.ts
│   │   └── ConversionService.ts
│   └── types/
│       ├── coordinate.ts
│       ├── input.ts
│       └── result.ts
├── __tests__/
│   └── unit/
│       ├── InputParser.test.ts
│       ├── CoordinateConverter.test.ts
│       ├── DatumTransformer.test.ts
│       ├── ValidationService.test.ts
│       ├── MapUrlGenerator.test.ts
│       └── ConversionService.test.ts
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── jest.config.js
└── package.json
```

## 実装の順序

### フェーズ1: サービス層（テスト可能なビジネスロジック）

1. 型定義（lib/types/）
2. CoordinateConverter
3. InputParser
4. DatumTransformer
5. ValidationService
6. MapUrlGenerator
7. ConversionService
8. 各サービスのユニットテスト

### フェーズ2: プロジェクトセットアップ

1. Next.jsプロジェクト初期化
2. 依存関係インストール
3. 設定ファイル作成

### フェーズ3: UIレイヤー

1. CopyButton（共通コンポーネント）
2. LocationInput
3. WarningDisplay
4. MapButtons
5. ConversionResult
6. useConversionフック
7. メインページ統合

### フェーズ4: 品質チェック

1. 全テスト実行
2. リント・型チェック
3. ビルド確認

## セキュリティ考慮事項

- URL生成時のパラメータエスケープ（encodeURIComponent）
- ユーザー入力の表示時はReactの自動エスケープを活用
- dangerouslySetInnerHTMLは使用しない

## パフォーマンス考慮事項

- 入力判定はデバウンス不要（変換ボタンクリック時のみ実行）
- proj4jsの測地系定義は初期化時に1回のみ登録
- 地図URLは変換結果表示時に生成（遅延なし）

## 将来の拡張性

- MapUrlGeneratorはMapServiceインターフェースでプラグイン化可能
- DatumTransformerは新しい測地系定義を追加可能
- データレイヤー（HistoryStorage）は後から追加可能
