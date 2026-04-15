# 技術仕様書 (Architecture Design Document)

## テクノロジースタック

### 言語・ランタイム

| 技術 | バージョン | 選定理由 |
|------|-----------|----------|
| Node.js | v24.11.0 | CLAUDE.mdで指定された環境。LTSによる長期サポート保証 |
| TypeScript | 5.x | 静的型付けによる開発時のバグ検出、座標計算の型安全性確保 |
| npm | 11.x | Node.js v24.11.0標準搭載、package-lock.jsonによる依存関係の厳密管理 |

### フレームワーク・ライブラリ

| 技術 | バージョン | 用途 | 選定理由 |
|------|-----------|------|----------|
| Next.js | 15.x | フルスタックフレームワーク | Vercelとの親和性、App Router、将来のAPI Routes対応 |
| React | 19.x | UIライブラリ | Next.js 15に同梱、Server Components対応 |
| Tailwind CSS | 3.x | スタイリング | ユーティリティファースト、レスポンシブ対応が容易 |
| proj4 | 2.x | 座標変換 | 測地系変換のデファクトスタンダード、WGS84/JGD2011/Tokyo対応 |
| Mapbox GL JS | 3.x | マップ表示 | Zenrinデータ使用による高精度、長押しイベント対応、無料枠あり（25k views/月） |

### 開発ツール

| 技術 | バージョン | 用途 | 選定理由 |
|------|-----------|------|----------|
| Jest | 29.x | テストフレームワーク | Next.js公式サポート、広いエコシステム |
| React Testing Library | 14.x | コンポーネントテスト | ユーザー視点のテスト、Next.js推奨 |
| ESLint | 9.x | リンター | TypeScript対応、Next.js設定同梱 |
| Prettier | 3.x | フォーマッター | コードスタイルの自動統一 |

### デプロイ

| 技術 | 用途 | 選定理由 |
|------|------|----------|
| Vercel | ホスティング | Next.js開発元、自動デプロイ、無料枠あり |

## アーキテクチャパターン

### レイヤードアーキテクチャ

```
┌─────────────────────────────────────────┐
│   UIレイヤー (React Components)          │ ← マップ中心UI、検索バー、スライドパネル
├─────────────────────────────────────────┤
│   サービスレイヤー (Domain Services)      │ ← 座標変換・判定ロジック、POIデータ取得
├─────────────────────────────────────────┤
│   APIレイヤー (Next.js API Routes)       │ ← 自前POI API、外部API中継
├─────────────────────────────────────────┤
│   データレイヤー (Storage)               │ ← 履歴の永続化、POIデータDB
└─────────────────────────────────────────┘
```

### POIデータフロー

```
[公開データソース]          [自前DB]           [自前API]         [フロントエンド]
   (AEDオープンデータ等)
         │                     │                  │                    │
         │   定期同期           │                  │                    │
         │ ────────────────▶  │                  │                    │
         │   (日次〜週次)       │                  │                    │
         │                     │                  │                    │
         │                     │    GET /pois     │     bbox取得       │
         │                     │ ◀────────────── │ ◀─────────────────│
         │                     │                  │                    │
         │                     │    POI一覧       │     GeoJSON        │
         │                     │ ────────────────▶│ ────────────────▶ │
         │                     │   (最小限項目)    │   (Mapbox描画)     │
         │                     │                  │                    │
         │                     │  GET /pois/{id}  │    詳細取得        │
         │                     │ ◀────────────── │ ◀─────────────────│
         │                     │                  │   (パネル表示時)    │
```

#### UIレイヤー

**責務**:
- フローティング検索バーの管理（入力タイプ切り替え、検索実行）
- ユーザー入力の受付（テキスト入力、ボタンクリック）
- 入力値のバリデーション（空チェック等）
- 変換結果・警告のスライドパネル表示
- 地図ボタンのレンダリングとクリックハンドリング
- コピー機能の提供
- マップ表示とインタラクション（ズーム、長押しピン、スライドパネル）
- 変換結果による座標へのズーム・ピン配置

