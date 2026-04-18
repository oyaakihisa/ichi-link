# タスクリスト

## フェーズ1: 型定義の追加

- [x] lib/types/poi.ts - AvailablePOITypes型を追加
- [x] lib/types/index.ts - AvailablePOITypesをエクスポート

## フェーズ2: LayerToggleの修正

- [x] components/map/LayerToggle.tsx - コンストラクタにavailableTypesを追加
- [x] components/map/LayerToggle.tsx - onAddで存在するタイプのみ表示
- [x] components/map/LayerToggle.tsx - updateAvailableTypesメソッドを追加

## フェーズ3: MapViewの修正

- [x] components/map/MapView.tsx - propsにavailablePOITypesを追加
- [x] components/map/MapView.tsx - LayerToggleControlの初期化時にavailablePOITypesを渡す
- [x] components/map/MapView.tsx - availablePOITypesの変更時にLayerToggleを更新

## フェーズ4: app/page.tsxの修正

- [x] app/page.tsx - POIデータからavailablePOITypesを計算
- [x] app/page.tsx - MapViewにavailablePOITypesを渡す

## フェーズ5: 品質チェック

- [x] `npm run typecheck` - 型エラーなし確認
- [x] `npm run lint` - リントエラーなし確認（0 errors, 5 warnings - 既存）
- [x] `npm test` - テスト通過確認（97 tests passed）

---

## 実装後の振り返り

### 実装完了日
2026-04-18

### 計画と実績の差分

**計画通りに実装完了。差分なし。**

### 学んだこと

**技術的な学び**:
- LayerVisibilityと同じ構造のAvailablePOITypesを作ることで、型の一貫性を保てた
- Mapbox IControlの更新はDOMを直接操作する必要があり、React的なパターンとは異なる
- useRefとuseEffectの組み合わせで、最新のprops値をコールバックに渡せる

**設計上のポイント**:
- デフォルト値を提供することで後方互換性を維持
- 変更検出による早期リターンでパフォーマンスを最適化

### 次回への改善提案

- 市町村ページ（MunicipalityMapView.tsx）にも同様の機能を追加する場合は別タスクで対応
- LayerToggleControl.updateAvailableTypesの単体テスト追加（オプショナル）

### 実装検証結果

- implementation-validator: 総合スコア5.0/5
- 問題検出: なし
- スペック準拠: 完全
