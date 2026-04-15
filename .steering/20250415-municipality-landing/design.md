# Design: 市町村ランディングページ

## ディレクトリ構造

```
app/
├── page.tsx                                    # 既存: 座標変換ツール（変更なし）
├── sitemap.ts                                  # 新規: sitemap生成
└── maps/
    ├── page.tsx                                # 新規: /maps - 全国トップ（リダイレクト）
    ├── [prefectureSlug]/
    │   ├── page.tsx                            # 新規: /maps/[prefecture] - 都道府県（リダイレクト）
    │   └── [municipalitySlug]/
    │       └── page.tsx                        # 新規: 市町村ページ（メイン）

components/
└── maps/
    └── MunicipalityMapView.tsx                 # 新規: 市町村地図表示（Client Component）
```

## 市町村ページ設計

### Server Component（page.tsx）

```typescript
// app/maps/[prefectureSlug]/[municipalitySlug]/page.tsx

interface PageProps {
  params: Promise<{
    prefectureSlug: string;
    municipalitySlug: string;
  }>;
}

// 静的生成対象を定義
export async function generateStaticParams() {
  const municipalities = await getMunicipalityRepository().getPublicMunicipalities();
  return municipalities.map((m) => ({
    prefectureSlug: m.prefectureSlug,
    municipalitySlug: m.municipalitySlug,
  }));
}

// SEOメタデータを動的生成
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { prefectureSlug, municipalitySlug } = await params;
  const municipality = await getMunicipalityRepository().getMunicipality(
    prefectureSlug,
    municipalitySlug
  );

  if (!municipality) {
    return {};
  }

  return {
    title: municipality.seo.title,
    description: municipality.seo.description,
    robots: municipality.status.isIndexed ? 'index,follow' : 'noindex,nofollow',
    alternates: {
      canonical: municipality.seo.canonicalPath,
    },
    openGraph: {
      title: municipality.seo.title,
      description: municipality.seo.description,
      url: municipality.path,
    },
  };
}

// ページ本体
export default async function MunicipalityPage({ params }: PageProps) {
  const { prefectureSlug, municipalitySlug } = await params;
  const municipality = await getMunicipalityRepository().getMunicipality(
    prefectureSlug,
    municipalitySlug
  );

  if (!municipality) {
    notFound();
  }

  // レイヤー状態を取得
  const layerStatuses = await getMunicipalityLayerStatusRepository()
    .getAllLayerStatuses(municipality.jisCode);

  return (
    <MunicipalityMapView
      municipality={municipality}
      layerStatuses={layerStatuses}
    />
  );
}
```

### Client Component（MunicipalityMapView.tsx）

```typescript
// components/maps/MunicipalityMapView.tsx
"use client";

interface MunicipalityMapViewProps {
  municipality: Municipality;
  layerStatuses: MunicipalityLayerStatus[];
}

export function MunicipalityMapView({ municipality, layerStatuses }: MunicipalityMapViewProps) {
  // 市町村マスタから初期状態を設定
  const initialCenter = municipality.map.center;
  const initialZoom = municipality.map.initialZoom;
  const initialBounds = municipality.map.bbox;
  const defaultLayers = municipality.layers.defaultLayers;

  // 既存のMapView, SlidePanel等を再利用
  // 初期POI取得は市町村bboxを使用

  return (
    <div className="min-h-screen flex flex-col">
      <header>...</header>
      <main>
        <MapView
          initialCenter={initialCenter}
          initialZoom={initialZoom}
          initialBounds={initialBounds}
          ...
        />
      </main>
    </div>
  );
}
```

## sitemap生成

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';
import { getMunicipalityRepository, getMunicipalityLayerStatusRepository } from '@/lib/server/municipality';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const repo = getMunicipalityRepository();
  const layerStatusRepo = getMunicipalityLayerStatusRepository();
  const municipalities = await repo.getIndexedMunicipalities();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ichi-link.vercel.app';

  const entries = await Promise.all(
    municipalities.map(async (m) => {
      const lastImportedAt = await layerStatusRepo.getLatestImportedAt(m.jisCode);
      return {
        url: `${baseUrl}${m.path}`,
        lastModified: lastImportedAt ?? new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      };
    })
  );

  // トップページも追加
  entries.unshift({
    url: baseUrl,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 1.0,
  });

  return entries;
}
```

## 全国トップ・都道府県ページ

MVPでは最小限実装:
- `/maps` → トップページへリダイレクト
- `/maps/[prefectureSlug]` → その都道府県内の最初の市町村へリダイレクト、または404

## MapViewの拡張

既存のMapViewコンポーネントに以下のpropsを追加:
- `initialCenter`: 初期中心座標
- `initialZoom`: 初期ズームレベル
- `initialBounds`: 初期表示範囲（fitBounds用）

## データフロー

```
1. URLアクセス → Server Component
2. Repository経由で市町村マスタ取得（RLS適用）
3. isPublic=false → notFound()
4. Client Componentに市町村設定を渡す
5. MapViewが市町村bbox内のPOIを初回取得
6. 以後はユーザー操作に応じてviewportベース取得
```