**許可される操作**:
- サービスレイヤーの呼び出し
- React状態管理
- ブラウザAPIの利用（クリップボード、window.open、Geolocation）
- Mapbox GL JSの利用

**禁止される操作**:
- データレイヤーへの直接アクセス
- 座標変換ロジックの実装

```typescript
// UIレイヤーの例
const LocationConverter: React.FC = () => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ConversionResult | null>(null);

  const handleConvert = async () => {
    // OK: サービスレイヤーを呼び出す
    const result = await conversionService.convert(input);
    setResult(result);
  };

  // NG: 直接変換ロジックを実装しない
  // const handleConvert = () => {
  //   const lat = parseFloat(input.split(',')[0]); // ❌
  // };
};
```

#### サービスレイヤー

**責務**:
- 入力文字列の種別判定
- 座標形式の変換（度分秒↔十進度）
- 測地系の変換（WGS84↔JGD2011）
- 警告の生成
- 地図URLの生成
- 逆ジオコーディング（座標→住所）
- 共有テキスト・URL生成
- **POIデータの取得・管理**
- **POIレイヤーの表示状態管理**

**許可される操作**:
- データレイヤーの呼び出し
- 外部ライブラリ（proj4）の利用
- ドメインロジックの実装

**禁止される操作**:
- UIレイヤーへの依存
- React/ブラウザAPIの直接利用

```typescript
// サービスレイヤーの例
class ConversionService {
  convert(input: string): ConversionResult {
    // 入力判定
    const parsed = this.inputParser.parse(input);

    // 座標変換
    const coordinates = this.coordinateConverter.convert(parsed);

    // 警告生成
    const warnings = this.validator.generateWarnings(parsed, coordinates);

    // URL生成
    const mapUrls = this.mapUrlGenerator.generateAll(coordinates.wgs84);

    return { input: parsed, coordinates, warnings, mapUrls };
  }
}
```

#### データレイヤー

**責務**:
- 変換履歴のLocalStorage保存
- 履歴の取得・削除
- ストレージ容量管理

**許可される操作**:
- LocalStorage APIの利用
- JSONのシリアライズ/デシリアライズ

**禁止される操作**:
- ビジネスロジックの実装
- UIコンポーネントへの依存

```typescript
// データレイヤーの例
class HistoryStorage {
  private readonly STORAGE_KEY = 'ichi-link:history';
  private readonly MAX_ITEMS = 50;

  save(result: ConversionResult): void {
    const history = this.load();
    history.unshift({
      id: crypto.randomUUID(),
      ...result,
      createdAt: new Date(),
    });

    // 最大件数を超えたら古いものを削除
    if (history.length > this.MAX_ITEMS) {
      history.splice(this.MAX_ITEMS);
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
  }

  load(): ConversionHistory[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }
}
```

## データ永続化戦略

### ストレージ方式

| データ種別 | ストレージ | フォーマット | 理由 |
|-----------|----------|-------------|------|
| 変換履歴 | LocalStorage | JSON | サーバー不要、個人端末内で完結、プライバシー保護 |
| ユーザー設定 | LocalStorage | JSON | シンプルなキーバリュー形式で十分 |
| POI公開データ | サーバーサイドDB | 構造化データ | 公開データの定期同期・配信に必要 |

### POIデータベース（Supabase Postgres + PostGIS）

**目的**: 公開データを定期取得し、地図表示に最適化した形式で配信する

**採用技術**: Supabase Postgres + PostGIS

**選定理由**:
- PostGIS の空間インデックス機能で bbox 検索を高速化
- Supabase のマネージドサービスにより運用負荷を削減
- SQL ベースで柔軟なクエリが可能
- RLS（Row Level Security）による細かいアクセス制御
- 将来的な Vector Tiles/PMTiles 移行への基盤

**スキーマ設計**:

