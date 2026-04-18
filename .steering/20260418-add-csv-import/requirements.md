# 要求内容

## 概要

本番の消火栓・防火水槽データ（CSV形式）を Supabase にインポートするスクリプトを実装する。

## 背景

- Supabaseのマイグレーション（テーブル作成）は完了
- 表示機能（マップ、POI検索）は実装済み
- データを投入する仕組みがないため、アプリが空の状態
- まず1市町村（石川県輪島市）のデータでMVPを検証する

## 実装対象の機能

### 1. CSVインポートスクリプト

- `data/source/{prefecture}/{municipality}/pois.csv` を読み込む
- カラムマッピングに従ってデータを変換
- Supabase の `pois` テーブルに一括INSERT
- service_role キーを使用（RLSバイパス）

### 2. 市町村マスタ自動登録

- POIインポート時に市町村レコードがなければ作成
- CSVの緯度経度からbboxを自動計算
- `is_public = true` で即座に公開

## 受け入れ条件

### CSVインポート
- [ ] `npx tsx scripts/import-pois.ts --prefecture=ishikawa --municipality=wajima` で実行可能
- [ ] 輪島市の消火栓1,396件がインポートされる
- [ ] 重複実行時はエラーなく処理される（upsert）

### データ変換
- [ ] 種別「消火栓」→ type: 'fireHydrant' に変換
- [ ] 種別「防火水槽」→ type: 'fireCistern' に変換
- [ ] 名称が「消火栓（河井町小峰山）」形式で生成される

### アプリ表示
- [ ] `/ishikawa/wajima` で市町村ページが表示される
- [ ] マップ上に消火栓ピンが表示される

## 成功指標

- 輪島市の消火栓1,396件が正常にインポートされる
- アプリのマップ上でPOIが表示される

## スコープ外

以下はこのフェーズでは実装しません:

- 複数市町村の一括インポート
- データ更新（差分インポート）機能
- Web管理画面からのインポート
- 自動定期実行

## 参照ドキュメント

- `supabase/migrations/001_initial_schema.sql` - テーブル定義
- `data/source/ishikawa/wajima/pois.csv` - インポート対象データ
