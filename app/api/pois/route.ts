import { NextRequest, NextResponse } from 'next/server';
import { findByBbox, type POIListItem } from '@/lib/server/poi/POIRepository';
import type { POIType, MapBounds } from '@/lib/types/poi';

interface POIListResponse {
  pois: POIListItem[];
  meta: {
    total: number;
    bbox: MapBounds;
    types: POIType[];
  };
}

/**
 * bboxパラメータを解析する
 * @param bboxParam "west,south,east,north" 形式の文字列
 * @returns MapBounds または null（不正な形式の場合）
 */
function parseBbox(bboxParam: string): MapBounds | null {
  const parts = bboxParam.split(',');
  if (parts.length !== 4) {
    return null;
  }

  const [west, south, east, north] = parts.map(Number);

  if ([west, south, east, north].some(isNaN)) {
    return null;
  }

  // 緯度は-90〜90、経度は-180〜180の範囲
  if (south < -90 || south > 90 || north < -90 || north > 90) {
    return null;
  }
  if (west < -180 || west > 180 || east < -180 || east > 180) {
    return null;
  }

  return { west, south, east, north };
}

/**
 * typesパラメータを解析する
 * @param typesParam "aed,fireHydrant" 形式の文字列
 * @returns POIType配列
 */
function parseTypes(typesParam: string | null): POIType[] {
  if (!typesParam) {
    return ['aed', 'fireHydrant'];
  }

  const validTypes: POIType[] = ['aed', 'fireHydrant', 'fireCistern'];
  const types = typesParam.split(',').filter((t): t is POIType => validTypes.includes(t as POIType));

  return types.length > 0 ? types : ['aed', 'fireHydrant'];
}

/**
 * GET /api/pois
 * bbox範囲内のPOI一覧を取得する
 *
 * クエリパラメータ:
 * - bbox: "west,south,east,north" 形式（必須）
 * - types: "aed,fireHydrant" 形式（オプション）
 * - zoom: 数値（オプション、将来の拡張用）
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;

  // bboxパラメータの取得と検証
  const bboxParam = searchParams.get('bbox');
  if (!bboxParam) {
    return NextResponse.json({ error: 'bbox parameter is required' }, { status: 400 });
  }

  const bbox = parseBbox(bboxParam);
  if (!bbox) {
    return NextResponse.json(
      { error: 'Invalid bbox format. Expected: west,south,east,north (numbers)' },
      { status: 400 }
    );
  }

  // typesパラメータの取得
  const types = parseTypes(searchParams.get('types'));

  // POIを取得
  const pois = findByBbox(bbox, types);

  const response: POIListResponse = {
    pois,
    meta: {
      total: pois.length,
      bbox,
      types,
    },
  };

  return NextResponse.json(response);
}
