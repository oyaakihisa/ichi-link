# 設計書: Android地図フリーズ問題の修正

## 変更概要

MapViewコンポーネントのタッチイベントハンドラに、touchesリストの長さチェックを追加し、Androidでの地図フリーズを防止する。

## 技術的背景

### ブラウザ間の挙動差異

| ブラウザ | 指を離す際の挙動 |
|---------|-----------------|
| iOS Safari | `touchend`のみ発火 |
| Android Chrome | `touchmove`（touches.length=0）→ `touchend`の順で発火 |

### 問題のコードフロー

1. ユーザーが地図をタッチ → `touchstart` → `handleLongPressStart`
2. ユーザーが指を動かす → `touchmove` → `handleMove`
3. ユーザーが指を離す（Android Chrome）:
   - `touchmove`が発火（**この時点で`touches`は空配列**）
   - `touches[0]`が`undefined`
   - `undefined.clientX`で TypeError
   - エラーにより地図がフリーズ

## 修正設計

### 1. handleLongPressStart関数

```typescript
const handleLongPressStart = useCallback(
  (e: mapboxgl.MapMouseEvent | mapboxgl.MapTouchEvent) => {
    if (!onLongPress) return;

    let point: { x: number; y: number };

    if ('touches' in e.originalEvent && e.originalEvent.touches.length > 0) {
      // タッチイベント（指が画面上にある場合のみ）
      point = {
        x: e.originalEvent.touches[0].clientX,
        y: e.originalEvent.touches[0].clientY,
      };
    } else if ('clientX' in e.originalEvent) {
      // マウスイベント
      point = {
        x: (e.originalEvent as MouseEvent).clientX,
        y: (e.originalEvent as MouseEvent).clientY,
      };
    } else {
      // どちらでもない場合は処理しない
      return;
    }

    startPosition.current = point;
    // ... タイマー設定
  },
  [onLongPress]
);
```

### 2. handleMove関数

```typescript
const handleMove = useCallback(
  (e: mapboxgl.MapMouseEvent | mapboxgl.MapTouchEvent) => {
    if (!startPosition.current) return;

    let point: { x: number; y: number };

    if ('touches' in e.originalEvent && e.originalEvent.touches.length > 0) {
      // タッチイベント（指がまだ画面上にある場合のみ）
      point = {
        x: e.originalEvent.touches[0].clientX,
        y: e.originalEvent.touches[0].clientY,
      };
    } else if ('clientX' in e.originalEvent) {
      // マウスイベント
      point = {
        x: (e.originalEvent as MouseEvent).clientX,
        y: (e.originalEvent as MouseEvent).clientY,
      };
    } else {
      // どちらでもない場合（touchmove発火時にtouchesが空など）はキャンセル
      clearLongPressTimer();
      return;
    }

    // ... 移動距離チェック
  },
  [clearLongPressTimer]
);
```

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `components/map/MapView.tsx` | handleLongPressStart, handleMove関数の修正 |

## リスク評価

- **変更規模**: 小（2つの関数内の条件分岐修正のみ）
- **破壊的変更**: なし
- **副作用リスク**: 低（既存のiPhone動作に影響なし）
