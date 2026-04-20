# 市町村ページへの長押し機能追加

## 背景

市町村ページ（`/app/maps/[prefectureSlug]/[municipalitySlug]/page.tsx`）で地図を長押しした際に、トップページ（`/app/page.tsx`）と同等の情報を表示する機能を追加する。

## 現状

### トップページの長押し機能
- `useMapInteraction`フックを使用
- 長押しで逆ジオコーディング（住所取得）を実行
- Tokyo Datum座標への自動変換
- SlidePanelに住所、WGS84座標、Tokyo Datum座標を表示

### 市町村ページの現状
- 独自のstate管理（`pin`, `isPinPanelOpen`）
- 長押し機能自体は存在
- **逆ジオコーディングなし**
- **Tokyo Datum座標変換なし**
- SlidePanelに`isLoadingAddress`プロップなし

## 要求

市町村ページの長押し機能を、トップページと同等の機能レベルに引き上げる。

## 受け入れ条件

1. 市町村ページで地図を長押しすると、以下が表示される:
   - 住所（逆ジオコーディング結果）
   - WGS84座標
   - Tokyo Datum座標
2. 住所取得中は読み込み状態が表示される
3. 既存の排他制御（変換結果・POI選択との排他）が維持される
