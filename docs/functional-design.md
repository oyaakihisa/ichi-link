# 機能設計書 (Functional Design Document)

## システム構成図

```mermaid
graph TB
    User[ユーザー]
    UI[UIレイヤー]
    InputParser[入力パーサー]
    GeocodingService[ジオコーディング]
    ReverseGeocodingService[逆ジオコーディング]
    CoordinateConverter[座標変換エンジン]
    MapUrlGenerator[地図URL生成]
    MapService[マップサービス]
    POIService[POIサービス]
    LocalStorage[(ローカルストレージ)]
    POIAPI[自前POI API]
    POIDB[(POIデータベース)]
    PublicDataSource[(公開データソース)]

    User --> UI
    UI --> InputParser
    UI --> GeocodingService
    UI --> MapService
    MapService --> ReverseGeocodingService
    MapService --> POIService
    POIService --> POIAPI
    POIAPI --> POIDB
    PublicDataSource -.->|定期同期| POIDB
    GeocodingService --> CoordinateConverter
    InputParser --> CoordinateConverter
    CoordinateConverter --> MapUrlGenerator
    ReverseGeocodingService --> CoordinateConverter
    UI --> LocalStorage
```

### 詳細構成図

```mermaid
graph TB
    User[ユーザー]

    subgraph UILayer[UIレイヤー]
        subgraph MapCentricUI[マップ中心UI]
            SearchBar[フローティング検索バー<br/>ドロップダウン切替]
            MapView[Mapbox地図表示]
            PinMarker[ピンマーカー]
            POILayer[POIレイヤー<br/>AED・消火栓表示<br/>Mapbox layer/source]
            LayerToggle[レイヤー切替UI]
            SlidePanel[スライドパネル<br/>変換結果・位置情報・POI詳細表示]
            ResultDisplay[結果表示]
            WarningDisplay[警告表示]
            MapButtons[地図ボタン群]
            CopyButtons[コピーボタン群]
            ShareButtons[共有ボタン群]
        end
    end

    subgraph ServiceLayer[サービスレイヤー]
        InputParser[InputParser<br/>座標形式判定]
        GeocodingService[GeocodingService<br/>住所→座標変換]
        ReverseGeocodingService[ReverseGeocodingService<br/>座標→住所変換]
        CoordinateConverter[CoordinateConverter<br/>座標正規化]
        DatumTransformer[DatumTransformer<br/>WGS84↔Tokyo変換]
        ValidationService[ValidationService<br/>検証・警告生成]
        MapUrlGenerator[MapUrlGenerator<br/>地図URL生成]
        ShareService[ShareService<br/>共有テキスト生成]
        POIService[POIService<br/>自前API呼び出し・キャッシュ]
    end

    subgraph APILayer[APIレイヤー]
        POIAPI[自前POI API<br/>GET /api/pois<br/>GET /api/pois/id]
    end

    subgraph DataLayer[データレイヤー]
        LocalStorage[(LocalStorage<br/>履歴保存)]
        POIDB[(POIデータベース)]
        PublicDataSource[(公開データソース<br/>AED・消火栓)]
    end

    User --> SearchBar
    User --> MapView
    SearchBar --> GeocodingService
    SearchBar --> InputParser
    GeocodingService --> DatumTransformer
    InputParser --> CoordinateConverter
    CoordinateConverter --> DatumTransformer
    DatumTransformer --> ValidationService
    ValidationService --> SlidePanel
    SlidePanel --> ResultDisplay
    SlidePanel --> WarningDisplay
    ResultDisplay --> MapUrlGenerator
    MapUrlGenerator --> MapButtons
    ResultDisplay --> CopyButtons
    ResultDisplay -.-> LocalStorage
    MapView --> PinMarker
    MapView --> POILayer
    POILayer --> POIService
    POIService --> POIAPI
    POIAPI --> POIDB
    PublicDataSource -.->|定期同期| POIDB
    PinMarker --> ReverseGeocodingService
    ReverseGeocodingService --> DatumTransformer
    SlidePanel --> ShareService
    SlidePanel --> ShareButtons
```

## 技術スタック

| 分類           | 技術                         | 選定理由                                           |
| -------------- | ---------------------------- | -------------------------------------------------- |
| 言語           | TypeScript 5.x               | 型安全性、開発効率、Node.js環境との親和性          |
| フレームワーク | Next.js 15 (React 19)        | Vercelとの親和性、App Router、将来のAPI Routes対応 |
| スタイリング   | Tailwind CSS                 | ユーティリティファースト、レスポンシブ対応         |
| 座標変換       | proj4js                      | 測地系変換のデファクトスタンダード                 |
| テスト         | Jest + React Testing Library | Next.js公式サポート、広いエコシステム              |
| デプロイ       | Vercel                       | Next.js開発元、自動デプロイ、無料枠あり            |

## データモデル定義

### エンティティ: LocationInput（入力データ）

```typescript
interface LocationInput {
  rawInput: string; // 生の入力文字列
  inputType: InputType; // 判定された入力種別
  confidence: number; // 判定の確信度 (0-1)
  parsedData: ParsedCoordinate | ParsedAddress | null; // パース結果
}

type InputType =
  | "coordinate_decimal" // 十進度形式の座標
  | "coordinate_dms" // 度分秒形式の座標
  | "address" // 住所
  | "unknown"; // 判定不能
```

### エンティティ: ParsedCoordinate（パース済み座標）

```typescript
interface ParsedCoordinate {
  latitude: number; // 緯度（十進度）
  longitude: number; // 経度（十進度）
  originalFormat: CoordinateFormat; // 元の形式
}

type CoordinateFormat =
  | "decimal" // 十進度 (35.6812)
  | "dms" // 度分秒 (35°40'52")
  | "dmm"; // 度分 (35°40.867')

type Datum =
  | "WGS84" // 世界測地系
  | "TOKYO"; // 旧日本測地系

// 入力ソース（どの入力欄から入力されたか）
type InputSource =
  | "address" // 住所入力欄
  | "wgs84" // WGS84座標入力欄
  | "tokyo"; // Tokyo Datum座標入力欄
```

### エンティティ: ParsedAddress（パース済み住所）

```typescript
interface ParsedAddress {
  fullAddress: string; // 正規化された住所
  prefecture?: string; // 都道府県
  city?: string; // 市区町村
  town?: string; // 町名
  block?: string; // 番地
}
```

### エンティティ: ConversionResult（変換結果）

```typescript
interface ConversionResult {
  input: LocationInput; // 入力データ
  inputSource: InputSource; // 入力元（どの入力欄から）
  coordinates: {
    wgs84: Coordinate; // WGS84座標
    tokyo: Coordinate; // 旧日本測地系（Tokyo Datum）座標
  };
  address?: string; // 逆ジオコーディング結果（将来）
  mapUrls: MapUrls; // 各地図サービスのURL
  warnings: Warning[]; // 警告一覧
  timestamp: Date; // 変換日時
}

interface Coordinate {
  latitude: number; // 緯度（小数点以下6桁）
  longitude: number; // 経度（小数点以下6桁）
}

interface MapUrls {
  googleMaps: string;
  yahooMap: string;
  appleMaps: string;
  gsiMap: string;
}
```

### エンティティ: Warning（警告）

```typescript
interface Warning {
  type: WarningType;
  message: string;
  severity: "info" | "warning" | "error";
}

type WarningType =
  | "coordinate_order_ambiguous" // 緯度経度の順番が曖昧
  | "outside_japan" // 日本国外の座標
  | "low_confidence" // 判定の確信度が低い
  | "coordinate_swap_suggested" // 緯度経度入れ替えの提案
  | "address_partial_match"; // 住所が部分的にマッチ（入力より短い住所でマッチ）
```

### エンティティ: ConversionHistory（変換履歴）

```typescript
interface ConversionHistory {
  id: string; // UUID
  input: string; // 入力文字列
  result: ConversionResult; // 変換結果
  createdAt: Date; // 作成日時
}
```

### エンティティ: PinLocation（ピン位置情報）

```typescript
interface PinLocation {
  coordinate: Coordinate;        // WGS84座標（ピン位置）
  tokyoCoordinate: Coordinate;   // Tokyo Datum座標
  address?: string;              // 逆ジオコーディングで取得した住所
  timestamp: Date;               // ピン設置日時
}
```

### エンティティ: MapState（マップ状態）

