import { NextRequest, NextResponse } from 'next/server';
import { getMunicipalityRepository } from '@/lib/server/municipality';
import type { Municipality } from '@/lib/types/municipality';

interface MunicipalityListResponse {
  municipalities: Municipality[];
  total: number;
}

/**
 * GET /api/municipalities
 * 市町村一覧を取得する
 *
 * クエリパラメータ:
 * - prefecture: 都道府県スラッグでフィルタ（オプション）
 *
 * レスポンス:
 * - municipalities: 市町村配列
 * - total: 件数
 *
 * RLS により is_public=true の市町村のみ返却
 */
export async function GET(request: NextRequest): Promise<NextResponse<MunicipalityListResponse>> {
  const searchParams = request.nextUrl.searchParams;
  const prefectureSlug = searchParams.get('prefecture');

  const repo = getMunicipalityRepository();

  const municipalities = prefectureSlug
    ? await repo.getMunicipalitiesByPrefecture(prefectureSlug)
    : await repo.getPublicMunicipalities();

  return NextResponse.json({
    municipalities,
    total: municipalities.length,
  });
}
