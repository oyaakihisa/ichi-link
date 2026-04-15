# 要求内容

## 概要

POIデータ取得設計に基づいた自前API・データベースの実装。公開データを定期取得しローカルDBに保存、bboxベースのPOI APIを提供する。

## 背景

現在のPOI実装はフロントエンドのモックデータ（ハードコード）を使用しており、実際の公開AED・消火栓データには接続していない。PRDで定義されたPOIデータ取得設計を実装し、以下を実現する:

1. 公開データソースからPOIデータを取得・保存
2. ビューポートベースの効率的なPOI配信
3. 一覧取得では最小限のフィールド、詳細取得で全情報を返す設計

## 実装対象の機能

### 1. POIデータベース

- SQLiteを使用したPOIデータの永続化
- 空間クエリに対応するインデックス設計
- AED/消火栓の共通スキーマ

### 2. POI API（一覧取得）

- `GET /api/pois?bbox={west},{south},{east},{north}&types=aed,fireHydrant&zoom={zoom}`
- bboxベースのフィルタリング
- 最小限のフィールドを返却（id, type, name, lat, lng, address）

### 3. POI API（詳細取得）

- `GET /api/pois/{id}`
- 単一POIの全詳細情報を返却

### 4. フロントエンド統合

- POIServiceをモックからAPI呼び出しに変更
- マップビューポート変更時のPOI再取得
- デバウンス処理（300ms）

## 受け入れ条件

### POIデータベース
- [ ] SQLiteデータベースが作成される
- [ ] POIスキーマ（id, type, name, lat, lng, address, detailText, availabilityText, source, updatedAt）
- [ ] 緯度経度でのbbox検索が高速に動作する

### POI一覧API
- [ ] `GET /api/pois`がbboxパラメータで動作する
- [ ] typesパラメータでPOI種別をフィルタできる
- [ ] レスポンスにid, type, name, latitude, longitude, addressが含まれる
- [ ] 詳細フィールド（detailText, availabilityText等）は含まれない

### POI詳細API
- [ ] `GET /api/pois/{id}`で単一POIの全情報が取得できる
- [ ] 存在しないIDには404を返す
- [ ] detailText, availabilityText, source, updatedAt等の詳細が含まれる

### フロントエンド統合
- [ ] POIServiceがモックではなくAPIを呼び出す
- [ ] マップ移動/ズーム終了時にPOIを再取得する
- [ ] API呼び出しがデバウンスされる（300ms）
- [ ] 既存のUI（レイヤー切替、詳細パネル）が正常に動作する

## 成功指標

- POI一覧取得が100ms以内に完了（ローカル環境）
- 地図操作が60fps以上でスムーズ
- POI詳細表示が500ms以内

## スコープ外

以下はこのフェーズでは実装しません:

- 公開データソースからの自動同期（手動でシードデータを投入）
- PMTiles/Vector Tiles対応
- クラスタリングの最適化（既存のMapboxクラスタ機能を継続使用）
- ズームレベルに応じた動的な件数制限
- ユーザー入力・変換履歴のサーバーサイド永続化（POI公開データDBはMVP対象内）

## 参照ドキュメント

- `docs/product-requirements.md` - プロダクト要求定義書（POIデータ取得設計セクション）
- `docs/functional-design.md` - 機能設計書（POIService、シーケンス図）
- `docs/architecture.md` - アーキテクチャ設計書（自前API、データフロー）
- `docs/repository-structure.md` - リポジトリ構造定義書（API Routes、lib/server）
