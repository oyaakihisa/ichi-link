# Requirements: POI API拡張

## 概要

既存のSQLiteベースのPOI APIをSupabase + PostGISに移行する。
PostGISの空間インデックス（GIST）を活用してbbox検索を高速化する。

## 機能要件

### bbox検索（P1: 最優先）

- `GET /api/pois?bbox={west},{south},{east},{north}&types=aed,fireHydrant&zoom={zoom}`
- PostGISの`ST_MakeEnvelope`と`&&`演算子でbbox検索
- `ST_Y(location)` / `ST_X(location)`でlat/lng抽出
- 既存のレスポンス形式を維持

### 詳細取得（P1: 最優先）

- `GET /api/pois/{id}`
- POI詳細情報を取得
- 一覧にない追加情報（detailText, availabilityText等）を返却

### データ変換

- DB行（snake_case）→ APIレスポンス（camelCase）
- geometry型 → lat/lng数値ペア
- Repository層で変換を実施

## 技術要件

### Supabase接続

- anon権限で読み取り（RLSは現時点では不要、将来的に追加可能）
- 既存の`getAnonClient()`を使用

### 検索性能

- GISTインデックスによるbbox検索高速化
- typeフィルタ用インデックス活用

## 制約

- 既存のAPI Route（app/api/pois/）のインターフェースは変更しない
- フロントエンド（poiService）の変更は不要
- 旧SQLite Repositoryは残しておく（フォールバック用）
