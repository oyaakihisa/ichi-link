import { NextRequest, NextResponse } from 'next/server';
import { ReverseGeocodingService } from '@/lib/services/ReverseGeocodingService';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  // バリデーション
  if (!lat || !lng) {
    return NextResponse.json(
      { error: 'lat and lng parameters are required' },
      { status: 400 }
    );
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json(
      { error: 'Invalid latitude or longitude' },
      { status: 400 }
    );
  }

  // 座標の範囲チェック
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json(
      { error: 'Coordinates out of range' },
      { status: 400 }
    );
  }

  try {
    const service = new ReverseGeocodingService();
    const result = await service.reverseGeocode({ latitude, longitude });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return NextResponse.json(
      { error: 'Failed to reverse geocode' },
      { status: 500 }
    );
  }
}