```typescript
interface MapState {
  center: Coordinate;    // マップ中心座標
  zoom: number;          // ズームレベル（1-22）
  pin: PinLocation | null;  // 現在のピン位置
  selectedPOI: POI | null;  // 選択中のPOI（アクティブピンと排他）
  layerVisibility: LayerVisibility;  // レイヤー表示状態
}

interface LayerVisibility {
  aed: boolean;        // AEDレイヤー表示（初期: true）
  fireHydrant: boolean; // 消火栓レイヤー表示（初期: false）
}

// 初期値
const DEFAULT_MAP_STATE: MapState = {
  center: { latitude: 35.6812, longitude: 139.7671 }, // 東京駅
  zoom: 5, // 日本全体が見える程度
  pin: null,
  selectedPOI: null,
  layerVisibility: {
    aed: true,        // AEDは初期ON
    fireHydrant: false, // 消火栓は初期OFF
  },
};
```

### エンティティ: POI（公開設備）

```typescript
interface POI {
  id: string;                    // 一意識別子
  type: POIType;                 // POI種別
  name: string;                  // 名称
  coordinate: Coordinate;        // WGS84座標
  address?: string;              // 住所
  detailText?: string;           // 設置場所詳細などの補足情報
  availabilityText?: string;     // 利用可能時間などの可用性情報
  source: string;                // データソース
  updatedAt?: Date;              // データ更新日時
}

type POIType =
  | 'aed'           // AED
  | 'fireHydrant'   // 消火栓
  | 'fireCistern';  // 防火水槽（将来拡張）

// AED固有の拡張情報
interface AEDDetail {
  availableHours?: string;     // 利用可能時間（例: "24時間"）
  locationDetail?: string;     // 設置場所詳細（例: "1階ロビー"）
  childPadAvailable?: boolean; // 小児対応パッド有無
}

// 消火栓固有の注記
interface FireHydrantDetail {
  // 利用可否は位置情報とは別概念
  // MVPでは位置情報レイヤーとして扱い、利用可否は保証しない
  note: string;  // 例: "利用可否は別途確認が必要です"
}
```

### エンティティ: Prefecture（都道府県）

```typescript
/**
 * 都道府県マスタ
 */
interface Prefecture {
  /** 都道府県コード（JIS X 0401） */
  code: string;
  /** スラッグ（例: "ishikawa"） */
  slug: string;
  /** 都道府県名（例: "石川県"） */
  nameJa: string;
  /** 正規パス（例: "/maps/ishikawa"） */
  path: string;
  /** 地図設定 */
  map: {
    center: Coordinate;
    bbox: MapBounds;
    initialZoom: number;
  };
}
```

### エンティティ: Municipality（市町村マスタ）

```typescript
/**
 * 市町村マスタ
 * ルーティング・SEO・初期地図状態・初回POI取得の基準を集約
 */
interface Municipality {
  /** 全国地方公共団体コード（例: "172022"） */
  jisCode: string;
  /** 都道府県スラッグ（例: "ishikawa"） */
  prefectureSlug: string;
  /** 市町村スラッグ（例: "wajima"） */
  municipalitySlug: string;
  /** 都道府県名（例: "石川県"） */
  prefectureNameJa: string;
  /** 市町村名（例: "輪島市"） */
  municipalityNameJa: string;
  /** 正規パス（例: "/maps/ishikawa/wajima"） */
  path: string;
  /** 地図設定 */
  map: MunicipalityMapConfig;
  /** レイヤー設定 */
  layers: MunicipalityLayerConfig;
  /** SEO設定 */
  seo: MunicipalitySeoConfig;
  /** コンテンツ設定 */
  content: MunicipalityContentConfig;
  /** 公開設定 */
  status: MunicipalityStatus;
}

/**
 * 市町村地図設定
 */
interface MunicipalityMapConfig {
  /** 初期中心座標 */
  center: Coordinate;
  /** 市町村範囲 */
  bbox: MapBounds;
  /** 初期ズームレベル */
  initialZoom: number;
}

/**
 * 市町村レイヤー設定
 */
interface MunicipalityLayerConfig {
  /** 初期有効レイヤー（例: ['aed']） */
  defaultLayers: POIType[];
  /** この市町村で利用可能なレイヤー種別 */
  availableLayers: POIType[];
  /** レイヤー種別ごとの最小表示ズームレベル */
  minZoomByLayer: Partial<Record<POIType, number>>;
}

/**
 * 市町村SEO設定
 */
interface MunicipalitySeoConfig {
  /** ページタイトル */
  title: string;
  /** ページ説明文 */
  description: string;
  /** ページ見出し（h1） */
  h1: string;
  /** canonical URL パス */
  canonicalPath: string;
}

/**
 * 市町村コンテンツ設定
 */
interface MunicipalityContentConfig {
  /** ページ導入文 */
  introText?: string;
  /** 注意事項テキスト */
  cautionText?: string;
  /** データソース参照情報 */
  sourceRefs: SourceReference[];
}

/**
 * データソース参照情報
 */
interface SourceReference {
  /** ソース名 */
  name: string;
  /** ソースURL */
  url?: string;
  /** レイヤー種別 */
  layerType: POIType;
}

/**
 * 市町村公開設定
 */
interface MunicipalityStatus {
  /** ページ公開状態（false = 非公開、404を返す） */
  isPublic: boolean;
  /** 検索エンジンインデックス対象（false = noindex を付与） */
  isIndexed: boolean;
}
```

### エンティティ: MunicipalityLayerStatus（市町村別レイヤー状態）

```typescript
/**
 * 市町村別レイヤー状態（動的情報）
 * 更新日時や件数などの変動する情報を管理
 */
interface MunicipalityLayerStatus {
  /** 市町村コード */
  municipalityJisCode: string;
  /** レイヤー種別 */
  layerType: POIType;
  /** POI件数 */
  itemCount: number;
  /**
   * 最終インポート日時
   * - 自前DBへの反映日時
   * - ページ上で「最終更新日」として表示
   * - sitemap の lastModified に使用
   */
  lastImportedAt: Date;
  /**
   * ソース側更新日時（オプション）
   * - 元データ（公開データソース）の更新日時
   * - 参照情報として補足表示
   * - ソースが日時を提供しない場合は null
   */
  sourceUpdatedAt?: Date;
  /** 利用可能状態 */
  isAvailable: boolean;
}
```

**更新日時の使い分け**:

| 項目 | 用途 | 参照元 |
|------|------|--------|
| `lastImportedAt` | ページ上の「最終更新日」、sitemap の lastModified | `municipality_layer_statuses.last_imported_at` |
| `sourceUpdatedAt` | データソース参照情報（補足表示） | `municipality_layer_statuses.source_updated_at` |

## コンポーネント設計

### InputParser（入力パーサー）

**責務**:

- 座標形式（十進度/度分秒）を識別する
- 座標文字列をパースして緯度・経度を抽出する

**インターフェース**:

```typescript
class InputParser {
  // 入力を解析して座標形式を判定
  parse(input: string): LocationInput;

  // 十進度形式かどうかを判定
  private isDecimalCoordinate(input: string): boolean;

  // 度分秒形式かどうかを判定
  private isDmsCoordinate(input: string): boolean;

  // 十進度座標をパース
  private parseDecimalCoordinate(input: string): ParsedCoordinate | null;

  // 度分秒座標をパース
  private parseDmsCoordinate(input: string): ParsedCoordinate | null;
}
```

**依存関係**:

- なし（純粋な文字列処理）

### CoordinateConverter（座標変換エンジン）

**責務**:

- 度分秒から十進度への変換
- 十進度から度分秒への変換
- 座標のフォーマット統一

**インターフェース**:

```typescript
class CoordinateConverter {
  // 度分秒を十進度に変換
  dmsToDecimal(degrees: number, minutes: number, seconds: number): number;

  // 十進度を度分秒に変換
  decimalToDms(decimal: number): {
    degrees: number;
    minutes: number;
    seconds: number;
  };

  // 座標を正規化（小数点以下6桁）
  normalize(coordinate: Coordinate): Coordinate;
}
```

**依存関係**:

- なし（純粋な計算処理）

### DatumTransformer（測地系変換）

**責務**:

- WGS84 ↔ 旧日本測地系(Tokyo Datum) の相互変換

**インターフェース**:

```typescript
class DatumTransformer {
  // WGS84から旧日本測地系への変換
  wgs84ToTokyo(coord: Coordinate): Coordinate;

  // 旧日本測地系からWGS84への変換
  tokyoToWgs84(coord: Coordinate): Coordinate;
}
```

