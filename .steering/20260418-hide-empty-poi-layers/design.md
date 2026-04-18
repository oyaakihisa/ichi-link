# 設計書

## アーキテクチャ概要

LayerToggleControlに「利用可能なPOIタイプ」を渡し、存在するタイプのみトグルを表示する。

## コンポーネント設計

### 1. lib/types/poi.ts（新規追加）

**追加する型**:
```typescript
/**
 * 利用可能なPOIタイプのセット
 * POIデータが存在するタイプのみtrueになる
 */
export interface AvailablePOITypes {
  aed: boolean;
  fireHydrant: boolean;
  fireCistern: boolean;
}
```

### 2. components/map/LayerToggle.tsx（修正）

**修正内容**:
- コンストラクタに`availableTypes`パラメータを追加
- `onAdd`メソッドで、存在するタイプのみトグル行を作成
- `updateAvailableTypes`メソッドを追加し、動的に更新可能にする

**変更前のコンストラクタ**:
```typescript
constructor(
  initialVisibility: LayerVisibility,
  onChange: (visibility: LayerVisibility) => void
)
```

**変更後のコンストラクタ**:
```typescript
constructor(
  initialVisibility: LayerVisibility,
  onChange: (visibility: LayerVisibility) => void,
  availableTypes?: AvailablePOITypes
)
```

### 3. components/map/MapView.tsx（修正）

**修正内容**:
- propsに`availablePOITypes`を追加
- LayerToggleControlの初期化時に`availablePOITypes`を渡す
- POIデータの変更時にLayerToggleを更新

**追加するprops**:
```typescript
availablePOITypes?: AvailablePOITypes;
```

### 4. app/page.tsx（修正）

**修正内容**:
- POIデータから利用可能なタイプを計算
- MapViewに`availablePOITypes`を渡す

**計算ロジック**:
```typescript
const availablePOITypes = useMemo(() => ({
  aed: pois.some(p => p.type === 'aed'),
  fireHydrant: pois.some(p => p.type === 'fireHydrant'),
  fireCistern: pois.some(p => p.type === 'fireCistern'),
}), [pois]);
```

## データフロー

```
app/page.tsx
  ↓ pois配列からavailablePOITypesを計算
  ↓ availablePOITypesをMapViewに渡す
MapView
  ↓ availablePOITypesをLayerToggleControlに渡す
LayerToggle
  → 存在するタイプのみトグルを表示
```

## 実装の順序

1. lib/types/poi.ts - AvailablePOITypes型を追加
2. components/map/LayerToggle.tsx - availableTypesに基づいてトグルを表示
3. components/map/MapView.tsx - availablePOITypesをpropsで受け取り、LayerToggleに渡す
4. app/page.tsx - POIデータからavailablePOITypesを計算してMapViewに渡す
