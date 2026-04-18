# 設計書

## アーキテクチャ概要

Mapbox GL JSの組み込みクラスタリング機能を使用し、GeoJSONソースレベルでクラスタリングを有効化する。レイヤー構成を以下のように変更する。

```
[POI Source (GeoJSON with cluster: true)]
    ├── cluster-circle-layer (クラスタ円)
    ├── cluster-count-layer (クラスタ件数テキスト)
    ├── aed-layer (非クラスタ: AED)
    └── fire-hydrant-layer (非クラスタ: 消火栓・防火水槽)
```

## コンポーネント設計

### 1. GeoJSONソース設定の変更

**責務**:
- POIデータをクラスタリング対応のGeoJSONソースとして登録
- クラスタリングパラメータの設定

**実装の要点**:
- `cluster: true` を追加
- `clusterMaxZoom: 12` - ズーム12まではクラスタ化
- `clusterRadius: 50` - 50px以内のPOIをクラスタ化

```typescript
map.addSource(POI_SOURCE_ID, {
  type: 'geojson',
  data: createPOIGeoJSON(pois),
  cluster: true,
  clusterMaxZoom: 12,
  clusterRadius: 50,
});
```

### 2. クラスタ表示レイヤー

**責務**:
- クラスタを視覚的に表示
- クラスタ内のPOI件数を表示

**実装の要点**:
- `cluster-circle-layer`: クラスタ円（件数に応じたサイズ）
- `cluster-count-layer`: 件数テキスト
- フィルター `['has', 'point_count']` でクラスタのみ対象

```typescript
// クラスタ円レイヤー
map.addLayer({
  id: 'cluster-circle-layer',
  type: 'circle',
  source: POI_SOURCE_ID,
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': '#51bbd6',
    'circle-radius': [
      'step',
      ['get', 'point_count'],
      20,  // 〜10件
      10, 25,  // 10〜50件
      50, 30,  // 50件〜
    ],
  },
});

// クラスタ件数テキストレイヤー
map.addLayer({
  id: 'cluster-count-layer',
  type: 'symbol',
  source: POI_SOURCE_ID,
  filter: ['has', 'point_count'],
  layout: {
    'text-field': ['get', 'point_count_abbreviated'],
    'text-size': 12,
  },
});
```

### 3. 既存レイヤーの修正

**責務**:
- 非クラスタPOI（個別マーカー）のみを表示

**実装の要点**:
- 既存のAED・消火栓レイヤーにフィルター `['!', ['has', 'point_count']]` を追加
- クラスタ化されたPOIは表示しない

```typescript
// 既存レイヤーの修正
map.addLayer({
  id: AED_LAYER_ID,
  type: 'circle',
  source: POI_SOURCE_ID,
  filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'type'], 'aed']],
  // ...
});
```

### 4. クラスタクリックイベント

**責務**:
- クラスタクリック時にズームイン

**実装の要点**:
- `cluster-circle-layer` のクリックイベントを追加
- `getClusterExpansionZoom` でズーム先を取得
- `easeTo` でスムーズにズームイン

## データフロー

### クラスタ表示フロー
```
1. POIデータがGeoJSONソースに設定される
2. Mapbox GL JSが自動的にクラスタリング計算
3. ズームレベルに応じてクラスタ/個別POIが表示される
4. ユーザーがクラスタをクリック
5. ズームインしてクラスタが展開される
```

## エラーハンドリング戦略

### クラスタクリック時のエラー

- `getClusterExpansionZoom` の失敗時はコンソールにログ出力
- ズームイン処理が失敗しても地図操作は継続可能

## テスト戦略

### 手動テスト
- 広域表示でクラスタが表示されることを確認
- ズームインで個別POIが表示されることを確認
- クラスタクリックでズームインすることを確認
- 既存のPOIクリック機能が動作することを確認

### ビルドテスト
- TypeScriptエラーがないことを確認
- ビルドが成功することを確認

## 依存ライブラリ

新しいライブラリの追加は不要。Mapbox GL JS v3.21.0の組み込み機能を使用。

## ディレクトリ構造

```
components/map/
└── MapView.tsx  # 変更対象（クラスタリング設定追加）
```

## 実装の順序

1. GeoJSONソースにクラスタリングオプションを追加
2. クラスタ円レイヤーを追加
3. クラスタ件数テキストレイヤーを追加
4. 既存レイヤーにフィルターを追加（非クラスタのみ表示）
5. クラスタクリックイベントを追加
6. 動作確認・調整

## セキュリティ考慮事項

- クライアントサイドでのクラスタリングのため、サーバーサイドのセキュリティには影響なし
- POIデータの露出範囲に変更なし

## パフォーマンス考慮事項

- クラスタリングによりDOM要素数が削減され、広域表示時のパフォーマンスが向上
- クラスタリング計算はMapbox GL JSがWebWorkerで実行するため、UIスレッドに影響しない
- `clusterRadius: 50` は適切なバランス（小さすぎると効果薄、大きすぎるとPOI位置が不正確）

## 将来の拡張性

- クラスタクリックでPOI一覧を表示する機能を追加可能
- POI種別ごとの色分けクラスタ表示に拡張可能
- サーバーサイドクラスタリング（Supercluster）への移行が容易