```sql
-- PostGIS拡張を有効化
CREATE EXTENSION IF NOT EXISTS postgis;

-- 市町村マスタテーブル
CREATE TABLE municipalities (
  jis_code VARCHAR(6) PRIMARY KEY,
  prefecture_slug VARCHAR(50) NOT NULL,
  municipality_slug VARCHAR(50) NOT NULL,
  prefecture_name_ja VARCHAR(20) NOT NULL,
  municipality_name_ja VARCHAR(50) NOT NULL,
  center_lat DECIMAL(9,6) NOT NULL,
  center_lng DECIMAL(9,6) NOT NULL,
  bbox_north DECIMAL(9,6) NOT NULL,
  bbox_south DECIMAL(9,6) NOT NULL,
  bbox_east DECIMAL(9,6) NOT NULL,
  bbox_west DECIMAL(9,6) NOT NULL,
  initial_zoom INTEGER DEFAULT 12,
  default_layers TEXT[] DEFAULT ARRAY['aed'],
  available_layers TEXT[] DEFAULT ARRAY['aed', 'fireHydrant'],
  seo_title VARCHAR(200),
  seo_description TEXT,
  is_public BOOLEAN DEFAULT false,
  is_indexed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (prefecture_slug, municipality_slug)
);

-- 市町村別レイヤー状態テーブル
CREATE TABLE municipality_layer_statuses (
  id SERIAL PRIMARY KEY,
  municipality_jis_code VARCHAR(6) REFERENCES municipalities(jis_code),
  layer_type VARCHAR(20) NOT NULL,
  item_count INTEGER DEFAULT 0,
  last_imported_at TIMESTAMP,
  source_updated_at TIMESTAMP,
  is_available BOOLEAN DEFAULT true,
  UNIQUE (municipality_jis_code, layer_type)
);

-- POIテーブル（PostGIS geometry型）
CREATE TABLE pois (
  id VARCHAR(100) PRIMARY KEY,
  type VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL,
  location geometry(Point, 4326) NOT NULL,  -- WGS84座標
  address VARCHAR(500),
  detail_text TEXT,
  availability_text VARCHAR(200),
  child_pad_available BOOLEAN,
  source VARCHAR(100),
  source_updated_at TIMESTAMP,
  imported_at TIMESTAMP DEFAULT NOW(),
  municipality_jis_code VARCHAR(6) REFERENCES municipalities(jis_code)
);

-- 空間インデックス（GIST）
CREATE INDEX idx_pois_location ON pois USING GIST(location);
CREATE INDEX idx_pois_type ON pois(type);
CREATE INDEX idx_pois_municipality ON pois(municipality_jis_code);
```

**空間検索クエリ**:

```sql
-- bbox検索（地図表示用、主用途）
-- geometry型 + && 演算子 + GISTインデックスで高速検索
SELECT id, type, name, ST_Y(location) as latitude, ST_X(location) as longitude, address
FROM pois
WHERE type = ANY($1::text[])
  AND location && ST_MakeEnvelope($2, $3, $4, $5, 4326)  -- west, south, east, north
ORDER BY id
LIMIT $6;

-- 距離計算が必要な場合のみ geography cast を使用
SELECT id, name, ST_Distance(location::geography, ST_MakePoint($1, $2)::geography) as distance_meters
FROM pois
WHERE ST_DWithin(location::geography, ST_MakePoint($1, $2)::geography, $3)
ORDER BY distance_meters;
```

**空間検索のアーキテクチャ方針**:

1. **Repository層での抽象化**
   - 上位層（Service / Component）は bbox 検索の内部実装に依存しない
   - `POIRepository.getPOIsByBbox(bounds, types, zoom)` のようなインターフェースを提供
   - 将来的な実装変更（RPC化、PMTiles移行等）に備える

2. **実装方式の選択**
   - 単純な bbox 検索: Supabase RPC 関数でラップ
   - 複雑な空間クエリ（距離計算、クラスタリング）: 専用 RPC 関数を定義

3. **型とインデックス**
   - `geometry(Point, 4326)` + GIST インデックスが基本
   - 距離計算が必要な場合のみ `::geography` にキャスト

