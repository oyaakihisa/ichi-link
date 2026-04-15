# Design: POI API拡張

## アーキテクチャ

```
lib/
├── server/
│   └── poi/
│       ├── POIRepository.ts           # 既存: SQLite版（残す）
│       ├── SupabasePOIRepository.ts   # 新規: Supabase + PostGIS版
│       └── index.ts                   # エクスポート切り替え
└── types/
    └── poi.ts                         # 型定義（変更なし）

app/
└── api/
    └── pois/
        ├── route.ts                   # 変更: Supabase版Repositoryを使用
        └── [id]/
            └── route.ts               # 変更: Supabase版Repositoryを使用
```

## SupabasePOIRepository 設計

### bbox検索

```typescript
// PostGISのbbox検索
async findByBbox(bounds: MapBounds, types?: POIType[]): Promise<POIListItem[]> {
  let query = this.supabase
    .from('pois')
    .select(`
      id,
      type,
      name,
      location,
      address
    `)
    // PostGIS bbox検索はRPC関数で実行
    .or(`location.overlaps.srid=4326;POLYGON((${bounds.west} ${bounds.south},${bounds.east} ${bounds.south},${bounds.east} ${bounds.north},${bounds.west} ${bounds.north},${bounds.west} ${bounds.south}))`);

  // 注: Supabase JSクライアントではPostGIS関数を直接使用できないため
  // RPC関数またはRAW SQLを使用する必要がある

  // 実装方針: RPC関数 get_pois_by_bbox を使用
}
```

### RPC関数の使用

```sql
-- database.tsで定義済みのRPC
get_pois_by_bbox(
  p_west: number,
  p_south: number,
  p_east: number,
  p_north: number,
  p_types: string[],
  p_limit?: number
) -> POIListItem[]
```

### 詳細取得

```typescript
async findById(id: string): Promise<POIDetail | null> {
  const { data, error } = await this.supabase
    .from('pois')
    .select(`
      id,
      type,
      name,
      location,
      address,
      detail_text,
      availability_text,
      child_pad_available,
      source,
      source_updated_at
    `)
    .eq('id', id)
    .single();

  if (error || !data) return null;

  return toPOIDetail(data);
}
```

## RPC関数の追加

```sql
-- 003_poi_rpc.sql
CREATE OR REPLACE FUNCTION get_pois_by_bbox(
  p_west DOUBLE PRECISION,
  p_south DOUBLE PRECISION,
  p_east DOUBLE PRECISION,
  p_north DOUBLE PRECISION,
  p_types TEXT[] DEFAULT ARRAY['aed', 'fireHydrant'],
  p_limit INTEGER DEFAULT 1000
)
RETURNS TABLE (
  id VARCHAR(100),
  type VARCHAR(20),
  name VARCHAR(200),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address VARCHAR(500)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.type,
    p.name,
    ST_Y(p.location)::DOUBLE PRECISION AS latitude,
    ST_X(p.location)::DOUBLE PRECISION AS longitude,
    p.address
  FROM pois p
  WHERE p.location && ST_MakeEnvelope(p_west, p_south, p_east, p_north, 4326)
    AND p.type = ANY(p_types)
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
```

## 型変換

```typescript
// lib/server/poi/SupabasePOIRepository.ts

interface POIListRow {
  id: string;
  type: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
}

interface POIDetailRow {
  id: string;
  type: string;
  name: string;
  location: unknown; // PostGIS geometry
  address: string | null;
  detail_text: string | null;
  availability_text: string | null;
  child_pad_available: boolean | null;
  source: string | null;
  source_updated_at: string | null;
}

function toPOIListItem(row: POIListRow): POIListItem {
  return {
    id: row.id,
    type: row.type as POIType,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address ?? undefined,
  };
}
```

## エクスポート切り替え

```typescript
// lib/server/poi/index.ts

// 環境変数でSupabase使用を切り替え
const USE_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL ? true : false;

export const { findByBbox, findById } = USE_SUPABASE
  ? require('./SupabasePOIRepository')
  : require('./POIRepository');
```
