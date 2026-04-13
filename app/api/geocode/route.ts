import { NextRequest, NextResponse } from 'next/server';

/**
 * Yahoo!ジオコーダAPIのレスポンス型
 */
interface YahooGeocodeResponse {
  ResultInfo: {
    Count: number;
    Total: number;
    Start: number;
    Status: number;
    Description: string;
    Latency: number;
  };
  Feature?: Array<{
    Name: string;
    Geometry: {
      Type: string;
      Coordinates: string; // "経度,緯度" 形式
    };
    Property: {
      Address: string;
      AddressElement?: Array<{
        Name: string;
        Kana: string;
        Level: string;
        Code?: string;
      }>;
    };
  }>;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: '住所を入力してください' } },
      { status: 400 }
    );
  }

  const clientId = process.env.YAHOO_CLIENT_ID;
  if (!clientId) {
    console.error('YAHOO_CLIENT_ID is not configured');
    return NextResponse.json(
      { error: { code: 'CONFIG_ERROR', message: 'APIの設定エラーです' } },
      { status: 500 }
    );
  }

  const apiUrl = new URL('https://map.yahooapis.jp/geocode/V1/geoCoder');
  apiUrl.searchParams.set('appid', clientId);
  apiUrl.searchParams.set('query', address);
  apiUrl.searchParams.set('output', 'json');

  try {
    const response = await fetch(apiUrl.toString(), {
      headers: {
        'User-Agent': 'ichi-link/1.0',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: { code: 'API_ERROR', message: `APIエラーが発生しました（${response.status}）` } },
        { status: 502 }
      );
    }

    const data: YahooGeocodeResponse = await response.json();

    if (!data.Feature || data.Feature.length === 0) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '指定された住所が見つかりませんでした' } },
        { status: 404 }
      );
    }

    const feature = data.Feature[0];
    const [longitude, latitude] = feature.Geometry.Coordinates.split(',').map(Number);

    return NextResponse.json({
      coordinate: {
        latitude: Math.round(latitude * 1000000) / 1000000,
        longitude: Math.round(longitude * 1000000) / 1000000,
      },
      matchedAddress: feature.Property.Address,
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: { code: 'NETWORK_ERROR', message: 'ネットワークエラーが発生しました' } },
      { status: 502 }
    );
  }
}