```typescript
// lib/server/poi/POIRepository.ts
class POIRepository {
  /**
   * bbox内のPOIを取得
   * 内部実装（RPC/直接クエリ）は隠蔽
   */
  async getPOIsByBbox(
    bounds: MapBounds,
    types: POIType[],
    options?: { zoom?: number; limit?: number }
  ): Promise<POIListItem[]>;
}
```

**保持項目**:
- POI基本情報（id, type, name, location, address）
- 詳細情報（detail_text, availability_text, child_pad_available等）
- メタ情報（source, source_updated_at, imported_at, municipality_jis_code）

**更新戦略**:
- 日次〜週次で公開データソースから同期
- 更新失敗時は前回データを維持し、imported_atを更新しない
- リアルタイム更新は不要
- `lastImportedAt`: アプリへの反映日時（ページ上で「最終更新日」として表示）
- `sourceUpdatedAt`: 元データの更新日時（参照情報として補足表示）

### Supabase権限設計

**読取方針**:
- 公開POIデータは `anon` ロールで読取可能（RLS有効、SELECT許可）
- `municipalities` / `municipality_layer_statuses` も `anon` で読取可能
- ただし `is_public=false` の市町村はRLSで非公開

```sql
-- RLSを有効化
ALTER TABLE municipalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE pois ENABLE ROW LEVEL SECURITY;

-- anonロールでの読取ポリシー（公開市町村のみ）
CREATE POLICY "Public municipalities are viewable by everyone"
ON municipalities FOR SELECT
USING (is_public = true);

-- anonロールでのPOI読取ポリシー（公開市町村に属するPOIのみ）
CREATE POLICY "POIs in public municipalities are viewable"
ON pois FOR SELECT
USING (
  municipality_jis_code IN (
    SELECT jis_code FROM municipalities WHERE is_public = true
  )
);
```

**書込・更新方針**:
- データ取り込み・更新は `service_role` / バッチ処理のみ
- `anon` ロールには INSERT/UPDATE/DELETE 権限なし
- 定期インポートバッチが `service_role` で実行

```sql
-- anonには読取のみ
GRANT SELECT ON municipalities TO anon;
GRANT SELECT ON pois TO anon;
GRANT SELECT ON municipality_layer_statuses TO anon;

-- service_roleにはCRUD全権限
GRANT ALL ON municipalities TO service_role;
GRANT ALL ON pois TO service_role;
GRANT ALL ON municipality_layer_statuses TO service_role;
```

**isPublic / isIndexed の制御**:

| isPublic | isIndexed | 動作 |
|----------|-----------|------|
| false | - | RLSで非公開、API/ページで404を返す |
| true | false | 公開するが `noindex,nofollow` を付与 |
| true | true | 完全公開、sitemapに含む |

**必要な環境変数**（Supabase用に追加）:

| 変数名 | 用途 | 公開設定 |
|--------|------|----------|
| SUPABASE_URL | Supabaseプロジェクト URL | サーバーサイドのみ |
| SUPABASE_ANON_KEY | Supabase匿名キー | クライアント公開可（RLSで保護） |
| SUPABASE_SERVICE_ROLE_KEY | Supabaseサービスロールキー | サーバーサイドのみ（バッチ処理用） |

### 容量管理

- **最大履歴件数**: 50件
- **推定容量**: 1件あたり約500バイト、最大約25KB
- **超過時の処理**: 古い履歴から自動削除（FIFO）

### バックアップ戦略

MVPでは自動バックアップは実装しない。
LocalStorageのデータはブラウザのデータクリア時に削除される旨をUIで明示する。

**将来の拡張**:
- エクスポート機能（JSONダウンロード）
- インポート機能（JSONアップロード）

## パフォーマンス要件

### レスポンスタイム