**変換精度**:

- WGS84 ↔ Tokyo Datum の差: 約400-500m
- proj4jsの変換パラメータ: `+towgs84=-146.414,507.337,680.507,0,0,0,0`

**依存関係**:

- proj4js（測地系変換ライブラリ）

### ValidationService（検証・警告生成）

**責務**:

- 入力値の妥当性検証
- 警告の生成
- 曖昧性の検出

**インターフェース**:

```typescript
class ValidationService {
  // 座標が日本国内かどうかを検証
  isWithinJapan(coord: Coordinate): boolean;

  // 緯度経度の順番が妥当かを検証
  validateCoordinateOrder(lat: number, lng: number): boolean;

  // 警告を生成
  generateWarnings(input: LocationInput, coord: Coordinate): Warning[];

  // 緯度経度入れ替え候補を生成
  suggestSwappedCoordinate(coord: Coordinate): Coordinate | null;
}
```

**依存関係**:

- なし

### GeocodingService（ジオコーディング）

**責務**:

- 住所から座標への変換（ジオコーディング）
- Yahoo!ジオコーダAPIとの通信（API Route経由）
- 住所文字列の正規化
- 入力住所とマッチ住所の比較による警告生成

**インターフェース**:

```typescript
interface GeocodingResult {
  coordinate: Coordinate; // WGS84座標
  matchedAddress: string; // マッチした住所文字列
}

type GeocodingErrorCode = "NOT_FOUND" | "NETWORK_ERROR" | "API_ERROR";

class GeocodingError extends Error {
  readonly code: GeocodingErrorCode;
}

class GeocodingService {
  // 住所を座標に変換
  async geocode(address: string): Promise<GeocodingResult>;
}
```

**使用API**:

- Yahoo!ジオコーダAPI（API Route `/api/geocode` 経由）
- エンドポイント: `https://map.yahooapis.jp/geocode/V1/geoCoder`
- 無料枠: 1日5万リクエスト
- 要件: Yahoo! Client ID（環境変数 `YAHOO_CLIENT_ID`）
- 精度: 番地レベル

**エラーハンドリング**:
| エラー種別 | エラーコード | ユーザーへの表示 |
|-----------|-------------|-----------------|
| 空入力 | NOT_FOUND | 「住所を入力してください」 |
| 住所未発見 | NOT_FOUND | 「指定された住所が見つかりませんでした」 |
| ネットワークエラー | NETWORK_ERROR | 「ネットワークエラーが発生しました」 |
| タイムアウト | NETWORK_ERROR | 「接続がタイムアウトしました」 |
| APIエラー | API_ERROR | 「APIエラーが発生しました」 |

**警告（正常処理時）**:
| 状況 | 警告種別 | 表示内容 |
|------|----------|---------|
| 入力住所とマッチ住所が異なる | address_partial_match | 「〇〇」までの情報で位置を特定しました |

**依存関係**:

- なし（ブラウザ標準のfetch APIを使用）

### MapUrlGenerator（地図URL生成）

**責務**:

- 各地図サービスのURL生成
- URLパラメータの適切なエンコード

**インターフェース**:

```typescript
class MapUrlGenerator {
  // 全地図サービスのURLを生成
  generateAll(coord: Coordinate): MapUrls;

  // Google Maps URL生成
  generateGoogleMaps(coord: Coordinate): string;

  // Yahoo!地図 URL生成
  generateYahooMap(coord: Coordinate): string;

  // Apple Maps URL生成
  generateAppleMaps(coord: Coordinate): string;

  // 地理院地図 URL生成
  generateGsiMap(coord: Coordinate): string;
}
```

**依存関係**:

- なし

### ReverseGeocodingService（逆ジオコーディング）

**責務**:

- 座標から住所への変換（逆ジオコーディング）
- Mapbox Geocoding APIまたはYahoo!逆ジオコーダAPIとの通信

**インターフェース**:

```typescript
interface ReverseGeocodingResult {
  address: string;           // 住所文字列
  prefecture?: string;       // 都道府県
  city?: string;             // 市区町村
}

class ReverseGeocodingService {
  // 座標を住所に変換
  async reverseGeocode(coord: Coordinate): Promise<ReverseGeocodingResult>;
}
```

**使用API**:

- Mapbox Geocoding API（推奨）
- エンドポイント: `https://api.mapbox.com/geocoding/v5/mapbox.places/{lng},{lat}.json`
- 認証: `access_token`パラメータ
- 無料枠: 100,000件/月

**依存関係**:

- なし（fetch APIを使用）

### POIService（POIデータ管理）

**責務**:

- 自前API経由でのPOIデータ取得
- POI表示範囲のフィルタリング
- POIデータのキャッシュ管理
- Mapboxレイヤー用GeoJSONデータの生成

**インターフェース**:

```typescript
interface POIQueryOptions {
  bounds: MapBounds;           // 表示範囲（bbox）
  types: POIType[];            // 取得するPOI種別
  zoom: number;                // 現在のズームレベル
}

interface MapBounds {
  north: number;  // 北端緯度
  south: number;  // 南端緯度
  east: number;   // 東端経度
  west: number;   // 西端経度
}

// 一覧取得レスポンス（最小限の項目）
interface POIListItem {
  id: string;
  type: POIType;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
}

// 詳細取得レスポンス（追加項目を含む）
interface POIDetail extends POIListItem {
  detailText?: string;         // 設置場所詳細
  availabilityText?: string;   // 利用可能時間
  childPadAvailable?: boolean; // 小児対応（AED）
  source: string;              // データソース
  updatedAt?: Date;            // データ更新日時
}

class POIService {
  // 表示範囲内のPOIを取得（一覧）
  // GET /api/pois?bbox=...&types=...&zoom=...
  async getPOIs(options: POIQueryOptions): Promise<POIListItem[]>;

  // 単一POIの詳細を取得
  // GET /api/pois/{id}
  async getPOIDetail(id: string): Promise<POIDetail | null>;

  // GeoJSON形式に変換（Mapbox描画用）
  toGeoJSON(pois: POIListItem[]): GeoJSON.FeatureCollection;

  // キャッシュをクリア
  clearCache(): void;
}
```

**データ取得戦略**:

- フロントエンドは公開データソースを直接叩かず、自前API（`/api/pois`）を経由
- 一覧取得ではパネル初回表示に必要な最小限の項目のみ返却
- 詳細情報（設置場所詳細、利用可能時間等）はPOIタップ時に`/api/pois/{id}`で補完
- 地図移動/ズーム終了時にbbox内POIを取得（デバウンス300ms）

**ズームレベル連動**:

- 低ズーム（広域）: クラスタ表示、POI件数制限
- 高ズーム（詳細）: 範囲内の全POI表示
- 消火栓は低ズームで表示抑制

**キャッシュ戦略**:

- メモリキャッシュ（セッション中のみ）
- bbox + zoom + typesをキーにキャッシュ
- 同一周辺範囲の取得結果は再利用
- 5分経過で自動リフレッシュ

**依存関係**:

- なし（fetch APIを使用）

### MapInteractionService（マップインタラクション）

**責務**:

- マップの長押し検出
- ピン位置の管理
- スライドパネルの表示状態管理
- **POI選択状態の管理**
- **アクティブピンとPOI選択の排他制御**

**インターフェース**:

```typescript
interface PinLocation {
  coordinate: Coordinate;    // WGS84座標
  address?: string;          // 逆ジオコーディング結果
  tokyoCoordinate?: Coordinate;  // Tokyo Datum座標
}

interface MapInteractionState {
  pin: PinLocation | null;
  isPanelOpen: boolean;
  isLoadingAddress: boolean;
}

// カスタムフック
function useMapInteraction(): {
  state: MapInteractionState;
  handleLongPress: (lngLat: { lng: number; lat: number }) => void;
  closePanel: () => void;
};
```

**依存関係**:

- ReverseGeocodingService
- DatumTransformer

### MunicipalityRepository（市町村リポジトリ / サーバーサイド）

**責務**:

- Supabase経由での市町村マスタ取得
- 都道府県・市町村slugの検証
- Server Component / generateStaticParams / generateMetadata からの利用

**インターフェース**:

