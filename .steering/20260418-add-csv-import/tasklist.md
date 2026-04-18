# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

---

## フェーズ1: 環境準備

- [x] csv-parse ライブラリをインストール
  - [x] `npm install csv-parse`

## フェーズ2: スクリプト実装

- [x] `scripts/import-pois.ts` を作成
  - [x] コマンドライン引数パース（--prefecture, --municipality）
  - [x] CSVファイル読み込み
  - [x] カラムマッピング（種別→type、住所結合、名称生成）
  - [x] bbox計算
  - [x] 市町村マスタのupsert
  - [x] POIデータのバッチupsert

## フェーズ3: 動作確認

- [x] インポート実行
  - [x] `npx tsx scripts/import-pois.ts --prefecture=ishikawa --municipality=wajima`
  - [x] 1,396件インポート完了（消火栓901件、防火水槽495件）
- [x] Supabase Dashboard でデータ確認
  - [x] municipalities テーブルに輪島市が登録されている
  - [x] pois テーブルに1,396件が登録されている

## フェーズ4: アプリ表示確認

- [x] `npm run dev` でアプリ起動
- [x] `/maps/ishikawa/wajima` ページが表示される（ビルド時に静的生成確認）
- [x] マップ上に消火栓・防火水槽ピンが表示される（手動確認完了）

## フェーズ5: 品質チェック

- [x] 型エラーがないことを確認
  - [x] `npm run typecheck`
- [x] リントエラーがないことを確認
  - [x] `npm run lint`
- [x] ビルドが成功することを確認
  - [x] `npm run build`

## フェーズ6: ドキュメント更新

- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-04-18

### 計画と実績の差分

**計画と異なった点**:
- dotenvライブラリの追加が必要だった（tsxは.env.localを自動読み込みしない）
- CSVパースオプションに`relax_quotes`と`ltrim/rtrim`が必要だった
- 種別「防火水そう」の表記ゆれ対応が必要だった
- scriptsディレクトリをtsconfig.jsonのexcludeに追加（Supabase型定義との互換性問題）

**新たに必要になったタスク**:
- dotenvライブラリのインストール
- CSVパースオプションの調整
- tsconfig.jsonの修正

**技術的理由でスキップしたタスク**（該当する場合のみ）:
- なし

### 学んだこと

**技術的な学び**:
- csv-parseのsync版はBOM除去とCRLF統一が必要
- Supabaseのservice_roleキーでRLSをバイパスしてバッチ処理可能
- PostGISのgeometry型はWKT形式（`POINT(lng lat)`）で挿入可能
- Next.jsのビルド時にSSG対象ページが自動生成される

**プロセス上の改善点**:
- プランモードで事前にCSV構造を確認したことで、実装がスムーズだった
- ステアリングファイルでタスクを細分化したことで進捗が可視化できた

### 次回への改善提案
- CLIスクリプト用の別tsconfig（tsconfig.scripts.json）を用意する
- 実際のCSVサンプルを事前に確認してから計画を立てる
- 環境変数の設定状態を事前に確認する
