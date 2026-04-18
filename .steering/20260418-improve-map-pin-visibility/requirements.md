# 修正要求

## 修正対象

- 機能名: 地図画面のUI改善（ピン視認性向上）
- 関連ファイル: `app/page.tsx`, `components/search/SearchBar.tsx`, `components/map/SlidePanel.tsx`

## 問題の説明

地図を長押しした際にスライドパネルが下から表示されるが、ピンが刺さった地図の上部がヘッダーとSearchBarに隠れて見えない。

## 現在の動作

- ヘッダー（ichi-linkロゴ + 説明文）が画面上部に常時表示
- SearchBarのpadding: `p-3`（12px）
- スライドパネルの最大高さ: `max-h-[70vh]`（画面の70%）

## 期待する動作

- ヘッダーを削除して地図表示領域を拡大
- SearchBarをコンパクトにして地図の視認性向上
- スライドパネルの最大高さを画面の50%に制限し、ピンが常に見える状態を維持

## 修正アプローチ

1. `app/page.tsx`からヘッダー要素を削除
2. `components/search/SearchBar.tsx`のpadding `p-3`を`p-2`に変更
3. `components/map/SlidePanel.tsx`の`max-h-[70vh]`を`max-h-[50vh]`に変更

## 影響範囲

- `app/page.tsx` - ヘッダー削除
- `components/search/SearchBar.tsx` - SearchBarのサイズ縮小
- `components/map/SlidePanel.tsx` - スライドパネルの高さ制限

## 受け入れ条件

- [ ] ヘッダーが表示されないこと
- [ ] SearchBarがコンパクトになっていること
- [ ] スライドパネルが画面の50%までしか上がらないこと
- [ ] 長押し時にピンが見える状態であること

## テスト計画

- npm test、npm run lint、npm run typecheckでエラーがないことを確認

## スコープ外

- 他のページのレイアウト変更
- SearchBarの機能変更