```typescript
// lib/server/municipality/MunicipalityRepository.ts
class MunicipalityRepository {
  /**
   * スラッグから市町村を取得
   * RLSにより isPublic=false の市町村は取得不可
   */
  async getMunicipality(
    prefectureSlug: string,
    municipalitySlug: string
  ): Promise<Municipality | null>;

  /**
   * 都道府県を取得
   */
  async getPrefecture(prefectureSlug: string): Promise<Prefecture | null>;

  /**
   * 都道府県内の市町村一覧を取得
   */
  async getMunicipalitiesByPrefecture(prefectureSlug: string): Promise<Municipality[]>;

  /**
   * 公開中の全市町村を取得（generateStaticParams用）
   */
  async getPublicMunicipalities(): Promise<Municipality[]>;

  /**
   * インデックス対象の市町村を取得（sitemap生成用）
   * isPublic=true && status.isIndexed=true のみ
   */
  async getIndexedMunicipalities(): Promise<Municipality[]>;

  /**
   * 市町村の最新更新日時を取得（sitemap lastModified用）
   * 該当市町村の全レイヤーの lastImportedAt から最新値を返す
   */
  async getLatestImportedAt(jisCode: string): Promise<Date | null>;
}
```

**依存関係**:

- Supabase Client（サーバーサイド）

**注意**: このクラスはサーバーサイド専用。Client Componentからは使用不可。

### MunicipalityService（市町村サービス / クライアントサイド）

**責務**:

- API Route経由での市町村データ取得
- Client Componentからのランタイムデータ取得

**インターフェース**:

```typescript
// lib/services/municipality/MunicipalityService.ts
class MunicipalityService {
  /**
   * API経由で市町村を取得
   * GET /api/municipalities/{prefectureSlug}/{municipalitySlug}
   */
  async getMunicipality(
    prefectureSlug: string,
    municipalitySlug: string
  ): Promise<Municipality | null>;

  /**
   * API経由で都道府県内の市町村一覧を取得
   * GET /api/municipalities?prefecture={prefectureSlug}
   */
  async getMunicipalitiesByPrefecture(prefectureSlug: string): Promise<Municipality[]>;
}
```

**依存関係**:

- なし（fetch APIを使用）

**注意**: クライアントサイド専用。静的生成やServer Componentでは MunicipalityRepository を使用すること。

### MunicipalityLayerStatusRepository（市町村レイヤー状態リポジトリ / サーバーサイド）

**責務**:

- 市町村別レイヤー状態の取得
- 更新日時・件数情報の提供

**インターフェース**:

```typescript
// lib/server/municipality/MunicipalityLayerStatusRepository.ts
class MunicipalityLayerStatusRepository {
  /**
   * 市町村のレイヤー状態を取得
   */
  async getLayerStatus(
    jisCode: string,
    layerType: POIType
  ): Promise<MunicipalityLayerStatus | null>;

  /**
   * 市町村の全レイヤー状態を取得
   */
  async getAllLayerStatuses(jisCode: string): Promise<MunicipalityLayerStatus[]>;

  /**
   * 市町村の最新インポート日時を取得
   * 全レイヤーの lastImportedAt から最新値を返す
   */
  async getLatestImportedAt(jisCode: string): Promise<Date | null>;
}
```

**依存関係**:

- Supabase Client（サーバーサイド）

**注意**: このクラスはサーバーサイド専用。ページ表示時のレイヤー状態取得に使用。

## ユースケース図

### ユースケース1: WGS84座標入力→地図起動

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as UIレイヤー
    participant Parser as InputParser
    participant Converter as CoordinateConverter
    participant Datum as DatumTransformer
    participant Validator as ValidationService
    participant MapGen as MapUrlGenerator

    User->>UI: WGS84入力欄に座標を入力<br/>"35.6812, 139.7671"
    UI->>Parser: parse(input)
    Parser->>Parser: 座標形式を判定（十進度/度分秒）
    Parser-->>UI: LocationInput<br/>(type: coordinate_decimal)

    UI->>Converter: normalize(coordinate)
    Converter-->>UI: 正規化済み座標

    UI->>Datum: wgs84ToTokyo(coord)
    Datum-->>UI: Tokyo Datum座標

    UI->>Validator: generateWarnings(input, coord)
    Validator-->>UI: 警告一覧

    UI->>MapGen: generateAll(wgs84Coord)
    MapGen-->>UI: MapUrls

    UI-->>User: 結果表示<br/>（WGS84座標、Tokyo座標、警告、地図ボタン）

    User->>UI: Google Mapsボタンをクリック
    UI->>UI: 新しいタブで地図を開く
```

**フロー説明**:

1. ユーザーがWGS84入力欄に座標を貼り付け
2. InputParserが座標形式を判定（十進度/度分秒）
3. CoordinateConverterが座標を正規化
4. DatumTransformerがTokyo Datumに変換
5. ValidationServiceが警告を生成
6. MapUrlGeneratorが各地図サービスのURLを生成（WGS84座標を使用）
7. UIに結果を表示
8. ユーザーが地図ボタンをクリックして地図を開く

### ユースケース1b: Tokyo Datum座標入力→地図起動

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as UIレイヤー
    participant Parser as InputParser
    participant Converter as CoordinateConverter
    participant Datum as DatumTransformer
    participant Validator as ValidationService
    participant MapGen as MapUrlGenerator

    User->>UI: Tokyo Datum入力欄に座標を入力<br/>"35.6812, 139.7671"
    UI->>Parser: parse(input)
    Parser->>Parser: 座標形式を判定
    Parser-->>UI: LocationInput

    UI->>Converter: normalize(coordinate)
    Converter-->>UI: 正規化済み座標

    UI->>Datum: tokyoToWgs84(coord)
    Datum-->>UI: WGS84座標

    UI->>Validator: generateWarnings(input, wgs84Coord)
    Validator-->>UI: 警告一覧

    UI->>MapGen: generateAll(wgs84Coord)
    MapGen-->>UI: MapUrls

    UI-->>User: 結果表示<br/>（WGS84座標、Tokyo座標、警告、地図ボタン）
```

**フロー説明**:

1. ユーザーがTokyo Datum入力欄に座標を貼り付け
2. InputParserが座標形式を判定
3. CoordinateConverterが座標を正規化
4. DatumTransformerがWGS84に変換（約400-500m移動）
5. ValidationServiceが警告を生成
6. MapUrlGeneratorが各地図サービスのURLを生成（WGS84座標を使用）
7. UIに結果を表示

### ユースケース2: 曖昧な入力→警告表示

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as UIレイヤー
    participant Parser as InputParser
    participant Validator as ValidationService

    User->>UI: 曖昧な座標を入力<br/>"139.7671, 35.6812"
    UI->>Parser: parse(input)
    Parser->>Parser: 入力種別を判定
    Parser-->>UI: LocationInput

    UI->>Validator: validateCoordinateOrder(lat, lng)
    Validator-->>UI: false（順番が不自然）

    UI->>Validator: suggestSwappedCoordinate(coord)
    Validator-->>UI: 入れ替え候補

    UI->>Validator: generateWarnings(input, coord)
    Validator-->>UI: Warning[]<br/>(coordinate_order_ambiguous)

    UI-->>User: 警告表示<br/>"緯度経度の順番を確認してください"<br/>入れ替え候補を表示
```

### ユースケース3: 検索バーから変換→マップズーム→結果表示

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant SearchBar as 検索バー
    participant Parser as InputParser
    participant Geo as GeocodingService
    participant Datum as DatumTransformer
    participant Validator as ValidationService
    participant MapGen as MapUrlGenerator
    participant Map as Mapbox GL JS
    participant Panel as スライドパネル

    User->>SearchBar: 入力タイプを選択（住所/WGS84/Tokyo）
    User->>SearchBar: 住所または座標を入力
    User->>SearchBar: 「変換」ボタンをクリック

    alt 住所入力の場合
        SearchBar->>Geo: geocode(address)
        Geo-->>SearchBar: WGS84座標
    else 座標入力の場合
        SearchBar->>Parser: parse(input)
        Parser-->>SearchBar: 座標
    end

    SearchBar->>Datum: 測地系変換
    Datum-->>SearchBar: WGS84/Tokyo両方の座標

    SearchBar->>Validator: generateWarnings()
    Validator-->>SearchBar: 警告一覧

    SearchBar->>MapGen: generateAll(wgs84)
    MapGen-->>SearchBar: MapUrls

    SearchBar->>Map: flyTo(座標)
    Map->>Map: ズーム＋ピン配置

    SearchBar->>Panel: 結果を表示
    Panel-->>User: スライドパネル表示<br/>（判定結果、警告、座標、地図リンク）
```

**フロー説明**:

