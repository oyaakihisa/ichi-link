# 設計書

## アーキテクチャ概要

自前API前提のPOIデータ取得設計を実装する。SQLiteをデータベースとして使用し、Next.js API Routesでエンドポイントを提供する。

```
┌──────────────────────────────────────────────────────────────┐
│                     フロントエンド                            │
│  ┌────────────┐    ┌─────────────┐    ┌──────────────────┐  │
│  │ MapView    │───▶│ POIService  │───▶│ /api/pois        │  │
│  │ (viewport) │    │ (API呼出し)  │    │ /api/pois/{id}   │  │
│  └────────────┘    └─────────────┘    └──────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                     バックエンド                              │
│  ┌──────────────────┐    ┌────────────────────────────────┐ │
│  │ API Route Handler │───▶│ POIRepository                  │ │
│  │ (bbox解析, 検証)   │    │ (SQLiteクエリ, bbox検索)       │ │
│  └──────────────────┘    └────────────────────────────────┘ │
│                                       │                      │
│                                       ▼                      │
│                          ┌────────────────────────────────┐ │
│                          │ SQLite Database (pois.db)      │ │
│                          │ - pois テーブル                 │ │
│                          └────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## コンポーネント設計

### 1. SQLiteデータベース（pois.db）

**責務**:
- POIデータの永続化
- bbox検索のサポート

**スキーマ**:
```sql
CREATE TABLE pois (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('aed', 'fireHydrant', 'fireCistern')),
  name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  address TEXT,
  detail_text TEXT,
  availability_text TEXT,
  child_pad_available INTEGER,
  source TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_pois_type ON pois(type);
CREATE INDEX idx_pois_lat ON pois(latitude);
CREATE INDEX idx_pois_lng ON pois(longitude);
```

**実装の要点**:
- better-sqlite3を使用（同期的で高速）
- マイグレーションは単純なSQLファイルで管理
- 初期データはシードスクリプトで投入

### 2. POIRepository（lib/server/poi/POIRepository.ts）

**責務**:
- SQLiteへのクエリ実行
- bbox範囲でのPOI検索
- 単一POI取得

**インターフェース**:
```typescript
interface POIRepository {
  findByBbox(bbox: BBox, types?: POIType[]): POIListItem[];
  findById(id: string): POIDetail | null;
}
```

**実装の要点**:
- 一覧取得は最小限フィールドのみSELECT
- 詳細取得は全フィールドをSELECT
- bbox検索はWHERE latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?

### 3. API Route: GET /api/pois（app/api/pois/route.ts）

**責務**:
- クエリパラメータの解析・検証
- POIRepositoryの呼び出し
- レスポンスの整形

**クエリパラメータ**:
- `bbox`: `{west},{south},{east},{north}`（必須）
- `types`: `aed,fireHydrant`（オプション、デフォルトは全種別）
- `zoom`: 数値（オプション、将来の拡張用）

**レスポンス（パネル初期表示用の最小限フィールド）**:
```typescript
interface POIListItem {
  id: string;
  type: POIType;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
}

