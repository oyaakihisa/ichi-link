# 設計書

## アーキテクチャ概要

Mapbox GL JSのレイヤープロパティを動的に変更することで、選択されたPOIをハイライト表示する。

既存のPOIレイヤー（`aed-layer`, `fire-hydrant-layer`）のpaint/layoutプロパティを`selectedPoiId`に基づいて条件分岐させる。

```
selectedPoiId → useEffect → Mapbox paint property更新
                                ↓
                        選択POIのサイズ拡大 + パルスアニメーション
```

## コンポーネント設計

### 1. MapView（変更）

**責務**:
- `selectedPoiId`に基づいてPOIのハイライト状態を管理
- Mapboxレイヤーのpaintプロパティを動的に更新

**実装の要点**:
- `selectedPoiId`の変更を検知してレイヤーのサイズを更新
- Mapbox式（Expression）を使用して条件付きスタイリング
- useRefパターンを活用（前回のバグ修正で導入済み）

## データフロー

### POI選択時のハイライト

```
1. ユーザーがPOIをタップ
2. handlePOIClick → onPoiSelect(poi)
3. page.tsx: setSelectedPoi(poi) → selectedPoiId = poi.id
4. MapView: useEffect検知 → circle-radius/circle-stroke-width更新
5. 選択されたPOIが視覚的に大きく表示される
```

## Mapbox Expressionによる条件付きスタイリング

### サイズ変更

```javascript
// circle-radiusを条件付きで設定
map.setPaintProperty(AED_LAYER_ID, 'circle-radius', [
  'case',
  ['==', ['get', 'id'], selectedPoiId],
  14, // 選択時: 大きく
  10  // 通常時
]);
```

### パルスアニメーション

Mapbox GL JSはCSSアニメーションをネイティブにサポートしないため、以下のアプローチを採用:

**オプションA: circle-stroke-widthを使った視覚的強調**（採用）
- 選択時にストローク幅を増やす（2px → 4px）
- シンプルで確実に動作

**オプションB: カスタムレイヤーによるパルス効果**（不採用）
- 複雑な実装が必要
- 小規模な改善には過剰

→ **オプションA採用**: ストローク幅拡大で視覚的に強調

## テスト戦略

### 手動テスト
- POIタップでハイライト表示されること
- 別のPOIタップでハイライトが移動すること
- パネル閉じてもハイライト維持（selectedPoiはnullになる場合は解除）
- スタイル切替後もハイライト維持

## 依存ライブラリ

追加なし（既存のMapbox GL JSを使用）

## ディレクトリ構造

```
components/map/
└── MapView.tsx  # 変更: selectedPoiId活用
```

## 実装の順序

1. selectedPoiIdRef追加（useRefパターン）
2. POIハイライト更新用のuseEffect追加
3. setupPOILayers関数の拡張（初期状態でも条件付きスタイル適用）
4. style.loadイベントでのハイライト再適用
5. 検証

## パフォーマンス考慮事項

- setPaintPropertyは軽量な操作
- selectedPoiIdの変更時のみ更新（useEffectの依存配列で制御）
- useRefパターンにより不要な再レンダリングを防止
