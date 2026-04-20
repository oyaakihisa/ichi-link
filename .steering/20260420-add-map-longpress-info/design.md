# 設計: 市町村ページへの長押し機能追加

## 実装方針

`MunicipalityMapView`コンポーネントで`useMapInteraction`フックを使用するように変更する。

## 変更対象ファイル

- `components/maps/MunicipalityMapView.tsx`

## 詳細設計

### 1. useMapInteractionフックのインポート・使用

```typescript
import { useMapInteraction } from "@/components/hooks/useMapInteraction";

// コンポーネント内
const {
  pin,
  isPanelOpen,
  isLoadingAddress,
  handleLongPress: hookHandleLongPress,
  closePanel,
  clearPin,
} = useMapInteraction();
```

### 2. 独自state管理の削除

以下のstateを削除:
```typescript
// 削除
const [pin, setPin] = useState<{ coordinate: Coordinate; address?: string; } | null>(null);
const [isPinPanelOpen, setIsPinPanelOpen] = useState(false);
```

### 3. handleLongPress関数の修正

排他制御ロジックを維持しつつ、フックの`handleLongPress`を呼び出す:

```typescript
const handleLongPress = useCallback(
  (coordinate: Coordinate) => {
    // 変換結果をクリア
    clear();
    setIsConversionPanelClosed(true);
    // POI選択をクリア
    setSelectedPoi(null);
    setIsPoiPanelOpen(false);
    // フックのhandleLongPressを呼び出し
    hookHandleLongPress(coordinate);
  },
  [clear, hookHandleLongPress],
);
```

### 4. SlidePanelへのisLoadingAddressプロップ追加

```tsx
{pin && !result && !selectedPoi && (
  <SlidePanel
    pin={pin}
    isLoadingAddress={isLoadingAddress}
    isOpen={isPanelOpen}
    onClose={closePanel}
  />
)}
```

### 5. flyToCoordinate・pinCoordinateの更新

フックから取得した`pin`を使用するように変更:
- `isPinPanelOpen` → `isPanelOpen`
- `handleClosePinPanel` → `closePanel`

## 影響範囲

- 市町村ページのみ
- 既存の排他制御ロジックは維持
- トップページには影響なし