interface POIListResponse {
  pois: POIListItem[];
  meta: {
    total: number;
    bbox: BBox;
    types: POIType[];
  };
}
```

**設計思想**:
- 一覧APIはパネル初期表示に必要な最小限の項目を返す
- POIタップ時、まず一覧データでパネルを即座に表示
- 追加詳細（設置場所、利用可能時間、小児パッド有無等）はGET /pois/{id}で補完

### 4. API Route: GET /api/pois/{id}（app/api/pois/[id]/route.ts）

**責務**:
- パスパラメータからIDを取得
- POIRepositoryで単一POIを取得
- 404ハンドリング

**レスポンス（追加詳細を含む全情報）**:
```typescript
interface POIDetail extends POIListItem {
  detailText?: string;        // 設置場所詳細
  availabilityText?: string;  // 利用可能時間
  childPadAvailable?: boolean; // 小児パッド有無（AEDのみ）
  source: string;             // データソース
  updatedAt?: string;         // データ更新日時
}
```

**使用タイミング**:
- POIタップ後、パネル表示と並行してバックグラウンドで詳細を取得
- 詳細取得完了後、パネル内容を更新

### 5. POIService更新（lib/services/POIService.ts）

**変更点**:
- モックデータ削除
- fetch APIでバックエンドを呼び出し
- 詳細取得を`/api/pois/{id}`に変更

**新しいインターフェース**:
```typescript
class POIService {
  async getPOIs(options: POIQueryOptions): Promise<POIListItem[]>;
  async getPOIDetail(id: string): Promise<POIDetail | null>;
}
```

### 6. マップビューポート連動（app/page.tsx）

**変更点**:
- MapViewの`onMoveEnd`イベントをハンドリング
- ビューポートのbboxを取得
- デバウンス付きでPOI再取得

## データフロー

### POI一覧取得フロー
```
1. ユーザーがマップを移動/ズーム
2. MapViewがonMoveEndを発火
3. page.tsxがデバウンス後にfetchPOIsを呼び出し
4. POIService.getPOIs(bbox, types)
5. fetch('/api/pois?bbox=...&types=...')
6. API RouteがPOIRepository.findByBboxを呼び出し
7. SQLiteクエリ実行
8. POIListItem[]をレスポンス
9. MapViewがGeoJSONに変換してレンダリング
```

### POI詳細取得フロー
```
1. ユーザーがPOIピンをタップ
2. MapViewがonPoiSelectを発火（POI idを渡す）
3. page.tsxがPOIService.getPOIDetail(id)を呼び出し
4. fetch('/api/pois/{id}')
5. API RouteがPOIRepository.findByIdを呼び出し
6. SQLiteクエリ実行
7. POIDetailをレスポンス
8. SlidePanelに詳細を表示
```

## エラーハンドリング戦略

### API Route
- bbox形式不正: 400 Bad Request
- 存在しないPOI ID: 404 Not Found
- データベースエラー: 500 Internal Server Error

### フロントエンド
- ネットワークエラー: コンソールにログ、POI表示をスキップ
- 404: POI詳細パネルにエラー表示
- 500: トースト通知（将来実装）

## テスト戦略

### ユニットテスト
- POIRepository: bbox検索、ID検索のテスト
- API Route: パラメータ検証のテスト

### 統合テスト
- API呼び出しからレスポンスまでのフロー

## 依存ライブラリ

```json
{
  "dependencies": {
    "better-sqlite3": "^11.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0"
  }
}
```

## ディレクトリ構造

```
lib/
├── server/
│   ├── db/
│   │   ├── connection.ts       # SQLite接続管理
│   │   ├── migrations/
│   │   │   └── 001_create_pois.sql
│   │   └── seed.ts             # シードデータ投入
│   └── poi/
│       └── POIRepository.ts    # POIデータアクセス
├── services/
│   └── POIService.ts           # 更新（API呼び出しに変更）
└── types/
    └── poi.ts                  # 既存（POIListItem追加）

app/
├── api/
│   └── pois/
│       ├── route.ts            # GET /api/pois
│       └── [id]/
│           └── route.ts        # GET /api/pois/{id}
└── page.tsx                    # 更新（ビューポート連動）

data/
└── pois.db                     # SQLiteデータベースファイル
```

## 実装の順序

1. better-sqlite3をインストール
2. データベース接続・マイグレーション実装
3. POIRepositoryを実装
4. API Routes（一覧・詳細）を実装
5. シードデータを投入
6. POIServiceをAPI呼び出しに変更
7. マップビューポート連動を実装
8. テスト・動作確認

## セキュリティ考慮事項

- SQLインジェクション防止: プリペアドステートメント使用
- 入力検証: bbox値が数値であることを確認
- レート制限: 将来的に検討（MVP時点では不要）

## パフォーマンス考慮事項

- インデックス: lat/lng個別インデックスでbbox検索を高速化
- デバウンス: 300msでAPI呼び出し頻度を制限
- 一覧取得は最小限フィールド: 転送サイズ削減

## 将来の拡張性

- PMTiles/Vector Tiles: POIRepositoryのインターフェースを維持しつつ実装を差し替え可能
- 追加POIタイプ: typeカラムとPOIType型に値を追加するだけ
- クラスタリング最適化: zoom引数でサーバーサイドクラスタリングに対応可能