| 操作 | 目標時間 | 測定方法 |
|------|---------|---------|
| 入力判定 | 50ms以内 | 入力確定から判定結果表示まで |
| 座標変換 | 100ms以内 | 判定完了から変換結果表示まで |
| 地図URL生成 | 10ms以内 | 変換完了からURL生成完了まで |
| 初回ロード | 3秒以内 | ページアクセスから操作可能まで（4G回線） |
| マップ表示（初回） | 3秒以内 | マップタブ選択からマップ描画完了まで |
| マップ表示（2回目以降） | 1秒以内 | タイルキャッシュ使用時 |
| ピン表示 | 100ms以内 | 長押し検出からピン描画完了まで |
| 逆ジオコーディング | 1秒以内 | ピン設置から住所取得完了まで |

### リソース使用量

| リソース | 上限 | 理由 |
|---------|------|------|
| バンドルサイズ | 800KB (gzip) | Mapbox GL JS含むモバイル回線対応 |
| メモリ | 100MB | マップタイル + モバイル端末での安定動作 |
| LocalStorage | 50KB | 履歴50件 + 設定データ |

### 外部API利用量

| API | 無料枠 | 想定使用量 |
|-----|--------|-----------|
| Yahoo!ジオコーダ | 50,000件/日 | MVP期間中は余裕あり |
| Mapbox Maps | 25,000 views/月 | MVP期間中は余裕あり |
| Mapbox Geocoding | 100,000件/月 | 逆ジオコーディング用 |
| AEDオープンデータAPI | 制限なし（公開データ） | 表示範囲ごとに取得 |
| 自治体オープンデータAPI | 制限なし（公開データ） | 消火栓データ用 |

### POIデータ取得戦略

**アーキテクチャ方針**:
- フロントエンドは公開データソースを直接叩かず、自前APIを経由してPOIデータを取得する
- 公開ソースのレスポンス遅延、レート制限、フォーマット差異をアプリから切り離す
- 将来的なPMTiles/Vector Tiles移行への布石として、クライアントとデータ配信方式を疎結合にする

**データソース**:
- AED: AEDオープンデータプラットフォーム等の公開データ → 自前DBに同期
- 消火栓: 自治体オープンデータ等の公開データ → 自前DBに同期

**自前API設計**:
```
GET /api/pois?bbox={west},{south},{east},{north}&types=aed,fireHydrant&zoom={zoom}
GET /api/pois/{id}
```

- `bbox`: 表示範囲（west,south,east,north）
- `types`: 取得するPOI種別（カンマ区切り）
- `zoom`: 現在のズームレベル（返却件数や詳細度の調整に使用）

**レスポンス設計方針**:
- 一覧取得（`GET /api/pois`）では、パネル初回表示に必要な最小限の項目を返す
  - id, type, name, latitude, longitude, address
- 詳細情報（設置場所詳細、利用可能時間、小児対応有無など）は`GET /api/pois/{id}`で個別取得
- これにより、一覧取得のレスポンスサイズを抑えつつ、必要に応じて詳細を補完できる

**取得タイミング**:
- 地図の移動（pan）またはズーム操作の終了時にbboxを取得
- API呼び出しはデバウンスする（連続操作時の過剰リクエスト防止、300ms程度）
- レイヤーをOFFからONに切り替えたとき

**キャッシュ戦略**:
- メモリキャッシュ（セッション中のみ）
- 表示範囲ごとにキャッシュ
- 同一周辺範囲の取得結果はキャッシュを再利用
- 一定時間（5分）経過で自動リフレッシュ

**ズームレベル連動**:
- 低ズーム（広域表示）: POI件数を制限、またはクラスタ中心のみ返却
- 高ズーム（詳細表示）: 範囲内の全POIを返却
- 消火栓は低ズームでは表示抑制（OFFまたはクラスタのみ）

**描画方式**:
- ReactコンポーネントによるDOMマーカーではなく、Mapbox layer/sourceベースで描画
- GeoJSONソース + Circleレイヤーによる描画
- Mapbox GL JSのクラスタリング機能を活用
- POI更新時は`source.setData()`で差分更新

### 最適化方針

