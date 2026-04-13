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

## フェーズ1: プロジェクトセットアップ

- [x] Next.jsプロジェクトの初期化
  - [x] 既存ファイルのバックアップ（docs/, .steering/, .claude/, CLAUDE.md）
  - [x] `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"` で初期化
  - [x] バックアップしたファイルを復元
- [x] 追加パッケージのインストール
  - [x] `npm install proj4`
  - [x] `npm install -D @types/proj4`
- [x] Jest設定
  - [x] jest.config.js 作成
  - [x] jest.setup.js 作成
  - [x] package.jsonのテストスクリプト更新

## フェーズ2: サービス層（ビジネスロジック）

### 2.1 型定義

- [x] lib/types/coordinate.ts を作成
  - [x] Coordinate 型
  - [x] CoordinateFormat 型
  - [x] Datum 型
- [x] lib/types/input.ts を作成
  - [x] LocationInput 型
  - [x] InputType 型
  - [x] ParsedCoordinate 型
  - [x] ParsedAddress 型
- [x] lib/types/result.ts を作成
  - [x] ConversionResult 型
  - [x] MapUrls 型
  - [x] Warning 型
  - [x] WarningType 型
- [x] lib/types/index.ts を作成（再エクスポート）

### 2.2 CoordinateConverter

- [x] lib/services/CoordinateConverter.ts を作成
  - [x] dmsToDecimal() メソッド
  - [x] decimalToDms() メソッド
  - [x] normalize() メソッド
- [x] __tests__/unit/CoordinateConverter.test.ts を作成
  - [x] 度分秒→十進度の変換テスト
  - [x] 十進度→度分秒の変換テスト
  - [x] 正規化テスト

### 2.3 InputParser

- [x] lib/services/InputParser.ts を作成
  - [x] parse() メソッド
  - [x] normalize() プライベートメソッド
  - [x] isDecimalCoordinate() プライベートメソッド
  - [x] isDmsCoordinate() プライベートメソッド
  - [x] parseDecimalCoordinate() プライベートメソッド
  - [x] parseDmsCoordinate() プライベートメソッド
- [x] __tests__/unit/InputParser.test.ts を作成
  - [x] 十進度形式の判定テスト（カンマ区切り）
  - [x] 十進度形式の判定テスト（空白区切り）
  - [x] 度分秒形式の判定テスト
  - [x] 不明形式の判定テスト

### 2.4 DatumTransformer

- [x] lib/services/DatumTransformer.ts を作成
  - [x] proj4定義の登録
  - [x] wgs84ToJgd2011() メソッド
  - [x] jgd2011ToWgs84() メソッド
  - [x] tokyoToWgs84() メソッド
- [x] __tests__/unit/DatumTransformer.test.ts を作成
  - [x] WGS84→JGD2011変換テスト
  - [x] JGD2011→WGS84変換テスト
  - [x] 旧日本測地系→WGS84変換テスト

### 2.5 ValidationService

- [x] lib/services/ValidationService.ts を作成
  - [x] isWithinJapan() メソッド
  - [x] validateCoordinateOrder() メソッド
  - [x] generateWarnings() メソッド
  - [x] suggestSwappedCoordinate() メソッド
- [x] __tests__/unit/ValidationService.test.ts を作成
  - [x] 日本国内座標の検証テスト
  - [x] 座標順序の検証テスト
  - [x] 警告生成テスト

### 2.6 MapUrlGenerator

- [x] lib/services/MapUrlGenerator.ts を作成
  - [x] generateAll() メソッド
  - [x] generateGoogleMaps() メソッド
  - [x] generateYahooMap() メソッド
  - [x] generateAppleMaps() メソッド
  - [x] generateGsiMap() メソッド
- [x] __tests__/unit/MapUrlGenerator.test.ts を作成
  - [x] Google Maps URL生成テスト
  - [x] Yahoo!地図 URL生成テスト
  - [x] Apple Maps URL生成テスト
  - [x] 地理院地図 URL生成テスト

### 2.7 ConversionService

- [x] lib/services/ConversionService.ts を作成
  - [x] convert() メソッド（全体のオーケストレーション）
