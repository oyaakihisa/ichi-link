# Design: 市町村マスタAPI

## アーキテクチャ

```
lib/
├── server/
│   └── municipality/
│       ├── index.ts                          # エクスポート
│       ├── MunicipalityRepository.ts         # 市町村マスタ読み取り
│       └── MunicipalityLayerStatusRepository.ts  # レイヤー状態読み取り
├── services/
│   └── municipality/
│       └── MunicipalityService.ts            # クライアント用API呼び出し
└── types/
    └── municipality.ts                       # 型定義（作成済み）

app/
└── api/
    └── municipalities/
        ├── route.ts                          # GET /api/municipalities
        └── [prefectureSlug]/
            └── [municipalitySlug]/
                └── route.ts                  # GET /api/municipalities/{p}/{m}
```

## 権限設計

| 操作 | ロール | RLS適用 | 用途 |
|------|--------|---------|------|
| 読み取り（公開） | anon | ○ | API Route、Server Component |
| 読み取り（全件） | service_role | × | 管理画面、バッチ処理 |
| 更新 | service_role | × | データインポートバッチ |

**方針**:
- Repository は読み取り専用（anon クライアント使用）
- 更新メソッドは別途 Admin Repository として将来実装
- RLS により `is_public=true` のデータのみ返却

## Repository 実装

### MunicipalityRepository

```typescript
// lib/server/municipality/MunicipalityRepository.ts
import { getAnonClient } from '@/lib/server/db/supabase';
import { toMunicipality, type Municipality } from '@/lib/types/municipality';

export class MunicipalityRepository {
  private supabase = getAnonClient();

  async getMunicipality(
    prefectureSlug: string,
    municipalitySlug: string
  ): Promise<Municipality | null> {
    const { data, error } = await this.supabase
      .from('municipalities')
      .select('*')
      .eq('prefecture_slug', prefectureSlug)
      .eq('municipality_slug', municipalitySlug)
      .single();

    if (error || !data) return null;
    return toMunicipality(data);
  }

  async getMunicipalitiesByPrefecture(prefectureSlug: string): Promise<Municipality[]> {
    const { data, error } = await this.supabase
      .from('municipalities')
      .select('*')
      .eq('prefecture_slug', prefectureSlug)
      .order('municipality_slug');

    if (error || !data) return [];
    return data.map(toMunicipality);
  }

  async getPublicMunicipalities(): Promise<Municipality[]> {
    // RLSにより is_public=true のみ返却される
    const { data, error } = await this.supabase
      .from('municipalities')
      .select('*')
      .order('prefecture_slug')
      .order('municipality_slug');

    if (error || !data) return [];
    return data.map(toMunicipality);
  }

  async getIndexedMunicipalities(): Promise<Municipality[]> {
    // RLSにより is_public=true が前提、さらに is_indexed=true でフィルタ
    const { data, error } = await this.supabase
      .from('municipalities')
      .select('*')
      .eq('is_indexed', true)
      .order('prefecture_slug')
      .order('municipality_slug');

    if (error || !data) return [];
    return data.map(toMunicipality);
  }
}

// シングルトンインスタンス
let instance: MunicipalityRepository | null = null;

export function getMunicipalityRepository(): MunicipalityRepository {
  if (!instance) {
    instance = new MunicipalityRepository();
  }
  return instance;
}
```

### MunicipalityLayerStatusRepository

