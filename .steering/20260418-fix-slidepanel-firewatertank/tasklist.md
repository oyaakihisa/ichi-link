# タスクリスト

## フェーズ1: 型定義の修正

- [x] lib/types/poi.ts - LayerVisibilityにfireCisternを追加
- [x] lib/types/poi.ts - DEFAULT_LAYER_VISIBILITYにfireCisternを追加

## フェーズ2: UIコンポーネントの修正

- [x] components/map/LayerToggle.tsx - 防火水槽トグル行を追加

## フェーズ3: MapViewの修正

- [x] components/map/MapView.tsx - FIRE_CISTERN_LAYER_ID定数を追加
- [x] components/map/MapView.tsx - setupPOILayers内のレイヤー削除に防火水槽を追加
- [x] components/map/MapView.tsx - setupPOILayers内に防火水槽レイヤー定義を追加
- [x] components/map/MapView.tsx - レイヤー表示/非表示更新に防火水槽を追加
- [x] components/map/MapView.tsx - POIハイライト表示に防火水槽を追加
- [x] components/map/MapView.tsx - POIクリックハンドラに防火水槽を追加
- [x] components/map/MapView.tsx - ホバーカーソル変更に防火水槽を追加

## フェーズ4: POI取得ロジックの修正

- [x] app/page.tsx - handleMoveEnd内のtypes配列にfireCisternを追加

## フェーズ5: 品質チェック

- [x] `npm test` - テスト通過確認（97 tests passed）
- [x] `npm run lint` - リントエラーなし確認（0 errors, 5 warnings - 既存）
- [x] `npm run typecheck` - 型エラーなし確認

---

## 実装後の振り返り

### 修正完了日
2026-04-18

### 問題の原因分析

- `POIType`に`fireCistern`は定義されていたが、`LayerVisibility`には含まれていなかった
- MapViewのレイヤー定義がAEDと消火栓のみだった
- LayerToggleのトグル行もAEDと消火栓のみだった
- POI取得ロジック（app/page.tsx, MunicipalityMapView.tsx）が2種類のみ対応

### 修正内容のサマリー

1. **lib/types/poi.ts**
   - `LayerVisibility`に`fireCistern: boolean`を追加
   - `DEFAULT_LAYER_VISIBILITY`に`fireCistern: false`を追加

2. **components/map/LayerToggle.tsx**
   - 防火水槽トグル行（青色）を追加

3. **components/map/MapView.tsx**
   - `FIRE_CISTERN_LAYER_ID`定数を追加
   - レイヤー削除処理に防火水槽を追加
   - 防火水槽レイヤー定義を追加（青色 #2563eb）
   - 表示/非表示更新に防火水槽を追加
   - ハイライト表示に防火水槽を追加
   - クリックハンドラに防火水槽を追加
   - ホバーカーソル変更に防火水槽を追加

4. **app/page.tsx**
   - `handleMoveEnd`のtypes配列に`fireCistern`を追加

5. **components/maps/MunicipalityMapView.tsx**
   - `initialLayerVisibility`に`fireCistern`を追加
   - `fetchInitialPois`のtypes配列に`fireCistern`を追加
   - `handleMoveEnd`のtypes配列に`fireCistern`を追加

### 再発防止策

- 新しいPOI種別を追加する際は、以下の全ての箇所を更新するチェックリストを作成:
  1. `POIType`に追加
  2. `LayerVisibility`に追加
  3. `DEFAULT_LAYER_VISIBILITY`に追加
  4. MapViewのレイヤー定義
  5. LayerToggleのトグル行
  6. POI取得ロジック（app/page.tsx）
  7. 市町村ページのPOI取得ロジック（MunicipalityMapView.tsx）
  8. SlidePanelのバッジ定義

### 実装検証結果

- implementation-validator: 総合スコア5.0/5
- 問題検出: なし
- スペック準拠: 完全
