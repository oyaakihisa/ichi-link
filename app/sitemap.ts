import { MetadataRoute } from 'next';
import {
  getMunicipalityRepository,
  getMunicipalityLayerStatusRepository,
} from '@/lib/server/municipality';

/**
 * sitemap.xml を動的生成
 *
 * - isPublic=true && isIndexed=true の市町村ページを含める
 * - lastModified には lastImportedAt を使用
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ichi-link.vercel.app';

  const repo = getMunicipalityRepository();
  const layerStatusRepo = getMunicipalityLayerStatusRepository();

  // isIndexed=true の市町村のみ取得
  const municipalities = await repo.getIndexedMunicipalities();

  // 市町村ページのエントリ
  const municipalityEntries = await Promise.all(
    municipalities.map(async (m) => {
      const lastImportedAt = await layerStatusRepo.getLatestImportedAt(m.jisCode);
      return {
        url: `${baseUrl}${m.path}`,
        lastModified: lastImportedAt ?? m.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      };
    })
  );

  // トップページ
  const topPageEntry = {
    url: baseUrl,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 1.0,
  };

  return [topPageEntry, ...municipalityEntries];
}
