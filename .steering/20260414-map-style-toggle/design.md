# 設計: 地図スタイル切り替え機能

## 実装方針

### アプローチ

Mapbox GL JSの`map.setStyle()`を使用してスタイルを切り替える。

### スタイル定義

```typescript
const MAP_STYLES = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
} as const;
```

### 状態管理

- `mapStyle`: 現在のスタイル（'streets' | 'satellite'）
- MapView内部でuseStateで管理

### 日本語ラベル処理

`setStyle()`を呼ぶとスタイルがリセットされるため、`style.load`イベントで日本語ラベル処理を再適用する必要がある。

```typescript
map.on('style.load', () => {
  applyJapaneseLabels(map);
});
```

### UI配置

- 右上に配置（ナビゲーションコントロールの下）
- トグルボタン形式（地図アイコン / 衛星アイコン）
- Mapbox GL JSのカスタムコントロールとして追加

### ボタンデザイン

- 44x44px以上（タッチ対応）
- 白背景、影付き（Mapboxコントロールと統一感）
- 現在のスタイルと反対のアイコンを表示（切り替え先を示す）

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `components/map/MapView.tsx` | スタイル切り替え機能の追加 |

## 技術的考慮事項

### setStyle後の処理

1. `style.load`イベントで日本語ラベル処理を再適用
2. マーカーはスタイル変更の影響を受けない（DOM要素のため）
3. イベントリスナーは維持される

### パフォーマンス

- スタイル切り替え時は新しいタイルの読み込みが発生
- 衛星画像は通常地図より重い（初回のみ）