```typescript
// lib/server/municipality/MunicipalityLayerStatusRepository.ts
import { getAnonClient } from '@/lib/server/db/supabase';
import { toMunicipalityLayerStatus, type MunicipalityLayerStatus } from '@/lib/types/municipality';
import type { POIType } from '@/lib/types/poi';

export class MunicipalityLayerStatusRepository {
  private supabase = getAnonClient();

  async getLayerStatus(
    jisCode: string,
    layerType: POIType
  ): Promise<MunicipalityLayerStatus | null> {
    const { data, error } = await this.supabase
      .from('municipality_layer_statuses')
      .select('*')
      .eq('municipality_jis_code', jisCode)
      .eq('layer_type', layerType)
      .single();

    if (error || !data) return null;
    return toMunicipalityLayerStatus(data);
  }

  async getAllLayerStatuses(jisCode: string): Promise<MunicipalityLayerStatus[]> {
    const { data, error } = await this.supabase
      .from('municipality_layer_statuses')
      .select('*')
      .eq('municipality_jis_code', jisCode);

    if (error || !data) return [];
    return data.map(toMunicipalityLayerStatus);
  }

  async getLatestImportedAt(jisCode: string): Promise<Date | null> {
    const { data, error } = await this.supabase
      .from('municipality_layer_statuses')
      .select('last_imported_at')
      .eq('municipality_jis_code', jisCode)
      .not('last_imported_at', 'is', null)
      .order('last_imported_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data?.last_imported_at) return null;
    return new Date(data.last_imported_at);
  }
}

// シングルトンインスタンス
let instance: MunicipalityLayerStatusRepository | null = null;

export function getMunicipalityLayerStatusRepository(): MunicipalityLayerStatusRepository {
  if (!instance) {
    instance = new MunicipalityLayerStatusRepository();
  }
  return instance;
}
```

## API Route 実装

### GET /api/municipalities

```typescript
// app/api/municipalities/route.ts
export async function GET(request: NextRequest): Promise<NextResponse> {
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
```

### GET /api/municipalities/{prefectureSlug}/{municipalitySlug}

```typescript
// app/api/municipalities/[prefectureSlug]/[municipalitySlug]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ prefectureSlug: string; municipalitySlug: string }> }
): Promise<NextResponse> {
  const { prefectureSlug, municipalitySlug } = await params;

  const repo = getMunicipalityRepository();
  const layerStatusRepo = getMunicipalityLayerStatusRepository();

  const municipality = await repo.getMunicipality(prefectureSlug, municipalitySlug);

  if (!municipality) {
    return NextResponse.json({ error: 'Municipality not found' }, { status: 404 });
  }

  const layerStatuses = await layerStatusRepo.getAllLayerStatuses(municipality.jisCode);

  return NextResponse.json({
    municipality,
    layerStatuses,
  });
}
```

## クライアントサービス

```typescript
// lib/services/municipality/MunicipalityService.ts
import type { Municipality, MunicipalityLayerStatus } from '@/lib/types/municipality';

interface MunicipalityDetailResponse {
  municipality: Municipality;
  layerStatuses: MunicipalityLayerStatus[];
}

interface MunicipalityListResponse {
  municipalities: Municipality[];
  total: number;
}

export class MunicipalityService {
  async getMunicipality(
    prefectureSlug: string,
    municipalitySlug: string
  ): Promise<MunicipalityDetailResponse | null> {
    const response = await fetch(
      `/api/municipalities/${prefectureSlug}/${municipalitySlug}`
    );

    if (!response.ok) return null;
    return response.json();
  }

  async getMunicipalitiesByPrefecture(prefectureSlug: string): Promise<Municipality[]> {
    const response = await fetch(
      `/api/municipalities?prefecture=${encodeURIComponent(prefectureSlug)}`
    );

    if (!response.ok) return [];
    const data: MunicipalityListResponse = await response.json();
    return data.municipalities;
  }
}
```

## location 型の方針

POIRepository で Supabase に移行する際の方針:
- **DB**: PostGIS `geometry(Point, 4326)` で保存
- **API レスポンス**: `latitude` / `longitude` の数値ペアで返却
- **変換**: Repository 層で `ST_Y(location)` / `ST_X(location)` により抽出

```typescript
// POIRepository での返却例（後続タスクで実装）
interface POIListItem {
  id: string;
  type: POIType;
  name: string;
  latitude: number;   // ST_Y(location)
  longitude: number;  // ST_X(location)
  address?: string;
}
```

GeoJSON 形式は使用せず、シンプルな lat/lng ペアで統一する。
