# 設計: AED / 消火栓レイヤー実装

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│  app/page.tsx                                                │
│  - POI選択状態 (selectedPoi)                                 │
│  - レイヤー表示状態 (layerVisibility)                        │
│  - 排他制御ロジック                                          │
├─────────────────────────────────────────────────────────────┤
│  components/                                                  │
│  ├─ map/MapView.tsx      POIレイヤー表示、POIクリックハンドラ │
│  ├─ map/LayerToggle.tsx  レイヤー切替UI（新規）              │
│  └─ map/SlidePanel.tsx   POI詳細表示対応                     │
├─────────────────────────────────────────────────────────────┤
│  lib/services/                                               │
│  └─ POIService.ts        POIデータ取得・キャッシュ（新規）   │
├─────────────────────────────────────────────────────────────┤
│  lib/types/                                                  │
│  └─ poi.ts               POI型定義（新規）                   │
└─────────────────────────────────────────────────────────────┘
```

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `lib/types/poi.ts` | POI型定義（新規） |
| `lib/types/index.ts` | POI型エクスポート追加 |
| `lib/services/POIService.ts` | POIサービス（新規） |
| `lib/services/index.ts` | POIServiceエクスポート追加 |
| `components/map/LayerToggle.tsx` | レイヤー切替UI（新規） |
| `components/map/MapView.tsx` | POIレイヤー表示追加 |
| `components/map/SlidePanel.tsx` | POI詳細表示対応 |
| `app/page.tsx` | POI状態管理・排他制御追加 |

## 型定義

### lib/types/poi.ts

```typescript
import { Coordinate } from './coordinate';

export type POIType = 'aed' | 'fireHydrant' | 'fireCistern';

export interface POI {
  id: string;
  type: POIType;
  name: string;
  coordinate: Coordinate;
  address?: string;
  detailText?: string;
  availabilityText?: string;
  source: string;
  updatedAt?: Date;
}

export interface AEDDetail extends POI {
  type: 'aed';
  availableHours?: string;
  locationDetail?: string;
  childPadAvailable?: boolean;
}

export interface FireHydrantDetail extends POI {
  type: 'fireHydrant';
  note: string; // "利用可否は別途確認が必要です"
}

export interface LayerVisibility {
  aed: boolean;
  fireHydrant: boolean;
}

export const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
  aed: true,        // 初期ON
  fireHydrant: false, // 初期OFF
};

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
```

## POIサービス設計

### lib/services/POIService.ts

```typescript
class POIService {
  private cache: Map<string, POI[]>;

  // 表示範囲内のPOI取得
  async getPOIs(bounds: MapBounds, types: POIType[]): Promise<POI[]>;

  // 単一POI詳細取得
  async getPOIDetail(id: string): Promise<POI | null>;

  // キャッシュクリア
  clearCache(): void;
}
```

### モックデータ

MVP段階では東京駅周辺のモックデータを使用:

```typescript
const MOCK_AEDS: POI[] = [
  {
    id: 'aed-001',
    type: 'aed',
    name: '東京駅丸の内北口 AED',
    coordinate: { latitude: 35.6814, longitude: 139.7660 },
    address: '東京都千代田区丸の内1-9-1',
    availabilityText: '24時間',
    detailText: '改札内コンコース',
    source: 'mock',
  },
  // ... 他のモックデータ
];
```

## MapView POIレイヤー設計

### Mapbox GeoJSON Source

```typescript
// POIデータをGeoJSON形式に変換
const poiFeatures = pois.map(poi => ({
  type: 'Feature',
  geometry: {
    type: 'Point',
    coordinates: [poi.coordinate.longitude, poi.coordinate.latitude],
  },
  properties: {
    id: poi.id,
    type: poi.type,
    name: poi.name,
  },
}));

// ソース追加
map.addSource('poi-source', {
  type: 'geojson',
  data: { type: 'FeatureCollection', features: poiFeatures },
});

// AEDレイヤー
map.addLayer({
  id: 'aed-layer',
  type: 'circle',
  source: 'poi-source',
  filter: ['==', ['get', 'type'], 'aed'],
  paint: {
    'circle-color': '#dc2626', // 赤
    'circle-radius': 8,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff',
  },
});

// 消火栓レイヤー
map.addLayer({
  id: 'fire-hydrant-layer',
  type: 'circle',
  source: 'poi-source',
  filter: ['==', ['get', 'type'], 'fireHydrant'],
  paint: {
    'circle-color': '#f59e0b', // オレンジ
    'circle-radius': 8,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff',
  },
});
```

### クリックハンドラ

```typescript
map.on('click', 'aed-layer', (e) => {
  const feature = e.features?.[0];
  if (feature) {
    onPoiSelect?.(/* POI data */);
  }
});

map.on('click', 'fire-hydrant-layer', (e) => {
  // 同様
});
```

## レイヤー切替UI設計

### LayerToggle.tsx

```typescript
interface LayerToggleProps {
  visibility: LayerVisibility;
  onChange: (visibility: LayerVisibility) => void;
}

// Mapboxカスタムコントロールとして実装
// 位置: top-left（検索バーの下）
// スタイル: 既存コントロールと統一感

// UI構造
// ┌──────────────┐
// │ ● AED       │
// │ ○ 消火栓   │
// └──────────────┘
```

## SlidePanel POI対応設計

### モード追加

```typescript
type PanelMode = 'conversion' | 'pin' | 'poi';

// POIモードの判定
const mode = selectedPoi ? 'poi' : conversionResult ? 'conversion' : 'pin';
```

### POI詳細表示

**AED表示項目:**
- 名称
- 種別バッジ（AED）
- 住所
- WGS84座標
- 設置場所詳細
- 利用可能時間
- 小児対応有無
- Google Mapsリンク
- 共有ボタン

**消火栓表示項目:**
- 名称/識別情報
- 種別バッジ（消火栓）
- 住所
- WGS84座標
- Google Mapsリンク
- 共有ボタン
- 注記: 「利用可否は別途確認が必要です」

## 状態管理設計

### page.tsx

```typescript
// 既存
const { result, clear } = useConversion();
const { pin, handleLongPress, closePanel, clearPin } = useMapInteraction();

// 新規追加
const [selectedPoi, setSelectedPoi] = useState<POI | null>(null);
const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>(DEFAULT_LAYER_VISIBILITY);
const [pois, setPois] = useState<POI[]>([]);

// 排他制御
const handlePoiSelect = useCallback((poi: POI) => {
  clearPin();           // 長押しピンをクリア
  clear();              // 変換結果をクリア
  setSelectedPoi(poi);
}, [clearPin, clear]);

const handleConvert = useCallback(async (...) => {
  setSelectedPoi(null); // POI選択をクリア
  closePanel();
  clearPin();
  // ... 既存処理
}, [...]);

const handleMapLongPress = useCallback((coord) => {
  setSelectedPoi(null); // POI選択をクリア
  clear();
  // ... 既存処理
}, [...]);
```

## 技術的考慮事項

### パフォーマンス

- POIデータはMapboxのGeoJSONソースとして管理（DOM要素生成を回避）
- 表示範囲変更時のデータ取得はデバウンス処理
- レイヤー表示/非表示はMapboxのsetLayoutPropertyで制御

### スタイル変更対応

- `style.load`イベントでPOIレイヤーを再追加
- 既存の日本語ラベル処理と同様のパターン
