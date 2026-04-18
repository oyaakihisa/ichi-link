# 設計書

## アーキテクチャ概要

既存のPOIレイヤーシステムを拡張し、防火水槽（fireCistern）を追加する。
アーキテクチャ自体の変更はなく、既存パターンに従って機能を追加する。

## コンポーネント設計

### 1. lib/types/poi.ts（修正対象）

**修正内容**:
- `LayerVisibility`インターフェースに`fireCistern: boolean`を追加
- `DEFAULT_LAYER_VISIBILITY`に`fireCistern: false`を追加

**変更前**:
```typescript
export interface LayerVisibility {
  aed: boolean;
  fireHydrant: boolean;
}

export const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
  aed: true,
  fireHydrant: false,
};
```

**変更後**:
```typescript
export interface LayerVisibility {
  aed: boolean;
  fireHydrant: boolean;
  fireCistern: boolean;
}

export const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
  aed: true,
  fireHydrant: false,
  fireCistern: false,
};
```

### 2. components/map/MapView.tsx（修正対象）

**修正内容**:
- `FIRE_CISTERN_LAYER_ID`定数を追加
- `setupPOILayers`関数に防火水槽レイヤーを追加
- レイヤー削除処理に防火水槽レイヤーを追加
- レイヤー表示/非表示の更新処理に防火水槽を追加
- POIハイライト表示に防火水槽レイヤーを追加
- POIクリックハンドラに防火水槽レイヤーを追加
- ホバー時のカーソル変更に防火水槽レイヤーを追加

**追加する定数**:
```typescript
const FIRE_CISTERN_LAYER_ID = 'fire-cistern-layer';
```

**追加するレイヤー定義**（setupPOILayers内）:
```typescript
// 防火水槽レイヤー（青色）- 非クラスタPOIのみ
map.addLayer({
  id: FIRE_CISTERN_LAYER_ID,
  type: 'circle',
  source: POI_SOURCE_ID,
  filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'type'], 'fireCistern']],
  paint: {
    'circle-color': '#2563eb',  // 青色（SlidePanel.tsxと同じ）
    'circle-radius': radiusValue,
    'circle-stroke-width': strokeWidthValue,
    'circle-stroke-color': '#ffffff',
  },
  layout: {
    visibility: layerVisibility.fireCistern ? 'visible' : 'none',
  },
});
```

### 3. components/map/LayerToggle.tsx（修正対象）

**修正内容**:
- 防火水槽トグル行を追加

**追加するコード**（onAdd関数内、消火栓トグルの後）:
```typescript
// 防火水槽トグル
const cisternRow = this.createToggleRow(
  '防火水槽',
  '#2563eb',  // 青色
  this.visibility.fireCistern,
  (checked) => {
    this.visibility.fireCistern = checked;
    this.onChange({ ...this.visibility });
  }
);
this.container.appendChild(cisternRow);
```

### 4. app/page.tsx（修正対象）

**修正内容**:
- `handleMoveEnd`内の`types`配列に`fireCistern`を追加

**変更前**:
```typescript
const types: Array<"aed" | "fireHydrant"> = [];
if (layerVisibility.aed) types.push("aed");
if (layerVisibility.fireHydrant) types.push("fireHydrant");
```

**変更後**:
```typescript
const types: Array<"aed" | "fireHydrant" | "fireCistern"> = [];
if (layerVisibility.aed) types.push("aed");
if (layerVisibility.fireHydrant) types.push("fireHydrant");
if (layerVisibility.fireCistern) types.push("fireCistern");
```

## データフロー

変更なし。既存のPOIデータフローに防火水槽が追加されるだけ。

## エラーハンドリング戦略

変更なし。

## テスト戦略

### 自動テスト
- `npm test` - 既存テストの通過確認
- `npm run lint` - リントエラーなし確認
- `npm run typecheck` - 型エラーなし確認

## 依存ライブラリ

変更なし。

## ディレクトリ構造

```
lib/types/poi.ts                  # 修正対象
components/map/MapView.tsx        # 修正対象
components/map/LayerToggle.tsx    # 修正対象
app/page.tsx                      # 修正対象
```

## 実装の順序

1. lib/types/poi.ts - 型定義の修正（他のファイルが依存）
2. components/map/LayerToggle.tsx - UIコントロールの追加
3. components/map/MapView.tsx - レイヤー定義の追加
4. app/page.tsx - POI取得ロジックの修正

## セキュリティ考慮事項

なし。既存パターンに従った追加のみ。

## パフォーマンス考慮事項

- 防火水槽はデフォルトOFFなので、初期ロード時の負荷増加はなし
- ONにした場合も既存のクラスタリングが適用される