1. ユーザーが検索バーで入力タイプを選択
2. 住所または座標を入力して「変換」ボタンをクリック
3. 入力タイプに応じてジオコーディングまたは座標パース
4. 測地系変換を実行
5. 警告を生成
6. 地図URLを生成
7. マップが該当座標にズーム、ピンを配置
8. スライドパネルに変換結果を表示

### ユースケース4: マップ長押し→座標取得→共有

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Map as Mapbox GL JS
    participant ReverseGeo as ReverseGeocodingService
    participant Datum as DatumTransformer
    participant Panel as スライドパネル
    participant Share as ShareService

    User->>Map: マップ上を長押し（500ms）
    Map->>Map: longpress イベント<br/>(lng, lat)
    Map->>Map: ピンを表示

    Map->>ReverseGeo: reverseGeocode(coord)
    ReverseGeo-->>Map: 住所文字列

    Map->>Datum: wgs84ToTokyo(coord)
    Datum-->>Map: Tokyo Datum座標

    Map->>Panel: スライドパネルを表示
    Panel-->>User: パネル表示<br/>（住所、WGS84、Tokyo Datum、共有ボタン）

    User->>Panel: 「LINEで共有」ボタンをタップ
    Panel->>Share: generateShareText(wgs84, tokyo, mapUrl)
    Share-->>Panel: 共有テキスト
    Panel->>Panel: LINE共有画面を開く
```

**フロー説明**:

1. ユーザーがマップ上を長押し（約500ms）
2. 長押し位置にピンを表示
3. 逆ジオコーディングで住所を取得
4. 座標をTokyo Datumに変換
5. スライドパネルに情報を表示
6. 共有ボタンで位置情報を共有

### ユースケース5: POIレイヤー表示→POIタップ→詳細確認

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant LayerUI as レイヤー切替UI
    participant Map as Mapbox GL JS
    participant POISvc as POIService
    participant API as 自前API
    participant Panel as スライドパネル
    participant MapGen as MapUrlGenerator

    User->>LayerUI: AEDレイヤーをON
    LayerUI->>Map: レイヤー表示状態を更新
    Map->>POISvc: getPOIs({ types: ['aed'], bounds, zoom })
    POISvc->>API: GET /api/pois?bbox=...&types=aed&zoom=...
    API-->>POISvc: POI一覧（最小限項目）
    POISvc-->>Map: GeoJSON形式のPOIデータ
    Map->>Map: AEDピンを地図上に表示<br/>（Mapbox layer/source）

    User->>Map: AEDピンをタップ
    Map->>Map: 既存のアクティブピンをクリア<br/>（排他制御）
    Map->>Map: タップしたPOIをハイライト表示

    Note over Map,Panel: 一覧データで初回パネル表示
    Map->>Panel: スライドパネルを表示<br/>（一覧データで表示可能な項目）

    Note over POISvc,API: 詳細情報を非同期取得
    Map->>POISvc: getPOIDetail(poiId)
    POISvc->>API: GET /api/pois/{poiId}
    API-->>POISvc: POI詳細情報
    POISvc-->>Panel: 詳細情報で補完

    Panel->>MapGen: generateGoogleMaps(coord)
    MapGen-->>Panel: Google Maps URL
    Panel-->>User: パネル表示<br/>（名称、種別、住所、座標、利用可能時間、<br/>外部地図リンク、共有ボタン）

    User->>Panel: 「Google Mapsで開く」をタップ
    Panel->>Panel: 新しいタブでGoogle Mapsを開く
```

**フロー説明**:

1. ユーザーがレイヤー切替UIでAEDレイヤーをON
2. 自前API経由で表示範囲内のAEDデータを取得（最小限項目）
3. GeoJSON形式に変換し、Mapbox layer/sourceで地図上にピン表示
4. ユーザーがAEDピンをタップ
5. 既存のアクティブピン（検索/長押し結果）があればクリア（排他制御）
6. 一覧データで初回パネル表示（即時応答）
7. 詳細API（`GET /api/pois/{id}`）で追加情報を非同期取得・補完
8. 外部地図や共有機能を利用

**POI外部地図リンク**:
- MVPでは簡素化のためGoogle Mapsのみ
- 将来的に他の地図サービス（Yahoo!地図、Apple Maps等）への拡張余地は残す

**状態管理（排他制御）**:

地図上の選択状態を常に1つに保つため、以下のルールを適用:

| 操作 | アクティブピン | POI選択 |
|------|--------------|---------|
| 検索/変換実行 | 新規作成 | クリア |
| 長押し | 新規作成 | クリア |
| POIタップ | クリア | 選択 |
| パネル閉じる | 維持 | 維持 |

### ユースケース6: レイヤー切替

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant LayerUI as レイヤー切替UI
    participant Map as Mapbox GL JS
    participant POISvc as POIService

    Note over LayerUI: 初期状態<br/>AED=ON, 消火栓=OFF

    User->>LayerUI: 消火栓レイヤーをON
    LayerUI->>Map: layerVisibility.fireHydrant = true
    Map->>POISvc: getPOIs({ types: ['fireHydrant'], bounds })
    POISvc-->>Map: 消火栓POI一覧
    Map->>Map: 消火栓ピンを地図上に表示

    User->>LayerUI: AEDレイヤーをOFF
    LayerUI->>Map: layerVisibility.aed = false
    Map->>Map: AEDピンを非表示
```

**フロー説明**:

1. 初期状態ではAED=ON、消火栓=OFF
2. ユーザーがレイヤー切替UIで消火栓をON
3. 消火栓データを取得して表示
4. ユーザーがAEDをOFFにすると非表示

### ユースケース7: 市町村ページ初期表示

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Router as Next.js Router
    participant Page as 市町村ページ
    participant MuniSvc as MunicipalityService
    participant Map as Mapbox GL JS
    participant POISvc as POIService
    participant API as 自前API

    User->>Router: /maps/ishikawa/wajima にアクセス
    Router->>Page: prefectureSlug="ishikawa"<br/>municipalitySlug="wajima"

    Page->>MuniSvc: getMunicipality(prefectureSlug, municipalitySlug)
    MuniSvc-->>Page: Municipality設定

    alt status.isPublic=false
        Page-->>User: 404ページ
    else status.isPublic=true
        Page->>Page: generateMetadata()で<br/>SEOメタデータを設定
        Note over Page: isIndexed=false の場合<br/>robots: noindex,nofollow

        Page->>Map: fitBounds(bbox)<br/>または flyTo(center, initialZoom)
        Map-->>User: 市町村範囲で地図表示

        Page->>POISvc: getPOIs({<br/>  bbox: municipality.map.bbox,<br/>  types: defaultLayers<br/>})
        POISvc->>API: GET /api/pois?bbox=...&types=...
        API-->>POISvc: POI一覧
        POISvc-->>Map: GeoJSON
        Map-->>User: 市町村内POI表示

        Page-->>User: ページコンテンツ表示<br/>(h1, 導入文, 注意事項, ソース情報)
    end
```

**フロー説明**:

1. ユーザーが市町村URL（例: `/maps/ishikawa/wajima`）にアクセス
2. Next.js RouterがURLからスラッグを抽出
3. MunicipalityServiceから市町村設定を取得
4. `isPublic=false` の場合は404を返す
5. `generateMetadata()` でSEOメタデータを動的生成
   - `isIndexed=false` の場合は `robots: noindex,nofollow` を付与
6. 市町村の `bbox` / `center` / `initialZoom` で地図を初期表示
7. `defaultLayers` に従って初期レイヤーを有効化
8. 市町村 `bbox` を使用して初回POI取得
9. ページコンテンツ（h1、導入文、注意事項、データソース情報）を表示

**代替シナリオ**:

| 条件 | 動作 |
|------|------|
| 市町村が見つからない | 404ページ表示 |
| `isPublic=false` | 404ページ表示 |
| `isIndexed=false` | ページは表示、noindexメタタグ付与 |
| POI取得失敗 | 地図は表示、POIなしで継続 |

## 画面遷移図

