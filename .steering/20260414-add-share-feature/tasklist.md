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

## フェーズ1: ShareServiceの実装

- [x] ShareServiceを作成する (`lib/services/ShareService.ts`)
  - [x] `generateShareText()` - 共有テキスト生成関数を実装
  - [x] `generateLineShareUrl()` - LINE Share URL生成関数を実装
  - [x] `isWebShareSupported()` - Web Share API対応チェック関数を実装

- [x] ShareServiceのテストを作成する (`__tests__/lib/services/ShareService.test.ts`)
  - [x] `generateShareText()` のテスト
  - [x] `generateLineShareUrl()` のテスト
  - [x] `isWebShareSupported()` のテスト

## フェーズ2: ShareButtonsコンポーネントの実装

- [x] ShareButtonsコンポーネントを作成する (`components/result/ShareButtons.tsx`)
  - [x] LINEで共有ボタンを実装
  - [x] 汎用共有ボタンを実装（Web Share API対応ブラウザのみ表示）
  - [x] スタイリング（Tailwind CSS）

- [x] ConversionResultコンポーネントを修正してShareButtonsを統合する

## フェーズ3: 品質チェックと修正

- [x] すべてのテストが通ることを確認
  - [x] `npm test`
- [x] リントエラーがないことを確認
  - [x] `npm run lint`
- [x] 型エラーがないことを確認
  - [x] `npm run typecheck`
- [x] ビルドが成功することを確認
  - [x] `npm run build`

## フェーズ4: ドキュメント更新

- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-04-14

### 計画と実績の差分

**計画と異なった点**:
- `useState` + `useEffect` によるWeb Share API対応チェックがESLintルール（react-hooks/set-state-in-effect）に違反したため、`useSyncExternalStore` を使用する実装に変更した
- これにより、SSRセーフかつReactの推奨パターンに従った実装となった

**新たに必要になったタスク**:
- 特になし。計画通りに実装完了

**技術的理由でスキップしたタスク**:
- なし

### 学んだこと

**技術的な学び**:
- `useSyncExternalStore` はSSRセーフにブラウザAPIをチェックするための適切なフック
- LINE Share URL (`https://line.me/R/share?text=`) はシンプルで信頼性が高い
- Web Share APIは`navigator.share`の存在チェックで対応可否を判定できる

**プロセス上の改善点**:
- フェーズごとにタスクを完了させる方式は進捗が明確で良い
- 品質チェックフェーズでESLintエラーを早期発見できた

### 次回への改善提案
- `useSyncExternalStore` のようなSSRセーフなパターンを設計段階で考慮する
- ブラウザAPIを使用するコンポーネントは最初からhydrationの問題を意識する
