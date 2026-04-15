# リポジトリ構造定義書 (Repository Structure Document)

## プロジェクト構造

```
ichi-link/
├── app/                       # Next.js App Router
│   ├── layout.tsx             # ルートレイアウト
│   ├── page.tsx               # メインページ
│   └── globals.css            # グローバルスタイル
├── components/                # Reactコンポーネント
│   ├── input/                 # 入力関連
│   ├── result/                # 結果表示
│   └── common/                # 共通コンポーネント
├── lib/                       # ビジネスロジック
│   ├── services/              # サービス層
│   ├── storage/               # データ永続化
│   └── types/                 # TypeScript型定義
├── __tests__/                 # テストコード
│   ├── unit/                  # ユニットテスト
│   ├── integration/           # 統合テスト
│   └── e2e/                   # E2Eテスト
├── docs/                      # プロジェクトドキュメント
│   └── ideas/                 # アイデア・壁打ちメモ
├── public/                    # 静的ファイル
├── .claude/                   # Claude Code設定
│   ├── commands/              # スラッシュコマンド
│   └── skills/                # スキル定義
└── .steering/                 # ステアリングファイル（作業単位）
```

## ディレクトリ詳細

### app/ (Next.js App Router)

**役割**: ページとルーティングの定義、API Routes

**配置ファイル**:
- `page.tsx`: ページコンポーネント
- `layout.tsx`: レイアウトコンポーネント
- `loading.tsx`: ローディングUI（オプション）
- `error.tsx`: エラーUI（オプション）
- `globals.css`: グローバルスタイル
- `api/*/route.ts`: API Routes（Next.js App Router形式）

**命名規則**:
- ファイル名は固定（Next.js規約）

**構造**:
```
app/
├── layout.tsx                 # ルートレイアウト
├── page.tsx                   # メインページ（/）
├── globals.css                # グローバルスタイル
├── favicon.ico                # ファビコン
└── api/                       # API Routes
    ├── geocode/
    │   └── route.ts           # Yahoo!ジオコーダAPI中継
    └── pois/
        ├── route.ts           # GET /api/pois（POI一覧取得）
        └── [id]/
            └── route.ts       # GET /api/pois/{id}（POI詳細取得）
```

### components/ (UIレイヤー)

**役割**: 再利用可能なReactコンポーネントの配置

**配置ファイル**:
- `*.tsx`: Reactコンポーネント
- `*.css`: コンポーネント固有のスタイル（Tailwindで不足する場合のみ）

**命名規則**:
- コンポーネント: PascalCase（例: `LocationInput.tsx`）
- フック: `use`プレフィックス（例: `useConversion.ts`）

**依存関係**:
- 依存可能: lib/services/, lib/types/
- 依存禁止: lib/storage/（サービス経由でアクセス）

**サブディレクトリ構造**:
```
components/
├── input/                     # 入力関連コンポーネント
│   └── LocationInput.tsx
├── result/                    # 結果表示コンポーネント
│   ├── ConversionResult.tsx
│   ├── WarningDisplay.tsx
│   └── MapButtons.tsx
├── map/                       # マップ関連コンポーネント
│   ├── MapView.tsx            # Mapbox地図表示
│   ├── POILayer.tsx           # POIレイヤー表示
│   └── LayerToggle.tsx        # レイヤー切替UI
├── panel/                     # パネル関連コンポーネント
│   ├── SlidePanel.tsx         # スライドパネル
│   └── POIDetail.tsx          # POI詳細表示
├── common/                    # 共通コンポーネント
│   ├── CopyButton.tsx
│   └── LoadingSpinner.tsx
└── hooks/                     # カスタムフック
    ├── useConversion.ts
    ├── usePOI.ts              # POIデータ取得
    └── useLayerState.ts       # レイヤー表示状態管理
```

### lib/ (ビジネスロジック)

**役割**: ビジネスロジック、型定義、データ永続化

#### lib/services/ (サービスレイヤー)

**役割**: ビジネスロジックの実装

**配置ファイル**:
- `*Service.ts`: サービスクラス
- `*Parser.ts`: パーサークラス
- `*Generator.ts`: ジェネレータークラス

**命名規則**:
- クラス: PascalCase + 役割接尾辞（例: `InputParser.ts`）
- 関数: camelCase（例: `formatCoordinate.ts`）

**依存関係**:
- 依存可能: lib/storage/, lib/types/, 外部ライブラリ（proj4）
- 依存禁止: components/, app/

