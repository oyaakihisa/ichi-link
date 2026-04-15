# Requirements: Supabase + PostGIS基盤構築

## 目的

現在のローカルSQLite (`better-sqlite3`) から Supabase Postgres + PostGIS に移行し、市町村ランディング機能の基盤を構築する。

## 背景

- 市町村ランディングページの実装に必要なバックエンド基盤
- 空間検索（bbox検索）の高速化にPostGISを活用
- RLSによる公開制御（isPublic / isIndexed）
- マネージドサービスによる運用負荷削減

## 要求事項

### 必須要件

1. **Supabase接続基盤**
   - Supabase JS クライアントの設定
   - 環境変数による接続情報管理
   - サーバーサイド / クライアントサイドの接続分離

2. **データベーススキーマ**
   - `municipalities` テーブル（市町村マスタ）
   - `municipality_layer_statuses` テーブル（レイヤー状態）
   - `pois` テーブル（PostGIS geometry型）
   - 空間インデックス（GIST）

3. **RLS設定**
   - `municipalities`: `is_public = true` のみ公開
   - `pois`: 公開市町村に属するPOIのみ公開
   - `municipality_layer_statuses`: 公開市町村のみ

4. **型定義**
   - Municipality インターフェース
   - MunicipalityLayerStatus インターフェース
   - status.isPublic / status.isIndexed の構造

5. **既存コードとの整合性**
   - POIListItem / POIDetail 型の維持
   - MapBounds 型の継続利用

### 設計方針

- `geometry(Point, 4326)` + GIST インデックス使用
- `status.isPublic` / `status.isIndexed` は Municipality 内の status オブジェクトに配置
- `lastImportedAt` / `sourceUpdatedAt` の役割分離

## 対象外

- POI API の bbox 検索RPC（後続タスク）
- 市町村ランディングページUI（後続タスク）
- データインポートバッチ（後続タスク）
