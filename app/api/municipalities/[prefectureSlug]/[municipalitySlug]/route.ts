import { NextRequest, NextResponse } from 'next/server';
import {
  getMunicipalityRepository,
  getMunicipalityLayerStatusRepository,
} from '@/lib/server/municipality';
import type { Municipality, MunicipalityLayerStatus } from '@/lib/types/municipality';

interface MunicipalityDetailResponse {
  municipality: Municipality;
  layerStatuses: MunicipalityLayerStatus[];
}

interface MunicipalityErrorResponse {
  error: string;
}

type RouteParams = {
  params: Promise<{
    prefectureSlug: string;
    municipalitySlug: string;
  }>;
};

/**
 * GET /api/municipalities/[prefectureSlug]/[municipalitySlug]
 * 市町村詳細を取得する
 *
 * パスパラメータ:
 * - prefectureSlug: 都道府県スラッグ（例: "ishikawa"）
 * - municipalitySlug: 市町村スラッグ（例: "kanazawa"）
 *
 * レスポンス:
 * - municipality: 市町村情報
 * - layerStatuses: レイヤー状態一覧
 *
 * RLS により is_public=true の市町村のみ返却
 * 存在しない or 非公開の場合は 404
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<MunicipalityDetailResponse | MunicipalityErrorResponse>> {
  const { prefectureSlug, municipalitySlug } = await params;

  const municipalityRepo = getMunicipalityRepository();
  const layerStatusRepo = getMunicipalityLayerStatusRepository();

  const municipality = await municipalityRepo.getMunicipality(
    prefectureSlug,
    municipalitySlug
  );

  if (!municipality) {
    return NextResponse.json(
      { error: 'Municipality not found' },
      { status: 404 }
    );
  }

  const layerStatuses = await layerStatusRepo.getAllLayerStatuses(
    municipality.jisCode
  );

  return NextResponse.json({
    municipality,
    layerStatuses,
  });
}
