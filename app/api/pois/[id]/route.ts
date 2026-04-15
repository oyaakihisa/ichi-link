import { NextRequest, NextResponse } from 'next/server';
import { findById } from '@/lib/server/poi/POIRepository';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/pois/{id}
 * 単一POIの詳細情報を取得する
 */
export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'POI ID is required' }, { status: 400 });
  }

  const poi = findById(id);

  if (!poi) {
    return NextResponse.json({ error: 'POI not found' }, { status: 404 });
  }

  return NextResponse.json(poi);
}
