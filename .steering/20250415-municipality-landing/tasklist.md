# Tasklist: 市町村ランディングページ

## タスク一覧

- [x] app/maps/ ディレクトリ構造を作成
- [x] app/maps/[prefectureSlug]/[municipalitySlug]/page.tsx を実装（市町村ページ本体）
- [x] components/maps/MunicipalityMapView.tsx を実装（Client Component）
- [x] MapViewコンポーネントに initialCenter/initialZoom/initialBounds propsを追加
- [x] app/maps/page.tsx を実装（全国トップ - リダイレクト）
- [x] app/maps/[prefectureSlug]/page.tsx を実装（都道府県ページ - リダイレクト）
- [x] app/sitemap.ts を実装（sitemap生成）

---

## 申し送り事項

### 実装完了日
2025-04-15

### 計画と実績の差分
- 計画通りに全タスク完了
- `PinLocation.tokyoCoordinate`をoptionalに変更（市町村ページでは測地系変換が不要なため）

### 学んだこと
- Server Component（page.tsx）でデータ取得し、Client Component（MunicipalityMapView）に渡すパターンが有効
- `generateStaticParams`と`generateMetadata`の組み合わせでSEO対策が可能
- MapViewコンポーネントの初期化propsは一度だけ使用するため、依存配列から意図的に除外

### 実装内容サマリ

#### ページ構造
- `app/maps/[prefectureSlug]/[municipalitySlug]/page.tsx` - 市町村ページ（Server Component）
- `app/maps/[prefectureSlug]/page.tsx` - 都道府県ページ（最初の市町村にリダイレクト）
- `app/maps/page.tsx` - 全国トップ（トップページにリダイレクト）
- `app/sitemap.ts` - sitemap.xml動的生成

#### コンポーネント
- `components/maps/MunicipalityMapView.tsx` - 市町村地図表示（Client Component）

#### SEO対策
- `generateStaticParams`: 公開市町村の静的生成
- `generateMetadata`: 動的メタデータ（title, description, robots, canonical, OGP）
- `sitemap.ts`: isIndexed=trueの市町村のみ含める

### 次回への改善提案
- 都道府県ページで市町村一覧を表示する機能を追加
- 全国トップページで地図と検索機能を提供
- POI取得のキャッシュ戦略を検討（同一市町村内での再取得を最適化）