**サブディレクトリ構造**:
```
lib/services/
├── parser/                    # 入力パース
│   ├── InputParser.ts
│   ├── DecimalCoordinateParser.ts
│   └── DmsCoordinateParser.ts
├── converter/                 # 座標変換
│   ├── CoordinateConverter.ts
│   └── DatumTransformer.ts
├── validator/                 # 検証・警告
│   └── ValidationService.ts
├── generator/                 # URL生成
│   └── MapUrlGenerator.ts
├── poi/                       # POIデータ管理（フロントエンド用）
│   └── POIService.ts          # 自前API呼び出し・キャッシュ管理
└── ConversionService.ts       # ファサード（統合サービス）
```

#### lib/server/ (サーバーサイドロジック)

**役割**: API Routes用のバックエンドロジック

**配置ファイル**:
- `*Repository.ts`: データベースアクセス
- `*Sync.ts`: 外部データソースとの同期

**依存関係**:
- 依存可能: lib/types/, 外部ライブラリ（DB接続等）
- 依存禁止: components/, lib/services/（クライアント用）

**サブディレクトリ構造**:
```
lib/server/
├── poi/
│   ├── POIRepository.ts       # POIデータベースアクセス
│   ├── POIQueryBuilder.ts     # bbox/zoom条件によるクエリ構築
│   └── POISync.ts             # 公開データソースからの同期
├── db/
│   ├── connection.ts          # DB接続設定
│   └── migrations/            # スキーママイグレーション
└── sync/
    ├── AEDDataFetcher.ts      # AEDオープンデータ取得
    └── FireHydrantDataFetcher.ts  # 消火栓データ取得
```

#### lib/storage/ (データレイヤー)

**役割**: データの永続化

**配置ファイル**:
- `*Storage.ts`: ストレージクラス

**命名規則**:
- クラス: PascalCase + `Storage`接尾辞（例: `HistoryStorage.ts`）

**依存関係**:
- 依存可能: lib/types/
- 依存禁止: components/, lib/services/

**構造**:
```
lib/storage/
├── HistoryStorage.ts          # 履歴保存
└── SettingsStorage.ts         # 設定保存（将来）
```

#### lib/types/ (型定義)

**役割**: TypeScript型定義の共有

**配置ファイル**:
- `*.ts`: 型定義ファイル

**命名規則**:
- インターフェース/型: PascalCase（例: `Coordinate.ts`）
- 定数: UPPER_SNAKE_CASE（定数定義時）

**依存関係**:
- 依存可能: なし
- 依存禁止: すべてのレイヤー（型定義は他に依存しない）

**構造**:
```
lib/types/
├── coordinate.ts              # 座標関連の型
├── input.ts                   # 入力関連の型
├── result.ts                  # 結果関連の型
├── warning.ts                 # 警告関連の型
├── poi.ts                     # POI関連の型
├── layer.ts                   # レイヤー関連の型
└── index.ts                   # 型のre-export
```

### __tests__/ (テストディレクトリ)

**役割**: Jest/React Testing Libraryによるテストコード

#### unit/

**役割**: ユニットテストの配置

**構造**:
```
__tests__/unit/
└── services/                  # サービスレイヤーのテスト
    ├── parser/
    │   └── InputParser.test.ts
    ├── converter/
    │   ├── CoordinateConverter.test.ts
    │   └── DatumTransformer.test.ts
    ├── validator/
    │   └── ValidationService.test.ts
    └── generator/
        └── MapUrlGenerator.test.ts
```

**命名規則**:
- パターン: `[テスト対象ファイル名].test.ts`
- 例: `InputParser.ts` → `InputParser.test.ts`

#### integration/

**役割**: 統合テストの配置

**構造**:
```
__tests__/integration/
├── conversion-flow.test.ts    # 変換フロー全体
└── history-storage.test.ts    # 履歴保存・取得
```

#### e2e/

**役割**: E2Eテストの配置

**構造**:
```
__tests__/e2e/
├── coordinate-conversion.test.ts   # 座標変換シナリオ
├── map-launch.test.ts              # 地図起動シナリオ
└── copy-feature.test.ts            # コピー機能シナリオ
```

### docs/ (ドキュメントディレクトリ)

**配置ドキュメント**:
- `product-requirements.md`: プロダクト要求定義書
- `functional-design.md`: 機能設計書
- `architecture.md`: アーキテクチャ設計書
- `repository-structure.md`: リポジトリ構造定義書（本ドキュメント）
- `development-guidelines.md`: 開発ガイドライン
- `glossary.md`: 用語集

**サブディレクトリ**:
- `ideas/`: アイデア・壁打ちメモ

### public/ (静的ファイルディレクトリ)

**役割**: Next.jsの静的アセット配置

**配置ファイル**:
- 画像ファイル（.png, .jpg, .svg等）
- アイコンファイル
- その他の静的アセット

**注意**: Next.jsではfavicon.icoはapp/ディレクトリに配置

