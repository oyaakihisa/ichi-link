# Design: Supabase + PostGIS基盤構築

## アーキテクチャ

```
lib/
├── server/
│   ├── db/
│   │   ├── supabase.ts         # Supabase クライアント（サーバーサイド）
│   │   └── connection.ts       # 既存SQLite接続（将来削除）
│   └── ...
├── supabase/
│   └── client.ts               # Supabase クライアント（クライアントサイド）
└── types/
    └── municipality.ts         # 市町村関連型定義
```

## 実装設計

### 1. Supabase クライアント設定

**サーバーサイド（lib/server/db/supabase.ts）**:
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// サーバーサイドでは service_role を使用（RLSをバイパス可能）
export function createServerClient() {
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}

// anon キーでの接続（RLS適用）
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export function createAnonClient() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}
```

**クライアントサイド（lib/supabase/client.ts）**:
```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/types/database';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### 2. 型定義

**Municipality（lib/types/municipality.ts）**:
```typescript
export interface MunicipalityStatus {
  isPublic: boolean;
  isIndexed: boolean;
}

export interface MunicipalityMapConfig {
  center: { lat: number; lng: number };
  bbox: { north: number; south: number; east: number; west: number };
  initialZoom: number;
}

export interface MunicipalityLayerConfig {
  defaultLayers: POIType[];
  availableLayers: POIType[];
}

export interface MunicipalitySeoConfig {
  title: string;
  description: string;
  h1?: string;
  canonicalPath: string;
}

export interface Municipality {
  jisCode: string;
  prefectureSlug: string;
  municipalitySlug: string;
  prefectureNameJa: string;
  municipalityNameJa: string;
  path: string;
  map: MunicipalityMapConfig;
  layers: MunicipalityLayerConfig;
  seo: MunicipalitySeoConfig;
  status: MunicipalityStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface MunicipalityLayerStatus {
  municipalityJisCode: string;
  layerType: POIType;
  itemCount: number;
  lastImportedAt: Date;
  sourceUpdatedAt?: Date;
  isAvailable: boolean;
}
```

### 3. データベース型生成

Supabase CLIでスキーマから型を生成:
```bash
npx supabase gen types typescript --project-id <project-id> > lib/types/database.ts
```

初期段階では手動で型定義を作成。

### 4. SQLマイグレーション

**supabase/migrations/001_initial_schema.sql**:
```sql
-- PostGIS拡張を有効化
CREATE EXTENSION IF NOT EXISTS postgis;

-- 市町村マスタテーブル
CREATE TABLE municipalities (
  jis_code VARCHAR(6) PRIMARY KEY,
  prefecture_slug VARCHAR(50) NOT NULL,
  municipality_slug VARCHAR(50) NOT NULL,
  prefecture_name_ja VARCHAR(20) NOT NULL,
  municipality_name_ja VARCHAR(50) NOT NULL,
  center_lat DECIMAL(9,6) NOT NULL,
  center_lng DECIMAL(9,6) NOT NULL,
  bbox_north DECIMAL(9,6) NOT NULL,
  bbox_south DECIMAL(9,6) NOT NULL,
  bbox_east DECIMAL(9,6) NOT NULL,
  bbox_west DECIMAL(9,6) NOT NULL,
  initial_zoom INTEGER DEFAULT 12,
  default_layers TEXT[] DEFAULT ARRAY['aed'],
  available_layers TEXT[] DEFAULT ARRAY['aed', 'fireHydrant'],
  seo_title VARCHAR(200),
  seo_description TEXT,
  seo_h1 VARCHAR(200),
  content_intro_text TEXT,
  content_caution_text TEXT,
  is_public BOOLEAN DEFAULT false,
  is_indexed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (prefecture_slug, municipality_slug)
);

-- 市町村別レイヤー状態テーブル
CREATE TABLE municipality_layer_statuses (
  id SERIAL PRIMARY KEY,
  municipality_jis_code VARCHAR(6) REFERENCES municipalities(jis_code) ON DELETE CASCADE,
  layer_type VARCHAR(20) NOT NULL,
  item_count INTEGER DEFAULT 0,
  last_imported_at TIMESTAMPTZ,
  source_updated_at TIMESTAMPTZ,
  is_available BOOLEAN DEFAULT true,
  UNIQUE (municipality_jis_code, layer_type)
);

-- POIテーブル（PostGIS geometry型）
CREATE TABLE pois (
  id VARCHAR(100) PRIMARY KEY,
  type VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL,
  location geometry(Point, 4326) NOT NULL,
  address VARCHAR(500),
  detail_text TEXT,
  availability_text VARCHAR(200),
  child_pad_available BOOLEAN,
  source VARCHAR(100),
  source_updated_at TIMESTAMPTZ,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  municipality_jis_code VARCHAR(6) REFERENCES municipalities(jis_code) ON DELETE SET NULL
);

-- インデックス
CREATE INDEX idx_pois_location ON pois USING GIST(location);
CREATE INDEX idx_pois_type ON pois(type);
CREATE INDEX idx_pois_municipality ON pois(municipality_jis_code);
CREATE INDEX idx_municipalities_slugs ON municipalities(prefecture_slug, municipality_slug);
```

**supabase/migrations/002_rls_policies.sql**:
```sql
-- RLSを有効化
ALTER TABLE municipalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE pois ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipality_layer_statuses ENABLE ROW LEVEL SECURITY;

-- 公開市町村の読取ポリシー
CREATE POLICY "Public municipalities are viewable by everyone"
ON municipalities FOR SELECT
USING (is_public = true);

-- 公開市町村に属するPOIの読取ポリシー
CREATE POLICY "POIs in public municipalities are viewable"
ON pois FOR SELECT
USING (
  municipality_jis_code IS NULL
  OR municipality_jis_code IN (
    SELECT jis_code FROM municipalities WHERE is_public = true
  )
);

-- 公開市町村のレイヤー状態の読取ポリシー
CREATE POLICY "Layer statuses in public municipalities are viewable"
ON municipality_layer_statuses FOR SELECT
USING (
  municipality_jis_code IN (
    SELECT jis_code FROM municipalities WHERE is_public = true
  )
);
```

### 5. 環境変数

**.env.local**:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## 既存コードへの影響

- `lib/server/db/connection.ts`: SQLite接続は当面残す（段階的移行）
- `lib/server/poi/POIRepository.ts`: 後続タスクでSupabase対応に置き換え
- `app/api/pois/route.ts`: 後続タスクで更新

## テスト方針

- 型定義の TypeScript コンパイル確認
- Supabase クライアント接続テスト（環境変数設定後）
- RLS ポリシーの動作確認（Supabase Dashboard）
