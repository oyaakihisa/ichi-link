# 設計

## 修正アプローチ

MunicipalityMapView.tsxを修正し、app/page.tsxと同様の構成に変更する。

## 変更点

1. **インポート追加**
   - `SearchBar`コンポーネント
   - `useConversion`フック

2. **状態追加**
   - `useConversion`フックの戻り値（result, error, isLoading, convert, clear）
   - `isConversionPanelClosed`状態

3. **ハンドラ追加**
   - `handleConvert` - 検索バーからの変換処理（排他制御含む）
   - `handleCloseConversionPanel` - 変換結果パネルを閉じる
   - 既存ハンドラの修正（排他制御ロジック追加）

4. **UI変更**
   - ヘッダー削除
   - フローティングSearchBar追加
   - 変換結果用SlidePanel追加
   - pinCoordinateに変換結果座標を含める
   - flyToCoordinateに変換結果座標を含める
