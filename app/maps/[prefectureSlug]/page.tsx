import { redirect, notFound } from 'next/navigation';
import { getMunicipalityRepository } from '@/lib/server/municipality';

interface PageProps {
  params: Promise<{
    prefectureSlug: string;
  }>;
}

/**
 * /maps/[prefectureSlug] - 都道府県ページ
 *
 * MVPでは該当都道府県内の最初の市町村ページにリダイレクト。
 * 該当する市町村がない場合は404を返す。
 *
 * 将来的には都道府県内の市町村一覧や都道府県全体のマップを表示する予定。
 */
export default async function PrefecturePage({ params }: PageProps) {
  const { prefectureSlug } = await params;

  const municipalities = await getMunicipalityRepository().getMunicipalitiesByPrefecture(
    prefectureSlug
  );

  if (municipalities.length === 0) {
    notFound();
  }

  // 最初の市町村にリダイレクト
  const firstMunicipality = municipalities[0];
  redirect(firstMunicipality.path);
}
