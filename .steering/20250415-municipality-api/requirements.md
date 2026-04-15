# Requirements: 市町村マスタAPI

## 目的

市町村ランディングページ機能に必要なサーバーサイドRepository層とAPI Routeを実装する。

## 背景

- Supabase + PostGIS基盤が構築済み
- 型定義（Municipality, MunicipalityLayerStatus）が作成済み
- 次のステップ（市町村ランディングページ）でRepositoryを利用

## 要求事項

### 必須要件

1. **MunicipalityRepository（サーバーサイド）**
   - `getMunicipality(prefectureSlug, municipalitySlug)`: 市町村取得
   - `getMunicipalitiesByPrefecture(prefectureSlug)`: 都道府県内市町村一覧
   - `getPublicMunicipalities()`: 公開市町村一覧（静的生成用）
   - `getIndexedMunicipalities()`: インデックス対象市町村（sitemap用）

2. **MunicipalityLayerStatusRepository（サーバーサイド）**
   - `getLayerStatus(jisCode, layerType)`: レイヤー状態取得
   - `getAllLayerStatuses(jisCode)`: 全レイヤー状態取得
   - `getLatestImportedAt(jisCode)`: 最新インポート日時取得

3. **API Route（クライアント用）**
   - `GET /api/municipalities/{prefectureSlug}/{municipalitySlug}`: 市町村詳細
   - `GET /api/municipalities?prefecture={prefectureSlug}`: 市町村一覧

4. **MunicipalityService（クライアントサイド）**
   - API経由での市町村データ取得

### 設計方針

- **読み取り権限**: anon ロールで RLS を適用
- **更新権限**: service_role のみ（Repository に更新メソッドは含めない）
- **DB行変換**: Repository 層で `toMunicipality()` / `toMunicipalityLayerStatus()` を使用
- **location 型**: POIRepository 実装時に `lat/lng` 形式で返却する方針を明確化

### 対象外

- 市町村ランディングページUI（後続タスク）
- POI API の Supabase 移行（後続タスク）
- データインポートバッチ（service_role更新用）

## 参考

- docs/functional-design.md: MunicipalityRepository インターフェース定義
- docs/development-guidelines.md: Repository 実装パターン