### .claude/ (Claude Code設定)

**役割**: Claude Code設定とカスタマイズ

**構造**:
```
.claude/
├── commands/                  # スラッシュコマンド定義
└── skills/                    # スキル定義
    ├── prd-writing/
    ├── functional-design/
    ├── architecture-design/
    ├── repository-structure/
    ├── development-guidelines/
    └── glossary-creation/
```

### .steering/ (ステアリングファイル)

**役割**: 特定の開発作業における「今回何をするか」を定義

**構造**:
```
.steering/
└── [YYYYMMDD]-[task-name]/
    ├── requirements.md        # 今回の作業の要求内容
    ├── design.md              # 変更内容の設計
    └── tasklist.md            # タスクリスト
```

**命名規則**: `20250115-add-coordinate-input` 形式

## ファイル配置規則

### ソースファイル

| ファイル種別 | 配置先 | 命名規則 | 例 |
|------------|--------|---------|-----|
| ページコンポーネント | app/ | page.tsx (固定) | app/page.tsx |
| レイアウト | app/ | layout.tsx (固定) | app/layout.tsx |
| Reactコンポーネント | components/ | PascalCase.tsx | LocationInput.tsx |
| カスタムフック | components/hooks/ | useCamelCase.ts | useConversion.ts |
| サービスクラス | lib/services/ | PascalCaseService.ts | ConversionService.ts |
| パーサークラス | lib/services/parser/ | PascalCaseParser.ts | InputParser.ts |
| ストレージクラス | lib/storage/ | PascalCaseStorage.ts | HistoryStorage.ts |
| 型定義 | lib/types/ | camelCase.ts | coordinate.ts |

### テストファイル

| テスト種別 | 配置先 | 命名規則 | 例 |
|-----------|--------|---------|-----|
| ユニットテスト | __tests__/unit/ | [対象].test.ts | InputParser.test.ts |
| 統合テスト | __tests__/integration/ | [機能].test.ts | conversion-flow.test.ts |
| E2Eテスト | __tests__/e2e/ | [シナリオ].test.ts | coordinate-conversion.test.ts |

### 設定ファイル

| ファイル種別 | 配置先 | 命名規則 |
|------------|--------|---------|
| Next.js設定 | プロジェクトルート | next.config.js |
| TypeScript設定 | プロジェクトルート | tsconfig.json |
| ESLint設定 | プロジェクトルート | eslint.config.js |
| Prettier設定 | プロジェクトルート | .prettierrc |
| Tailwind設定 | プロジェクトルート | tailwind.config.js |
| 環境変数 | プロジェクトルート | .env, .env.local |

## 命名規則

### ディレクトリ名

- **レイヤーディレクトリ**: 複数形、kebab-case
  - 例: `components/`, `services/`, `types/`
- **機能ディレクトリ**: 単数形または複数形、kebab-case
  - 例: `parser/`, `converter/`, `validator/`
- **コンポーネントカテゴリ**: 単数形、kebab-case
  - 例: `input/`, `result/`, `common/`

### ファイル名

- **Reactコンポーネント**: PascalCase + `.tsx`
  - 例: `LocationInput.tsx`, `ConversionResult.tsx`
- **カスタムフック**: `use` + PascalCase + `.ts`
  - 例: `useConversion.ts`, `useClipboard.ts`
- **サービスクラス**: PascalCase + 役割接尾辞 + `.ts`
  - 例: `InputParser.ts`, `ValidationService.ts`
- **型定義**: camelCase + `.ts`
  - 例: `coordinate.ts`, `input.ts`
- **定数ファイル**: kebab-case + `.ts`
  - 例: `map-services.ts`, `error-messages.ts`

### テストファイル名

- パターン: `[テスト対象].test.ts`
- 例: `InputParser.test.ts`, `conversion-flow.test.ts`

## 依存関係のルール

### レイヤー間の依存

```
components/ (UIレイヤー)
    ↓ (OK)
services/ (サービスレイヤー)
    ↓ (OK)
storage/ (データレイヤー)
```

**許可される依存**:
- components/ → services/ ✅
- components/ → types/ ✅
- services/ → storage/ ✅
- services/ → types/ ✅
- storage/ → types/ ✅

**禁止される依存**:
- storage/ → services/ ❌
- storage/ → components/ ❌
- services/ → components/ ❌
- types/ → 他のすべてのディレクトリ ❌

### モジュール間の依存

**循環依存の禁止**:
```typescript
// ❌ 悪い例: 循環依存
// InputParser.ts
import { ValidationService } from '../validator/ValidationService';

// ValidationService.ts
import { InputParser } from '../parser/InputParser';  // 循環依存
```

