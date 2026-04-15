import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getMunicipalityRepository,
  getMunicipalityLayerStatusRepository,
} from '@/lib/server/municipality';
import { MunicipalityMapView } from '@/components/maps/MunicipalityMapView';

interface PageProps {
  params: Promise<{
    prefectureSlug: string;
    municipalitySlug: string;
  }>;
}

/**
 * 静的生成対象の市町村一覧を取得
 * RLSにより isPublic=true の市町村のみ
 */
export async function generateStaticParams() {
  const municipalities = await getMunicipalityRepository().getPublicMunicipalities();

  return municipalities.map((m) => ({
    prefectureSlug: m.prefectureSlug,
    municipalitySlug: m.municipalitySlug,
  }));
}

/**
 * SEOメタデータを動的生成
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { prefectureSlug, municipalitySlug } = await params;

  const municipality = await getMunicipalityRepository().getMunicipality(
    prefectureSlug,
    municipalitySlug
  );

  // RLSにより isPublic=false の市町村は null として返却される
  if (!municipality) {
    return {};
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ichi-link.vercel.app';

  return {
    title: municipality.seo.title,
    description: municipality.seo.description,
    robots: municipality.status.isIndexed ? 'index,follow' : 'noindex,nofollow',
    alternates: {
      canonical: `${baseUrl}${municipality.seo.canonicalPath}`,
    },
    openGraph: {
      title: municipality.seo.title,
      description: municipality.seo.description,
      url: `${baseUrl}${municipality.path}`,
      type: 'website',
    },
  };
}

/**
 * 市町村ランディングページ
 *
 * - 市町村マスタから設定を取得
 * - RLSにより isPublic=false の市町村は404を返す
 * - 地図を市町村範囲で初期表示
 */
export default async function MunicipalityPage({ params }: PageProps) {
  const { prefectureSlug, municipalitySlug } = await params;

  const municipality = await getMunicipalityRepository().getMunicipality(
    prefectureSlug,
    municipalitySlug
  );

  // RLSにより isPublic=false の市町村は null として返却される
  if (!municipality) {
    notFound();
  }

  // レイヤー状態を取得（最終更新日など）
  const layerStatuses = await getMunicipalityLayerStatusRepository().getAllLayerStatuses(
    municipality.jisCode
  );

  return (
    <MunicipalityMapView
      municipality={municipality}
      layerStatuses={layerStatuses}
    />
  );
}
