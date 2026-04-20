# タスクリスト: 市町村ページへの長押し機能追加

## フェーズ1: 実装

- [x] `useMapInteraction`フックをインポート
- [x] 独自のpin state管理を削除
- [x] `handleLongPress`関数を修正（排他制御 + フック呼び出し）
- [x] `flyToCoordinate`のuseMemoを更新（フックのpinとisPanelOpenを使用）
- [x] `pinCoordinate`の導出を更新
- [x] SlidePanelに`isLoadingAddress`プロップを追加
- [x] `handleClosePinPanel`関数を削除し、フックの`closePanel`を使用

## フェーズ2: 検証

- [x] 型チェック（`npm run typecheck`）
- [x] Lint（`npm run lint`）
- [x] ビルド（`npm run build`）

## 実装後の振り返り

**実装完了日**: 2026-04-20

### 計画と実績の差分

- **計画通り**: すべてのタスクが計画通りに完了
- **追加作業**: `handlePoiSelect`と`handleConvert`関数内の`setPin(null)`と`setIsPinPanelOpen(false)`を`clearPin()`と`closePinPanel()`に置き換える修正が必要だった（計画では見落としていた）

### 学んだこと

- 既存の`useMapInteraction`フックを活用することで、逆ジオコーディングとTokyo Datum変換の機能を重複実装することなく追加できた
- 排他制御ロジックを維持しつつフックを統合する際は、関連する全ての関数（POI選択、検索変換など）で旧state操作を新しいフック関数に置き換える必要がある

### 検証結果

- 型チェック: ✅ パス
- Lint: ✅ パス（警告5件は既存の問題）
- ビルド: ✅ パス
- 品質検証: 4.6/5（implementation-validatorによる評価）

### 次回への改善提案

1. 排他制御のコメントを「パネルを閉じてピンをクリア」のように正確にする
2. 将来的には排他制御ロジックの共通化を検討
