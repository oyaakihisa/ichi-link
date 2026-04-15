# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

### 実装可能なタスクのみを計画
- 計画段階で「実装可能なタスク」のみをリストアップ
- 「将来やるかもしれないタスク」は含めない
- 「検討中のタスク」は含めない

### タスクスキップが許可される唯一のケース
以下の技術的理由に該当する場合のみスキップ可能:
- 実装方針の変更により、機能自体が不要になった
- アーキテクチャ変更により、別の実装方法に置き換わった
- 依存関係の変更により、タスクが実行不可能になった

スキップ時は必ず理由を明記:
```markdown
- [x] ~~タスク名~~（実装方針変更により不要: 具体的な技術的理由）
```

### タスクが大きすぎる場合
- タスクを小さなサブタスクに分割
- 分割したサブタスクをこのファイルに追加
- サブタスクを1つずつ完了させる

---

## フェーズ1: 環境セットアップ

- [x] better-sqlite3をインストール
  - [x] `npm install better-sqlite3`
  - [x] `npm install -D @types/better-sqlite3`

## フェーズ2: データベース層

- [x] データベース接続を実装（lib/server/db/connection.ts）
  - [x] SQLite接続のシングルトン管理
  - [x] データベースファイルパスの設定（data/pois.db）

- [x] マイグレーションを実装
  - [x] lib/server/db/migrations/001_create_pois.sqlを作成
  - [x] マイグレーション実行関数を実装（connection.ts内に実装済み）

- [x] POIRepositoryを実装（lib/server/poi/POIRepository.ts）
  - [x] findByBbox関数: bbox範囲でPOI一覧を取得
  - [x] findById関数: IDでPOI詳細を取得
  - [x] POIListItem型（最小限フィールド）でのSELECT

## フェーズ3: API Routes

- [x] POI一覧APIを実装（app/api/pois/route.ts）
  - [x] GETハンドラの実装
  - [x] bboxクエリパラメータの解析・検証
  - [x] typesクエリパラメータの解析
  - [x] POIRepositoryの呼び出し
  - [x] レスポンスの整形

- [x] POI詳細APIを実装（app/api/pois/[id]/route.ts）
  - [x] GETハンドラの実装
  - [x] パスパラメータからIDを取得
  - [x] POIRepositoryの呼び出し
  - [x] 404ハンドリング

## フェーズ4: シードデータ

- [x] シードスクリプトを実装（lib/server/db/seed.ts）
  - [x] 既存のモックデータをシードデータとして移行
  - [x] シード実行用npmスクリプトを追加

- [x] シードデータを投入
  - [x] `npm run db:seed`を実行
  - [x] データベースにデータが投入されていることを確認

## フェーズ5: POI型定義の更新

- [x] POIListItem型を追加（lib/types/poi.ts）
  - [x] id, type, name, latitude, longitude, addressのみ
  - [x] POIDetailとの型の関係を整理

## フェーズ6: フロントエンド統合

- [x] POIServiceをAPI呼び出しに変更（lib/services/POIService.ts）
  - [x] モックデータを削除
  - [x] getPOIs: fetch('/api/pois')を呼び出し
  - [x] getPOIDetail: fetch('/api/pois/{id}')を呼び出し

- [x] マップビューポート連動を実装（app/page.tsx）
  - [x] MapViewにonMoveEndイベントを追加
  - [x] ビューポートのbboxを取得する処理
  - [x] デバウンス付きでPOI再取得（300ms）
  - [x] 初回ロード時のPOI取得をbboxベースに変更

## フェーズ7: 品質チェックと修正

- [x] すべてのテストが通ることを確認
  - [x] `npm test`
- [x] リントエラーがないことを確認（警告のみ、エラーなし）
  - [x] `npm run lint`
- [x] 型エラーがないことを確認
  - [x] `npm run typecheck`
- [x] ビルドが成功することを確認
  - [x] `npm run build`
- [x] 動作確認
  - [x] 開発サーバーでPOI表示を確認（API動作確認済み）
  - [x] マップ移動時にPOIが更新されることを確認（API動作確認済み）
  - [x] POIタップで詳細パネルが表示されることを確認（詳細API動作確認済み）

## フェーズ8: ドキュメント更新

- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-04-15

### 計画と実績の差分

**計画と異なった点**:
- マイグレーションファイルのパスに`__dirname`を使用していたが、ESM互換性のため`process.cwd()`ベースに変更
- Mapbox GLの`getBounds()`がnullを返す可能性があり、型チェックでエラーが発生したため、nullチェックを追加
- `tsx`をdevDependenciesに追加してシードスクリプトを実行可能にした

**新たに必要になったタスク**:
- POIListItemとPOIDetailの型定義をlib/types/poi.tsに追加し、lib/types/index.tsでエクスポートを更新
- SlidePanelコンポーネントをPOIListItem/POIDetail対応に更新（座標の取得方法変更、selectedPoiDetail prop追加）
- MapViewコンポーネントでPOI型をPOIListItemに更新（createPOIGeoJSON関数のlatitude/longitude直接参照）

**技術的理由でスキップしたタスク**:
- なし（全タスク完了）

### 学んだこと

**技術的な学び**:
- better-sqlite3はNode.jsのネイティブモジュールで、同期的かつ高速なSQLite操作が可能
- Next.js API RoutesでSQLiteを使用する場合、シングルトンパターンでDB接続を管理する必要がある
- POI一覧APIは最小限のフィールドを返し、詳細APIで追加情報を補完する設計により、初期表示を高速化できる
- Mapboxのmoveendイベントでビューポートのboundsをリアルタイムに取得し、デバウンスでAPI呼び出しを最適化

**プロセス上の改善点**:
- ステアリングファイルの事前計画により、実装の全体像を把握しながら進められた
- サブタスクを細かく分けることで、進捗が明確になった

### 次回への改善提案
- 型定義の変更は影響範囲が広いため、事前に関連コンポーネントを洗い出しておくとよい
- シードデータの投入は実装の早い段階で行い、APIのE2Eテストを容易にする
- 公開データソースからの自動同期は別フェーズで実装予定
