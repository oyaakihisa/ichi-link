# 設計書

## アーキテクチャ概要

既存の`SlidePanel.tsx`コンポーネントを修正するのみ。アーキテクチャの変更はなし。

## コンポーネント設計

### 1. SlidePanel（修正対象）

**修正内容**:
- 各行（住所、WGS84座標、Tokyo Datum座標、Google Maps URL）から`<CopyButton>`の呼び出しを削除
- 「全部コピー」ボタンのテキストを「コピー」に変更

**影響箇所**:
- 278行目: 住所行のCopyButton削除
- 291行目: WGS84座標行のCopyButton削除
- 301行目: Tokyo Datum座標行のCopyButton削除
- 339行目: POIモードのGoogle Maps行のCopyButton（スコープ外のため変更なし）
- 365行目: 長押しモードのGoogle Maps行のCopyButton削除
- 269行目: 「全部コピー」→「コピー」に変更

## データフロー

変更なし。既存のコピー機能（handleCopyAll関数）はそのまま利用。

## エラーハンドリング戦略

変更なし。

## テスト戦略

### 自動テスト
- `npm test` - 既存テストの通過確認
- `npm run lint` - リントエラーなし確認
- `npm run typecheck` - 型エラーなし確認

## 依存ライブラリ

変更なし。

## ディレクトリ構造

```
components/map/SlidePanel.tsx  # 修正対象
```

## 実装の順序

1. SlidePanel.tsxの各行からCopyButtonを削除
2. 「全部コピー」の表記を「コピー」に変更
3. CopyButtonインポートが不要になった場合は削除

## セキュリティ考慮事項

なし。UI変更のみ。

## パフォーマンス考慮事項

なし。コンポーネント削除によりわずかにレンダリング負荷が軽減される。

## 将来の拡張性

CopyButtonコンポーネントは他の箇所でも使用されているため、コンポーネント自体は維持。