1. **コード分割**: 地図サービス固有のロジックは遅延ロード
2. **proj4の最適化**: 必要な測地系定義のみをインポート
3. **デバウンス**: リアルタイム判定は300msのデバウンス適用

## セキュリティアーキテクチャ

### データ保護

**ローカルデータ**:
- 変換履歴はLocalStorageに保存（端末外に送信しない）
- 個人情報・機密情報の収集なし
- サーバーサイドへのデータ送信なし（MVPでは外部API未使用）

**通信セキュリティ**:
- HTTPS必須（本番環境）
- Mixed Contentの禁止

### 入力検証

**バリデーション**:
```typescript
// 入力値の長さ制限
const MAX_INPUT_LENGTH = 1000;

function validateInput(input: string): void {
  if (!input || input.trim().length === 0) {
    throw new ValidationError('位置情報を入力してください');
  }
  if (input.length > MAX_INPUT_LENGTH) {
    throw new ValidationError('入力が長すぎます');
  }
}
```

**サニタイゼーション**:
```typescript
// URL生成時のパラメータエスケープ
function generateGoogleMapsUrl(lat: number, lng: number): string {
  const encodedLat = encodeURIComponent(lat.toFixed(6));
  const encodedLng = encodeURIComponent(lng.toFixed(6));
  return `https://www.google.com/maps?q=${encodedLat},${encodedLng}`;
}
```

**XSS対策**:
- Reactの自動エスケープ機能を活用
- dangerouslySetInnerHTMLの使用禁止
- ユーザー入力の表示時は必ずテキストノードとして扱う

### エラーハンドリング

- スタックトレースをユーザーに表示しない
- エラーメッセージは日本語で分かりやすく
- 入力値をエラーログに含めない（位置情報保護）

## スケーラビリティ設計

### データ増加への対応

**想定データ量**: 履歴50件（上限固定）

**対策**:
- 履歴件数に上限を設定（50件）
- 古い履歴の自動削除
- 将来的にはアーカイブ機能（エクスポート）を検討

### 機能拡張性

**地図サービスの追加**:
```typescript
// MapUrlGeneratorのプラグイン設計
interface MapService {
  name: string;
  icon: string;
  generateUrl(coord: Coordinate): string;
}

class MapUrlGenerator {
  private services: MapService[] = [];

  register(service: MapService): void {
    this.services.push(service);
  }

  generateAll(coord: Coordinate): Record<string, string> {
    return Object.fromEntries(
      this.services.map(s => [s.name, s.generateUrl(coord)])
    );
  }
}
```

**測地系の追加**:
```typescript
// proj4への定義追加で対応可能
proj4.defs('EPSG:XXXX', '+proj=... +datum=...');
```

**POI種別の追加**:
```typescript
// POIServiceのプラグイン設計
interface POIDataSource {
  type: POIType;
  name: string;
  icon: string;
  color: string;
  fetchPOIs(bounds: MapBounds): Promise<POI[]>;
  fetchDetail(id: string): Promise<POI | null>;
}

class POIService {
  private sources: Map<POIType, POIDataSource> = new Map();

  register(source: POIDataSource): void {
    this.sources.set(source.type, source);
  }

  // 将来の拡張例: 防火水槽、医療機関、避難場所など
}
```

**PMTiles / Vector Tiles移行**:
- 現段階では過剰設計を避け、GeoJSON APIベースで実装
- 想定規模が10万件を超える場合の選択肢として検討
- サーバーレス配信が可能（S3/Cloudflare R2等にPMTilesファイルを配置）
- クライアント側の描画ロジック（Mapbox layer/source）は大きく変わらない
- 移行時はAPIレスポンスをVector Tilesに置き換えるだけで済むよう設計

**設定のカスタマイズ**:
- デフォルト測地系の変更
- 優先地図サービスの設定
- 履歴保存の有効/無効
- **POIレイヤーの初期表示設定**
- **POI表示密度の調整**

## 市町村ランディングアーキテクチャ

### URL設計

```
/maps                                    # 全国トップ
/maps/[prefectureSlug]                   # 都道府県ページ
/maps/[prefectureSlug]/[municipalitySlug] # 市町村ページ
```

### Next.js App Router設計

```
app/
  maps/
    page.tsx                           # /maps - 全国トップ
    sitemap.ts                         # 動的sitemap生成
    [prefectureSlug]/
      page.tsx                         # /maps/[prefecture] - 都道府県ページ
      [municipalitySlug]/
        page.tsx                       # /maps/[prefecture]/[municipality] - 市町村ページ