- [x] __tests__/unit/ConversionService.test.ts を作成
  - [x] 十進度入力の変換テスト
  - [x] 度分秒入力の変換テスト
  - [x] 警告付き変換テスト

## フェーズ3: UIレイヤー

### 3.1 共通コンポーネント

- [x] components/common/CopyButton.tsx を作成
  - [x] クリップボードへのコピー機能
  - [x] コピー成功フィードバック表示

### 3.2 入力コンポーネント

- [x] components/input/LocationInput.tsx を作成
  - [x] テキスト入力欄
  - [x] 入力例の表示
  - [x] 変換ボタン
  - [x] クリアボタン

### 3.3 結果表示コンポーネント

- [x] components/result/WarningDisplay.tsx を作成
  - [x] 警告一覧の表示
  - [x] 警告レベルに応じた色分け
- [x] components/result/MapButtons.tsx を作成
  - [x] 4つの地図ボタン
  - [x] 各ボタンのクリックで新しいタブを開く
- [x] components/result/ConversionResult.tsx を作成
  - [x] WGS84座標の表示
  - [x] JGD2011座標の表示
  - [x] 各座標のコピーボタン
  - [x] 全部コピーボタン

### 3.4 カスタムフック

- [x] components/hooks/useConversion.ts を作成
  - [x] ConversionServiceの呼び出し
  - [x] 状態管理（入力、結果、エラー）
  - [x] 変換実行関数

### 3.5 ページ統合

- [x] app/page.tsx を更新
  - [x] 全コンポーネントの配置
  - [x] useConversionフックの使用
  - [x] レスポンシブレイアウト
- [x] app/globals.css を更新
  - [x] 必要なカスタムスタイル
- [x] app/layout.tsx を更新
  - [x] メタデータ設定
  - [x] フォント設定

## フェーズ4: ユニットテスト実行確認

- [x] ユニットテストが全て通ることを確認
  - [x] `npm test`

## フェーズ5: 品質チェックと修正

- [x] すべてのテストが通ることを確認
  - [x] `npm test`
- [x] リントエラーがないことを確認
  - [x] `npm run lint`
- [x] 型エラーがないことを確認
  - [x] `npx tsc --noEmit`
- [x] ビルドが成功することを確認
  - [x] `npm run build`
- [x] 開発サーバーで動作確認
  - [x] `npm run dev`
  - [x] 十進度入力の変換確認
  - [x] 度分秒入力の変換確認
  - [x] 地図ボタンの動作確認
  - [x] コピー機能の動作確認

## フェーズ6: ドキュメント更新

- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-04-13

### 計画と実績の差分

**計画と異なった点**:
- フェーズ順序を変更: 元々「フェーズ1: サービス層 → フェーズ2: プロジェクトセットアップ」だったが、「フェーズ1: プロジェクトセットアップ → フェーズ2: サービス層」に変更。理由: 既存のViteテンプレートプロジェクトをNext.jsに変換する必要があったため、先にプロジェクトセットアップを行う方が効率的だった
- jest.config.js → jest.config.mjs に変更: ESLintのno-require-importsルールに対応するため、ES Module形式に変更

**新たに必要になったタスク**:
- lib/services/index.ts（サービスの再エクスポート）: コンポーネントからのインポートを簡潔にするため追加
- tsconfig.jsonにtypes設定追加: Jest型定義の警告を解消するため

**技術的理由でスキップしたタスク**: なし

### 学んだこと

**技術的な学び**:
- Next.js 16 + Tailwind CSS 4の組み合わせでのセットアップ手順
- proj4jsの測地系定義（EPSG:6668 = JGD2011、EPSG:4301 = Tokyo Datum）
- 緯度経度の妥当性検証ロジック（日本の座標範囲: 緯度20-46°、経度122-154°）

**プロセス上の改善点**:
- tasklist.mdをリアルタイムで更新することで、進捗が明確になった
- サービス層を先に実装・テストすることで、UI実装時の不具合を減らせた
- 型定義を最初に作成することで、後続の実装がスムーズになった

### 次回への改善提案
- プロジェクトセットアップは常にサービス層より先に行う（依存関係の都合上）
- テストケースで「入力がnullを返すケース」と「警告が生成されるケース」を明確に分離する
- コンポーネントのユニットテストも追加することを検討（現在はサービス層のみ）
