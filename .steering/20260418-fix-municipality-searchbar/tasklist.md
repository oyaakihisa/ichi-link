# タスクリスト

## フェーズ1: MunicipalityMapView.tsxの修正

- [x] インポート追加（SearchBar, useConversion）
- [x] useConversionフック呼び出し追加
- [x] isConversionPanelClosed状態追加
- [x] isConversionPanelOpen導出値追加
- [x] handleConvertハンドラ追加（排他制御含む）
- [x] handleCloseConversionPanelハンドラ追加
- [x] handleLongPressに変換結果クリアロジック追加
- [x] handlePoiSelectに変換結果クリアロジック追加
- [x] pinCoordinateに変換結果座標を含める
- [x] flyToCoordinateに変換結果座標を含める
- [x] ヘッダー削除
- [x] フローティングSearchBar追加
- [x] エラー表示追加
- [x] 変換結果用SlidePanel追加
- [x] 未使用のlayerStatusesプロップを削除

## フェーズ2: 品質チェック

- [x] `npm run typecheck` - 型エラーなし確認
- [x] `npm run lint` - リントエラーなし確認（0 errors, 5 warnings - 既存）
- [x] `npm test` - テスト通過確認（97 tests passed）

---

## 実装後の振り返り

### 修正完了日
2026-04-18

### 問題の原因分析

- 市町村マップ（MunicipalityMapView.tsx）が独自のUI構成で作成されており、全国マップ（app/page.tsx）と異なっていた
- SearchBarコンポーネントが未統合だった
- ヘッダーにより地図上部のスペースが狭くなっていた

### 修正内容のサマリー

1. SearchBarとuseConversionフックを統合
2. ヘッダーを削除し、フローティングSearchBarを配置
3. 変換結果・長押しピン・POI選択の3つの排他制御を実装
4. 変換結果用SlidePanelを追加
5. 未使用のlayerStatusesプロップを削除（呼び出し元含め整理）

### 再発防止策

- 新しいマップビューを作成する際は、既存のapp/page.tsxをテンプレートとして使用する
- 共通のUI要素（SearchBar、SlidePanel等）は必ず統合する

### 実装検証結果

- implementation-validator: 総合スコア4.6/5
- 問題検出: なし
- スペック準拠: 完全

### 次回への改善提案

- MunicipalityMapView.tsxでuseMapInteractionフックを使用し、全国マップと動作を完全に統一する（逆ジオコーディング機能が使えるようになる）
- flyToCoordinateの計算ロジックをカスタムフック化して重複を削減
