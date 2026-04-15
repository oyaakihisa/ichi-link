# Requirements: 市町村ランディングページ

## 概要

市町村ごとの検索流入を受けるランディングページを実装する。
URL構造 `/maps/[prefectureSlug]/[municipalitySlug]` で市町村ページを提供する。

## 機能要件

### 市町村ページ（P1: 最優先）

- URL: `/maps/[prefectureSlug]/[municipalitySlug]`
- 市町村マスタから設定を取得し、地図を初期表示
- `bbox` / `center` / `initialZoom` で地図を初期化
- `defaultLayers` に従って初期レイヤーを有効化
- RLSにより `isPublic=false` の市町村は404を返す

### SEO対応

- `generateMetadata()` で動的メタデータ生成
- `isIndexed=false` の場合は `noindex,nofollow` を付与
- canonicalは常にクエリなしの市町村URLに設定
- OGPタグの生成

### 静的生成

- `generateStaticParams()` で公開市町村を事前生成
- ビルド時に市町村マスタから対象を取得

### sitemap生成

- `app/sitemap.ts` で `isIndexed=true` の市町村を含める
- `lastModified` には `lastImportedAt` を使用

## 非機能要件

- 既存のapp/page.tsx（座標変換ツール）には影響しない
- 市町村ページは /maps 配下に配置
- Server Component + Client Component のハイブリッド構成

## 制約

- 都道府県ページ、全国トップページはMVPでは最小限実装
- POI取得は既存のpoiServiceを再利用