```mermaid
stateDiagram-v2
    [*] --> マップ表示

    state マップ中心UI {
        [*] --> マップ表示

        state 検索フロー {
            マップ表示 --> 検索入力: 検索バーに入力
            検索入力 --> 処理中: 変換ボタン
            処理中 --> 結果パネル表示: 変換成功
            処理中 --> エラー表示: 変換失敗
            結果パネル表示 --> マップ表示: パネル閉じる
            結果パネル表示 --> 外部地図表示: 地図ボタン
            外部地図表示 --> 結果パネル表示: 戻る
            結果パネル表示 --> 共有画面: 共有ボタン
            共有画面 --> 結果パネル表示: 戻る
            エラー表示 --> 検索入力: 再入力
        }

        state 長押しフロー {
            マップ表示 --> ピン設置: 長押し
            ピン設置 --> 位置パネル表示: 住所取得完了
            位置パネル表示 --> マップ表示: パネル閉じる
            位置パネル表示 --> ピン設置: 別の場所を長押し
        }
    }
```

## ルーティング設計

### URL構造

市町村ごとの検索流入を受けるため、正規URLを市町村単位で持つ。

```
/maps                                    # 全国トップ
/maps/[prefectureSlug]                   # 都道府県ページ
/maps/[prefectureSlug]/[municipalitySlug] # 市町村ページ
```

**例**:
- `/maps` - 全国の入口
- `/maps/ishikawa` - 石川県
- `/maps/ishikawa/wajima` - 輪島市

### Next.js App Router設計

```
app/
  maps/
    page.tsx                           # /maps - 全国トップ
    [prefectureSlug]/
      page.tsx                         # /maps/[prefecture] - 都道府県ページ
      [municipalitySlug]/
        page.tsx                       # /maps/[prefecture]/[municipality] - 市町村ページ
```

### metadata動的生成

```typescript
// app/maps/[prefectureSlug]/[municipalitySlug]/page.tsx

interface PageProps {
  params: Promise<{
    prefectureSlug: string;
    municipalitySlug: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { prefectureSlug, municipalitySlug } = await params;
  // サーバーサイドではRepositoryを直接使用
  const municipality = await getMunicipalityRepository().getMunicipality(
    prefectureSlug,
    municipalitySlug
  );

  // RLSにより isPublic=false の市町村は null として返却される
  if (!municipality) {
    return {};
  }

  return {
    title: municipality.seo.title,
    description: municipality.seo.description,
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

export default async function MunicipalityPage({ params }: PageProps) {
  const { prefectureSlug, municipalitySlug } = await params;
  // サーバーサイドではRepositoryを直接使用
  const municipality = await getMunicipalityRepository().getMunicipality(
    prefectureSlug,
    municipalitySlug
  );

  // RLSにより isPublic=false の市町村は null として返却される
  if (!municipality) {
    notFound();
  }

  return <MunicipalityMapView municipality={municipality} />;
}
```

### 運用設計

#### 静的生成（generateStaticParams）

- `generateStaticParams` を使用して `isPublic=true` の市町村ページを事前生成
- ビルド時に市町村マスタから公開対象を取得
- 新規市町村追加時は再ビルドまたはISR（Incremental Static Regeneration）で対応

```typescript
export async function generateStaticParams() {
  // サーバーサイドではRepositoryを直接使用
  const municipalities = await getMunicipalityRepository().getPublicMunicipalities();

  return municipalities.map((m) => ({
    prefectureSlug: m.prefectureSlug,
    municipalitySlug: m.municipalitySlug,
  }));
}
```

#### noindex制御

- `isIndexed=false` の市町村ページには `<meta name="robots" content="noindex,nofollow">` を付与
- `generateMetadata()` 内で `robots` フィールドを条件分岐
- データ未整備の市町村ページを段階的に公開する際に使用

#### sitemap生成

- sitemap.xml には `isPublic=true && isIndexed=true` のページのみ含める
- `app/sitemap.ts` で市町村マスタをフィルタして動的生成
- 都道府県ページも同様の条件で含める

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

### クエリパラメータ

表示状態の共有・復元にはクエリパラメータを使用する。

| パラメータ | 説明 | 例 |
|-----------|------|-----|
| `layers` | 有効なレイヤー | `layers=aed,fireHydrant` |
| `poi` | 選択中のPOI ID | `poi=aed-123` |
| `lat`, `lng`, `z` | 地図の中心座標とズーム | `lat=37.4&lng=136.9&z=14` |
| `q` | 検索クエリ（将来用） | `q=輪島市役所` |

### canonical制御

- **canonical は常に市町村固定URLに寄せる**
  - 例: `/maps/ishikawa/wajima?layers=aed&poi=123` の canonical は `/maps/ishikawa/wajima`
- クエリ違いだけのページはインデックス対象にしない

## バックエンド基盤設計

### Supabase + PostGIS構成

フロントエンドは公的APIを直接叩かず、自前APIを経由してPOIデータを取得する。

**バックエンドデータストア**:

- **Supabase Postgres** を基盤とする
- **PostGIS拡張** を有効化し、空間検索機能を利用
- bbox検索を効率的に実行するため空間インデックス（GIST）を使用

**データ永続化の範囲**:

| 対象 | 永続化 | 備考 |
|------|--------|------|
| 公開POIデータ | ○ サーバーサイドDB | AED、消火栓など |
| 市町村マスタ | ○ サーバーサイドDB | ルーティング・SEO設定 |
| 市町村レイヤー状態 | ○ サーバーサイドDB | 更新日時・件数 |
| ユーザー入力・変換履歴 | × 端末ローカルのみ | MVPではサーバー保存なし |

### データベーススキーマ

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
  seo_h1 VARCHAR(200),
  content_intro_text TEXT,
  content_caution_text TEXT,
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

### 空間検索パターン

```sql
-- bbox検索（地図表示用、主用途）
-- geometry型 + && 演算子 + GISTインデックスで高速検索
SELECT
  id,
  type,
  name,
  ST_Y(location) as latitude,
  ST_X(location) as longitude,
  address
FROM pois
WHERE type = ANY($1::text[])  -- types配列
  AND location && ST_MakeEnvelope($2, $3, $4, $5, 4326)  -- west, south, east, north
ORDER BY id
LIMIT $6;

-- 距離計算が必要な場合のみ geography cast を使用
SELECT
  id,
  name,
  ST_Y(location) as latitude,
  ST_X(location) as longitude,
  ST_Distance(
    location::geography,
    ST_MakePoint($1, $2)::geography
  ) as distance_meters
FROM pois
WHERE ST_DWithin(
  location::geography,
  ST_MakePoint($1, $2)::geography,  -- lng, lat
  $3  -- radius_meters
)
ORDER BY distance_meters
LIMIT $4;
```

### Supabase権限設計

#### 読取方針

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

#### 書込・更新方針

- データ取り込み・更新は `service_role` / バッチ処理のみ
- `anon` ロールには INSERT/UPDATE/DELETE 権限なし
- 定期インポートバッチが `service_role` で実行

```sql
-- service_roleには全権限
-- anonには読取のみ（INSERT/UPDATE/DELETEなし）
GRANT SELECT ON municipalities TO anon;
GRANT SELECT ON pois TO anon;
GRANT SELECT ON municipality_layer_statuses TO anon;

-- service_roleにはCRUD全権限
GRANT ALL ON municipalities TO service_role;
GRANT ALL ON pois TO service_role;
GRANT ALL ON municipality_layer_statuses TO service_role;
```

#### isPublic / isIndexed の制御

| isPublic | isIndexed | 動作 |
|----------|-----------|------|
| false | - | RLSで非公開、API/ページで404を返す |
| true | false | 公開するが `noindex,nofollow` を付与 |
| true | true | 完全公開、sitemapに含む |

- `isPublic=false`: データ自体が非公開（RLSでフィルタ）
- `isIndexed=false`: データは公開するが検索エンジンには露出しない（段階的公開用）

### 更新戦略

公開データは定期的にSupabase DBへ同期する。

**更新頻度**:

- 日次〜週次での同期を基本
- リアルタイム更新は不要

**保持情報**:

- `source`: データソース名
- `source_updated_at`: ソース側の更新日時
- `imported_at` / `last_imported_at`: 自前DBへの反映日時

**更新日時の使い分け**:

- **lastImportedAt**: アプリへの最終反映日時。ページ上で「最終更新日」として表示
- **sourceUpdatedAt**: 元データ（公開データソース）の更新日時。参照情報として補足表示

## API設計

### POI API

#### GET /api/pois - POI一覧取得

**クエリパラメータ**:

| パラメータ | 必須 | 形式 | 説明 |
|-----------|------|------|------|
| `bbox` | ○ | `west,south,east,north` | 表示範囲（例: `136.5,37.0,137.5,37.8`） |
| `types` | - | `aed,fireHydrant` | 取得するPOI種別（デフォルト: 全種別） |
| `zoom` | - | 数値 | ズームレベル（返却件数・詳細度の調整に使用） |
| `municipalityCode` | - | JISコード | 市町村初回取得用 |

