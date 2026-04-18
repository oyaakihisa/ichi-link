# 要求内容

## 問題

市町村マップページ（`/maps/ishikawa/wajima`等）にSearchBarが表示されていない。

## 期待動作

市町村マップも全国マップ（`app/page.tsx`）と同様の画面構成にする：
- SearchBarをフローティング表示
- ヘッダーを削除
- 変換結果をSlidePanel表示

## 対象画面

- `/maps/[prefectureSlug]/[municipalitySlug]` 全ての市町村マップページ