```

### 静的生成戦略

**generateStaticParams**:
- `status.isPublic=true` の市町村ページを事前生成
- ビルド時に市町村マスタから公開対象を取得
- 新規市町村追加時は再ビルドまたはISR（Incremental Static Regeneration）で対応

```typescript
// app/maps/[prefectureSlug]/[municipalitySlug]/page.tsx
export async function generateStaticParams() {
  // サーバーサイドではRepositoryを直接使用
  const municipalities = await getMunicipalityRepository().getPublicMunicipalities();
  return municipalities.map((m) => ({
    prefectureSlug: m.prefectureSlug,
    municipalitySlug: m.municipalitySlug,
  }));
}
```

**sitemap生成**:
- `status.isPublic=true && status.isIndexed=true` のページのみsitemapに含める
- `app/sitemap.ts` で動的生成
- `lastModified` には該当市町村の最新 `lastImportedAt` を使用

```typescript
// app/sitemap.ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const repo = getMunicipalityRepository();
  const layerStatusRepo = getMunicipalityLayerStatusRepository();
  const municipalities = await repo.getIndexedMunicipalities();

  const entries = await Promise.all(
    municipalities.map(async (m) => {
      // 該当市町村の最新インポート日時を取得
      const lastImportedAt = await layerStatusRepo.getLatestImportedAt(m.jisCode);
      return {
        url: `https://example.com${m.path}`,
        lastModified: lastImportedAt ?? new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      };
    })
  );

  return entries;
}
```

### メタデータ動的生成

```typescript
// app/maps/[prefectureSlug]/[municipalitySlug]/page.tsx
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // サーバーサイドではRepositoryを直接使用
  const municipality = await getMunicipalityRepository().getMunicipality(
    params.prefectureSlug,
    params.municipalitySlug
  );

  // RLSにより status.isPublic=false の市町村は null として返却される
  if (!municipality) {
    return {};
  }

  return {
    title: municipality.seo.title,
    description: municipality.seo.description,
    // status.isIndexed に基づいて robots を制御
    robots: municipality.status.isIndexed ? 'index,follow' : 'noindex,nofollow',
    alternates: {
      canonical: municipality.seo.canonicalPath,
    },
    openGraph: {
      title: municipality.seo.title,
      description: municipality.seo.description,
      url: municipality.path,
    },
  };
}
```

### 市町村ページ初期化フロー

```
1. URLから市町村slugを取得
2. 市町村マスタから設定を取得
3. isPublic確認 → false なら 404
4. SEOメタデータ設定（isIndexed=false → noindex）
5. 地図をbbox/center/initialZoomで初期表示
6. defaultLayersでPOI初回取得
7. ページコンテンツ表示
```

### データフロー（市町村ページ）

```
[市町村マスタ]          [MunicipalityLayerStatus]         [POI API]
      │                         │                            │
      │ generateMetadata()      │                            │
      │ ────────────────▶      │                            │
      │                         │                            │
      │ generateStaticParams()  │                            │
      │ ────────────────▶      │                            │
      │                         │                            │
      │ 市町村設定               │ 動的情報（件数、更新日）    │ bbox POI
      │ ────────────────▶      │ ────────────────▶         │ ────▶
      │                         │                            │