**レスポンス**:

```typescript
interface POIListResponse {
  pois: POIListItem[];
  meta: {
    total: number;
    bbox: {
      west: number;
      south: number;
      east: number;
      north: number;
    };
    types: POIType[];
  };
}

interface POIListItem {
  id: string;
  type: POIType;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
}
```

**設計原則**:

- 一覧取得では **パネル初期表示に必要な最小限項目** のみ返却
- POIタップ時にパネルを即座に表示し、詳細情報は非同期で補完

#### GET /api/pois/{id} - POI詳細取得

**レスポンス**:

```typescript
interface POIDetailResponse {
  poi: POIDetail;
}

interface POIDetail extends POIListItem {
  detailText?: string;         // 設置場所詳細
  availabilityText?: string;   // 利用可能時間
  childPadAvailable?: boolean; // 小児対応（AED）
  source: string;              // データソース
  updatedAt?: Date;            // データ更新日時
}
```

**設計原則**:

- 詳細取得では **一覧に含まれない追加情報のみ** を補完
- 詳細情報が不要なケース（外部地図起動のみ）では呼び出し不要

### Municipality API

#### GET /api/municipalities/{prefectureSlug}/{municipalitySlug}

**用途**: Client Componentからの市町村詳細取得

**レスポンス**:

```typescript
interface MunicipalityResponse {
  municipality: Municipality;
  layerStatuses: MunicipalityLayerStatus[];
}
```

#### GET /api/municipalities - 市町村一覧取得

**用途**: Client Componentからの市町村一覧取得（都道府県ページ等）

**クエリパラメータ**:

| パラメータ | 必須 | 形式 | 説明 |
|-----------|------|------|------|
| `prefecture` | - | slug | 都道府県でフィルタ |

**レスポンス**:

```typescript
interface MunicipalityListResponse {
  municipalities: Municipality[];
  total: number;
}
```

**注意**:
- RLSにより `isPublic=true` の市町村のみ返却
- `isPublic` / `isIndexed` でのフィルタは不要（静的生成時はRepository直利用）

## アルゴリズム設計

### 座標形式判定アルゴリズム

**目的**: 座標入力欄に入力された文字列が十進度か度分秒かを判定する

**計算ロジック**:

#### ステップ1: 前処理

- 全角数字を半角に変換
- 前後の空白を除去
- 複数の空白を単一に正規化

#### ステップ2: 十進度座標パターンマッチ

```typescript
// 十進度形式のパターン
const DECIMAL_PATTERNS = [
  // カンマ区切り: 35.6812, 139.7671
  /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/,
  // 空白区切り: 35.6812 139.7671
  /^(-?\d+\.?\d*)\s+(-?\d+\.?\d*)$/,
  // N/E表記: N35.6812 E139.7671
  /^[NS]?\s*(-?\d+\.?\d*)\s*[,\s]\s*[EW]?\s*(-?\d+\.?\d*)$/i,
];
```

#### ステップ3: 度分秒座標パターンマッチ

```typescript
// 度分秒形式のパターン
const DMS_PATTERNS = [
  // 記号付き: 35°40'52"N 139°46'2"E
  /(\d+)°(\d+)'([\d.]+)"?\s*([NS])?\s*[,\s]\s*(\d+)°(\d+)'([\d.]+)"?\s*([EW])?/i,
  // 数字のみ: 354052 1394602
  /^(\d{2})(\d{2})(\d{2})\s+(\d{3})(\d{2})(\d{2})$/,
];
```

#### ステップ4: 確信度計算

```typescript
function calculateConfidence(input: string, type: InputType): number {
  // 明確なパターンマッチ: 0.9-1.0
  // 部分的なマッチ: 0.6-0.8
  // 推測による判定: 0.3-0.5
  // 判定不能: 0.0
}
```

**実装例**:

```typescript
class InputParser {
  parse(input: string): LocationInput {
    const normalized = this.normalize(input);

    // 十進度座標を試行
    const decimalResult = this.parseDecimalCoordinate(normalized);
    if (decimalResult) {
      return {
        rawInput: input,
        inputType: "coordinate_decimal",
        confidence: decimalResult.confidence,
        parsedData: decimalResult.coordinate,
      };
    }

    // 度分秒座標を試行
    const dmsResult = this.parseDmsCoordinate(normalized);
    if (dmsResult) {
      return {
        rawInput: input,
        inputType: "coordinate_dms",
        confidence: dmsResult.confidence,
        parsedData: dmsResult.coordinate,
      };
    }

    return {
      rawInput: input,
      inputType: "unknown",
      confidence: 0,
      parsedData: null,
    };
  }

  private normalize(input: string): string {
    return input
      .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
      .replace(/[．]/g, ".")
      .replace(/[，]/g, ",")
      .trim()
      .replace(/\s+/g, " ");
  }
}
```

### 座標順序検証アルゴリズム

**目的**: 緯度と経度が入れ替わっている可能性を検出する

**計算ロジック**:

```typescript
class ValidationService {
  // 日本の緯度範囲: 約20°〜46°
  // 日本の経度範囲: 約122°〜154°

  validateCoordinateOrder(lat: number, lng: number): boolean {
    const isLatInRange = lat >= 20 && lat <= 46;
    const isLngInRange = lng >= 122 && lng <= 154;

    // 両方が範囲内なら正しい順序
    if (isLatInRange && isLngInRange) {
      return true;
    }

    // 入れ替えた方が範囲内に収まるか確認
    const swappedLatInRange = lng >= 20 && lng <= 46;
    const swappedLngInRange = lat >= 122 && lat <= 154;

    if (swappedLatInRange && swappedLngInRange) {
      // 入れ替えた方が正しい可能性が高い
      return false;
    }

    // どちらも判定できない
    return true;
  }

  suggestSwappedCoordinate(coord: Coordinate): Coordinate | null {
    if (!this.validateCoordinateOrder(coord.latitude, coord.longitude)) {
      return {
        latitude: coord.longitude,
        longitude: coord.latitude,
      };
    }
    return null;
  }
}
```

### 測地系変換アルゴリズム

**目的**: WGS84とTokyo Datum間の座標変換

**計算ロジック**:

```typescript
class DatumTransformer {
  // proj4の定義
  // WGS84: EPSG:4326 (デフォルト)
  // Tokyo Datum: EPSG:4301

  private static readonly TOKYO_PROJ =
    "+proj=longlat +ellps=bessel +towgs84=-146.414,507.337,680.507,0,0,0,0 +no_defs";

  wgs84ToTokyo(coord: Coordinate): Coordinate {
    // WGS84 → Tokyo Datum
    // 結果は約400-500m南西にシフト
    const result = proj4("EPSG:4326", this.TOKYO_PROJ, [
      coord.longitude,
      coord.latitude,
    ]);
    return this.normalize({ latitude: result[1], longitude: result[0] });
  }

  tokyoToWgs84(coord: Coordinate): Coordinate {
    // Tokyo Datum → WGS84
    // 結果は約400-500m北東にシフト
    const result = proj4(this.TOKYO_PROJ, "EPSG:4326", [
      coord.longitude,
      coord.latitude,
    ]);
    return this.normalize({ latitude: result[1], longitude: result[0] });
  }
}
```

**変換の特徴**:

- Tokyo Datum → WGS84: 座標は北東方向に約400-500m移動
- WGS84 → Tokyo Datum: 座標は南西方向に約400-500m移動
- 入力欄ごとに測地系が確定しているため、推定処理は不要

## UI設計

### マップ中心UIレイアウト

