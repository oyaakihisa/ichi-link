# 設計書

## アーキテクチャ概要

既存のコンポーネントを修正するのみ。アーキテクチャの変更はなし。

## コンポーネント設計

### 1. app/page.tsx（修正対象）

**修正内容**:
- ヘッダー要素（行175-181）を削除

**削除対象コード**:
```tsx
{/* ヘッダー */}
<header className="bg-white shadow-sm z-20 relative">
  <div className="max-w-4xl mx-auto px-4 py-3">
    <h1 className="text-lg font-bold text-gray-900">ichi-link</h1>
    <p className="text-xs text-gray-500">位置情報変換ツール</p>
  </div>
</header>
```

### 2. SearchBar（修正対象）

**修正内容**:
- 行41: padding `p-3` → `p-2`

**変更前**:
```tsx
<div className="bg-white rounded-xl shadow-lg p-3">
```

**変更後**:
```tsx
<div className="bg-white rounded-xl shadow-lg p-2">
```

### 3. SlidePanel（修正対象）

**修正内容**:
- 行242: 最大高さ `max-h-[70vh]` → `max-h-[50vh]`

**変更前**:
```tsx
<div className="px-4 pb-6 pt-2 max-h-[70vh] overflow-y-auto">
```

**変更後**:
```tsx
<div className="px-4 pb-6 pt-2 max-h-[50vh] overflow-y-auto">
```

## データフロー

変更なし。

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
app/page.tsx                      # 修正対象
components/search/SearchBar.tsx   # 修正対象
components/map/SlidePanel.tsx     # 修正対象
```

## 実装の順序

1. app/page.tsx - ヘッダー削除
2. components/search/SearchBar.tsx - padding変更
3. components/map/SlidePanel.tsx - max-height変更

## セキュリティ考慮事項

なし。UI変更のみ。

## パフォーマンス考慮事項

ヘッダー削除によりレンダリング負荷が軽減される。