[ページレンダリング]          [ページコンテンツ]            [地図表示]
```

## テスト戦略

### ユニットテスト

**フレームワーク**: Jest + React Testing Library

**対象**:
- InputParser: 各入力パターンの判定
- CoordinateConverter: 座標変換の精度
- DatumTransformer: 測地系変換の精度
- ValidationService: 警告生成ロジック
- MapUrlGenerator: URL形式の正確性

**カバレッジ目標**: 80%以上（サービスレイヤー）

```typescript
// テスト例
describe('InputParser', () => {
  it('十進度形式を正しく判定する', () => {
    const result = parser.parse('35.6812, 139.7671');
    expect(result.inputType).toBe('coordinate_decimal');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('度分秒形式を正しく判定する', () => {
    const result = parser.parse('35°40\'52"N 139°46\'2"E');
    expect(result.inputType).toBe('coordinate_dms');
  });
});
```

### 統合テスト

**方法**: Jest + React Testing Libraryでコンポーネント間の連携をテスト

**対象**:
- 入力→判定→変換→URL生成の一連フロー
- 警告表示条件の網羅
- 履歴保存・取得

### E2Eテスト

**ツール**: Playwright

**シナリオ**:
1. 検索バー入力→変換→マップズーム→パネル表示→地図ボタンクリック
2. 曖昧入力→警告表示→確認→地図起動
3. コピーボタン→クリップボード確認
4. レスポンシブUI（モバイル/デスクトップ）
5. フローティング検索バーのドロップダウン切り替え
6. マップ長押し→ピン設置→パネル表示→共有

## 技術的制約

### 環境要件

- **対応ブラウザ**: Chrome 90+, Firefox 90+, Safari 14+, Edge 90+
- **対応デバイス**: デスクトップ、タブレット、スマートフォン
- **最小画面幅**: 320px
- **必要な外部依存**: なし（MVPでは外部API未使用）

### パフォーマンス制約

- LocalStorageの容量上限（5MB）を考慮し、履歴は50件に制限
- モバイル回線でも3秒以内にロード完了

### セキュリティ制約

- 位置情報は端末外に送信しない
- 外部APIを使用する場合はユーザーに明示

## 依存関係管理

| ライブラリ | 用途 | バージョン管理方針 |
|-----------|------|-------------------|
| next | フルスタックフレームワーク | ^15.0.0（メジャー固定） |
| react | UIライブラリ | ^19.0.0（Next.jsと同期） |
| react-dom | React DOM | ^19.0.0（reactと同期） |
| proj4 | 座標変換 | ^2.9.0（メジャー固定） |
| mapbox-gl | マップ表示 | ^3.0.0（メジャー固定） |
| tailwindcss | スタイリング | ^3.0.0（メジャー固定） |
| jest | テスト | ^29.0.0（メジャー固定） |
| @testing-library/react | コンポーネントテスト | ^14.0.0（メジャー固定） |
| typescript | 言語 | ~5.3.0（マイナー固定） |
| eslint | リンター | ^9.0.0（メジャー固定） |
| prettier | フォーマッター | ^3.0.0（メジャー固定） |

**更新方針**:
- セキュリティパッチは即座に適用
- マイナーバージョンは月次で確認・更新
- メジャーバージョンは破壊的変更を確認してから計画的に更新

## デプロイ戦略

### Vercelへのデプロイ

**自動デプロイフロー**:
```
GitHub Push → Vercel Build → Preview/Production Deploy
```

**環境**:
- **Production**: mainブランチへのマージで自動デプロイ
- **Preview**: PRごとにプレビュー環境を自動生成

**設定**:
```json
// vercel.json（必要な場合のみ）
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next"
}
```

**環境変数**:
- Vercelダッシュボードで設定
- 本番/プレビュー環境で分離可能

**必要な環境変数**:
| 変数名 | 用途 | 公開設定 |
|--------|------|----------|
| YAHOO_CLIENT_ID | Yahoo!ジオコーダAPI認証 | サーバーサイドのみ |
| NEXT_PUBLIC_MAPBOX_TOKEN | Mapbox GL JS認証 | クライアント公開（`NEXT_PUBLIC_`プレフィックス） |

**無料枠の範囲**:
- 帯域: 100GB/月
- ビルド時間: 6000分/月
- サーバーレス関数: 100GB-時間/月