```
┌─────────────────────────────────────────────────────────────────┐
│  🗺️ ichi-link                                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [住所▼] 検索ボックス...                      [変換]    │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ↑ フローティング検索バー（地図上にオーバーレイ）              │
│    ドロップダウン展開時:                                        │
│    ┌──────────────┐                                            │
│    │ ● 住所       │                                            │
│    │ ○ WGS84     │                                            │
│    │ ○ Tokyo     │                                            │
│    └──────────────┘                                            │
│                                                                 │
│  ┌──────────────┐  ← レイヤー切替UI（左上または右上）         │
│  │ ● AED       │     ●=ON, ○=OFF                              │
│  │ ○ 消火栓   │     初期: AED=ON, 消火栓=OFF                 │
│  └──────────────┘                                              │
│                                                                 │
│                     Mapbox 地図表示                              │
│                    （メイン画面）                                │
│                                                                 │
│            🔴AED  🔴AED       📍(検索結果ピン)                 │
│                                                                 │
│                    🔴AED                                        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ↑ スライドパネル（変換結果または長押し後に表示）              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ━━━━━ (ドラッグハンドル)                                │   │
│  │                                                          │   │
│  │ 📋 判定: 住所として判定                                  │   │
│  │ ⚠️ 警告（あれば表示）                                    │   │
│  │                                                          │   │
│  │ [LINEで共有] [共有]                   ← 共有ボタン群     │   │
│  │                                                          │   │
│  │ ─────────────────────────────────────────────────────── │   │
│  │                                                          │   │
│  │ 住所                                                     │   │
│  │ 東京都千代田区丸の内1-1-1                    [コピー]   │   │
│  │                                                          │   │
│  │ 世界測地系（WGS84）                                      │   │
│  │ 35.681200, 139.767100                        [コピー]   │   │
│  │                                                          │   │
│  │ 旧日本測地系（Tokyo Datum）                              │   │
│  │ 35.677xxx, 139.763xxx                        [コピー]   │   │
│  │                                                          │   │
│  │                                       [全部コピー]       │   │
│  │                                                          │   │
│  │ ─────────────────────────────────────────────────────── │   │
│  │                                                          │   │
│  │ 🗺️ 地図で開く                                            │   │
│  │ [Google Maps] [Yahoo!地図] [Apple Maps] [地理院地図]    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### フローティング検索バーの動作

| 入力タイプ   | 測地系 | 変換処理                     | 状態                            |
| ----------- | ------ | ---------------------------- | ------------------------------- |
| 住所        | -      | ジオコーディング→WGS84→Tokyo | 有効（Yahoo!ジオコーダAPI使用） |
| WGS84       | WGS84  | WGS84→Tokyo変換              | 有効                            |
| Tokyo Datum | Tokyo  | Tokyo→WGS84変換              | 有効                            |

### 検索バーのインタラクション

1. ユーザーがドロップダウンで入力タイプを選択
2. 検索ボックスに住所または座標を入力
3. 「変換」ボタンまたはEnterキーで変換実行
4. **変換成功時**: 該当座標にマップがズーム＋ピン配置、スライドパネルが表示
5. **変換失敗時**: エラーメッセージを表示

### スライドパネルの動作

| 状態 | 表示 | トリガー |
|------|------|----------|
| 非表示 | パネルなし | 初期状態、パネル閉じる |
| 読み込み中 | スケルトン表示 | 変換実行中、長押し直後、POI詳細取得中 |
| 表示（変換結果） | 判定結果＋警告＋座標＋地図リンク | 変換完了後 |
| 表示（長押し） | 住所＋座標＋共有ボタン | 長押し後の住所取得完了 |
| 表示（POI詳細） | 名称＋種別＋住所＋座標＋詳細情報＋地図リンク＋共有 | POIタップ後 |

### POI詳細パネルの表示内容

**AEDの場合**:
- 名称
- 種別（AED）
- 住所
- 緯度経度（WGS84）
- 設置場所詳細（例: 1階ロビー）
- 利用可能時間（例: 24時間）
- 小児対応パッド有無
- Google Mapsリンク
- 共有ボタン

**消火栓の場合**:
- 名称または識別情報
- 種別（消火栓）
- 住所または位置説明
- 緯度経度（WGS84）
- Google Mapsリンク
- 共有ボタン
- 注記: 「利用可否は別途確認が必要です」

### レスポンシブデザイン

**ブレークポイント**:

- モバイル: < 640px
- タブレット: 640px - 1024px
- デスクトップ: > 1024px

**モバイル向け調整**:

- 地図ボタンは2列×2行で配置
- コピーボタンはアイコンのみ表示
- 入力欄は画面幅いっぱいに拡張
- マップタブ: 地図はビューポート全体、スライドパネルはボトムシート形式

### カラーコーディング

**警告レベル**:
| レベル | 色 | 用途 |
|--------|------|------|
| info | 青 (text-blue-600) | 情報提供 |
| warning | 黄 (text-yellow-600) | 注意喚起 |
| error | 赤 (text-red-600) | エラー |

**ボタン**:
| 種別 | 色 | 用途 |
|------|------|------|
| primary | 青 (bg-blue-600) | 変換ボタン |
| secondary | グレー (bg-gray-200) | クリアボタン |
| map | 各サービスのブランドカラー | 地図ボタン |

### インタラクション

**入力時**:

1. ユーザーが入力欄にテキストを貼り付け
2. Enterキーまたは「変換」ボタンで変換実行
3. 変換中はローディングインジケーター表示
4. 結果表示後、地図ボタンがアクティブになる

**コピー時**:

1. コピーボタンをクリック
2. クリップボードにコピー
3. 「コピーしました」のトースト通知を表示（2秒間）

## ファイル構造

### ローカルストレージ構造

**データ保存キー**:

```typescript
const STORAGE_KEYS = {
  HISTORY: "ichi-link:history", // 変換履歴
  SETTINGS: "ichi-link:settings", // ユーザー設定
};
```

**履歴データ形式**:

```json
{
  "history": [
    {
      "id": "uuid-v4",
      "input": "35.6812, 139.7671",
      "inputSource": "wgs84",
      "result": {
        "coordinates": {
          "wgs84": { "latitude": 35.6812, "longitude": 139.7671 },
          "tokyo": { "latitude": 35.6775, "longitude": 139.7634 }
        },
        "mapUrls": {
          "googleMaps": "https://...",
          "yahooMap": "https://...",
          "appleMaps": "https://...",
          "gsiMap": "https://..."
        },
        "warnings": []
      },
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "maxItems": 50
}
```

## パフォーマンス最適化

- **遅延評価**: 地図URLは地図ボタンクリック時に生成（初期表示を高速化）
- **デバウンス**: 入力欄のリアルタイム判定は300msのデバウンスを適用
- **キャッシュ**: 同一入力の変換結果はメモリキャッシュ（セッション中のみ）
- **バンドルサイズ**: proj4jsは必要な定義のみをインポート

## セキュリティ考慮事項

- **XSS対策**: 入力値のサニタイズ（URLエンコード）
- **ローカルストレージ**: 位置情報は端末内にのみ保存、サーバー送信なし
- **外部API呼び出し**: MVPでは外部API未使用（将来的にジオコーディングAPI導入時に再検討）
- **HTTPS**: 本番環境では必須

## エラーハンドリング

### エラーの分類

| エラー種別     | 処理                     | ユーザーへの表示                                                     |
| -------------- | ------------------------ | -------------------------------------------------------------------- |
| 入力が空       | 処理を中断               | 「位置情報を入力してください」                                       |
| 判定不能       | 結果なしで表示           | 「入力形式を判定できませんでした。座標または住所を入力してください」 |
| 座標範囲外     | 警告付きで結果表示       | 「指定された座標は日本国外です」                                     |
| コピー失敗     | エラートースト           | 「コピーに失敗しました」                                             |
| ストレージ満杯 | 古い履歴を削除して再試行 | （ユーザーには通知しない）                                           |

## テスト戦略

### ユニットテスト

- **InputParser**: 各入力パターンの判定精度
- **CoordinateConverter**: 座標変換の精度（小数点以下6桁）
- **DatumTransformer**: 測地系変換の精度（proj4jsとの整合性）
- **ValidationService**: 警告生成条件
- **MapUrlGenerator**: URL形式の正確性

### 統合テスト

- 入力から地図URL生成までの一連のフロー
- 各種入力パターン（十進度、度分秒、カンマ区切り、空白区切り等）
- 警告表示の条件網羅

### E2Eテスト

- 検索バー入力 → 変換 → マップズーム → パネル表示 → 地図ボタンクリック
- コピー機能の動作確認
- レスポンシブUIの動作確認（モバイル/デスクトップ）
- フローティング検索バーのドロップダウン切り替え
- マップ表示 → 長押し → ピン設置 → パネル表示
- マップからの共有機能（LINE共有、Web Share API）
- スライドパネルの開閉動作
- 変換結果によるマップズーム・ピン配置
- レイヤー切替UI → AED/消火栓レイヤーのON/OFF
- POIピンタップ → POI詳細パネル表示 → 外部地図起動
- 検索実行時のPOI選択クリア（排他制御）
- POIタップ時のアクティブピンクリア（排他制御）