**解決策**:
```typescript
// ✅ 良い例: 型定義を共有
// types/input.ts
export interface LocationInput { /* ... */ }

// InputParser.ts
import type { LocationInput } from '../../types/input';

// ValidationService.ts
import type { LocationInput } from '../../types/input';
```

## スケーリング戦略

### 機能の追加

新しい機能を追加する際の配置方針:

1. **小規模機能**: 既存ディレクトリにファイルを追加
   - 例: 新しい地図サービスのURL生成 → `MapUrlGenerator.ts`に追加

2. **中規模機能**: レイヤー内にサブディレクトリを作成
   - 例: 住所パーサーの追加 → `services/parser/AddressParser.ts`

3. **大規模機能**: 独立したモジュールとして分離
   - 例: 履歴検索機能 → `services/history/`ディレクトリを新設

### ファイルサイズの管理

**ファイル分割の目安**:
- 1ファイル: 300行以下を推奨
- 300-500行: リファクタリングを検討
- 500行以上: 分割を強く推奨

**分割例**:
```
# Before: InputParser.ts (500行)

# After: 責務ごとに分割
parser/
├── InputParser.ts              # ファサード (100行)
├── DecimalCoordinateParser.ts  # 十進度パース (150行)
├── DmsCoordinateParser.ts      # 度分秒パース (150行)
└── AddressParser.ts            # 住所パース (100行)
```

## 除外設定

### .gitignore

```gitignore
# 依存関係
node_modules/

# ビルド成果物
dist/

# 環境変数
.env
.env.local
.env.*.local

# ログ
*.log
npm-debug.log*

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# テストカバレッジ
coverage/

# ステアリングファイル（作業中のもの）
# 完了したものはコミットしてもよい
```

### .prettierignore

```
dist/
node_modules/
coverage/
*.md
```

### .eslintignore

```
dist/
node_modules/
coverage/
```

## 初期ファイル一覧

MVP実装に必要な初期ファイル:

```
ichi-link/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── favicon.ico
│   └── api/                       # API Routes
│       ├── geocode/
│       │   └── route.ts           # Yahoo!ジオコーダAPI中継
│       └── pois/
│           ├── route.ts           # GET /api/pois（POI一覧取得）
│           └── [id]/
│               └── route.ts       # GET /api/pois/{id}（POI詳細取得）
├── components/
│   ├── input/
│   │   └── LocationInput.tsx
│   ├── result/
│   │   ├── ConversionResult.tsx
│   │   ├── WarningDisplay.tsx
│   │   └── MapButtons.tsx
│   ├── map/
│   │   ├── MapView.tsx
│   │   ├── POILayer.tsx           # Mapbox layer/source描画
│   │   └── LayerToggle.tsx
│   ├── panel/
│   │   ├── SlidePanel.tsx
│   │   └── POIDetail.tsx
│   ├── common/
│   │   └── CopyButton.tsx
│   └── hooks/
│       ├── useConversion.ts
│       ├── usePOI.ts              # 自前API呼び出し
│       └── useLayerState.ts
├── lib/
│   ├── services/                  # クライアントサイド
│   │   ├── ConversionService.ts
│   │   ├── parser/
│   │   │   └── InputParser.ts
│   │   ├── converter/
│   │   │   ├── CoordinateConverter.ts
│   │   │   └── DatumTransformer.ts
│   │   ├── validator/
│   │   │   └── ValidationService.ts
│   │   ├── generator/
│   │   │   └── MapUrlGenerator.ts
│   │   └── poi/
│   │       └── POIService.ts      # 自前API呼び出し・キャッシュ
│   ├── server/                    # サーバーサイド
│   │   ├── poi/
│   │   │   ├── POIRepository.ts   # DBアクセス
│   │   │   └── POIQueryBuilder.ts # クエリ構築
│   │   └── db/
│   │       └── connection.ts      # DB接続
│   ├── storage/
│   │   └── HistoryStorage.ts
│   └── types/
│       ├── coordinate.ts
│       ├── input.ts
│       ├── result.ts
│       ├── warning.ts
│       ├── poi.ts
│       ├── api.ts                 # APIリクエスト/レスポンス型
│       ├── layer.ts
│       └── index.ts
├── public/
│   └── (静的アセット)
├── __tests__/
│   └── unit/
│       └── services/
│           ├── parser/
│           │   └── InputParser.test.ts
│           └── poi/
│               └── POIService.test.ts
├── docs/
│   ├── product-requirements.md
│   ├── functional-design.md
│   ├── architecture.md
│   ├── repository-structure.md
│   ├── development-guidelines.md
│   └── glossary.md
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
├── .prettierrc
├── .gitignore
├── CLAUDE.md
└── README.md
```
