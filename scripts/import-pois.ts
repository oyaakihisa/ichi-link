/**
 * POI データインポートスクリプト
 *
 * CSVファイルからPOIデータを読み込み、Supabaseにインポートする。
 *
 * 使用例:
 *   npx tsx scripts/import-pois.ts --prefecture=ishikawa --municipality=wajima
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/types/database';

// 環境変数の読み込み（.env.localから）
import { config } from 'dotenv';
config({ path: '.env.local' });

// 型定義
interface CSVRow {
  _id: string;
  全国地方公共団体コード: string;
  ID: string;
  地方公共団体名: string;
  種別: string;
  町字ID: string;
  '所在地_都道府県': string;
  '所在地_市区町村': string;
  '所在地_町字': string;
  '所在地_番地以下': string;
  '建物名等(方書)': string;
  緯度: string;
  経度: string;
  '口径(管径ｍｍ)': string;
  備考: string;
}

interface POIRecord {
  id: string;
  type: 'fireHydrant' | 'fireCistern' | 'aed';
  name: string;
  location: string; // WKT形式
  address: string;
  detail_text: string | null;
  municipality_jis_code: string;
  source: string;
  imported_at: string;
}

interface BBox {
  north: number;
  south: number;
  east: number;
  west: number;
  centerLat: number;
  centerLng: number;
}

// コマンドライン引数のパース
function parseArgs(): { prefecture: string; municipality: string } {
  const args = process.argv.slice(2);
  let prefecture = '';
  let municipality = '';

  for (const arg of args) {
    if (arg.startsWith('--prefecture=')) {
      prefecture = arg.split('=')[1];
    } else if (arg.startsWith('--municipality=')) {
      municipality = arg.split('=')[1];
    }
  }

  if (!prefecture || !municipality) {
    console.error('Usage: npx tsx scripts/import-pois.ts --prefecture=<slug> --municipality=<slug>');
    console.error('Example: npx tsx scripts/import-pois.ts --prefecture=ishikawa --municipality=wajima');
    process.exit(1);
  }

  return { prefecture, municipality };
}

// 種別をPOIタイプに変換
function convertType(shubetsu: string): 'fireHydrant' | 'fireCistern' | 'aed' {
  switch (shubetsu) {
    case '消火栓':
      return 'fireHydrant';
    case '防火水槽':
    case '防火水そう': // 表記ゆれ対応
      return 'fireCistern';
    case 'AED':
      return 'aed';
    default:
      console.warn(`Unknown type: ${shubetsu}, defaulting to fireHydrant`);
      return 'fireHydrant';
  }
}

// 住所を結合
function buildAddress(row: CSVRow): string {
  const parts = [
    row['所在地_都道府県'],
    row['所在地_市区町村'],
    row['所在地_町字'],
    row['所在地_番地以下'],
    row['建物名等(方書)'],
  ].filter(Boolean);
  return parts.join('');
}

// 名称を生成（種別 + 町字）
function buildName(row: CSVRow): string {
  const shubetsu = row.種別;
  const choaza = row['所在地_町字'] || '';
  // 括弧を外した町字名を使用
  const cleanChoaza = choaza.replace(/[（）()]/g, '');
  return `${shubetsu}（${cleanChoaza}）`;
}

// 詳細テキストを生成
function buildDetailText(row: CSVRow): string | null {
  const parts: string[] = [];

  if (row['口径(管径ｍｍ)']) {
    parts.push(`口径: ${row['口径(管径ｍｍ)']}mm`);
  }
  if (row.備考) {
    parts.push(row.備考);
  }

  return parts.length > 0 ? parts.join('\n') : null;
}

// CSVをパースしてPOIレコードに変換
function parseCSV(csvPath: string): { pois: POIRecord[]; bbox: BBox; jisCode: string; prefectureName: string; municipalityName: string } {
  const content = fs.readFileSync(csvPath, 'utf-8');
  // BOMを除去し、CRLFをLFに統一
  const cleanContent = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const records: CSVRow[] = parse(cleanContent, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true, // クォートを緩和
    ltrim: true,
    rtrim: true,
  });

  if (records.length === 0) {
    throw new Error('CSV file is empty');
  }

  const pois: POIRecord[] = [];
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  const jisCode = records[0].全国地方公共団体コード;
  const prefectureName = records[0]['所在地_都道府県'];
  const municipalityName = records[0]['所在地_市区町村'];
  const now = new Date().toISOString();

  for (const row of records) {
    const lat = parseFloat(row.緯度);
    const lng = parseFloat(row.経度);

    if (isNaN(lat) || isNaN(lng)) {
      console.warn(`Skipping row with invalid coordinates: ID=${row.ID}`);
      continue;
    }

    // bbox計算
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);

    const type = convertType(row.種別);

    pois.push({
      id: `${type}-${row.ID}`,
      type,
      name: buildName(row),
      location: `POINT(${lng} ${lat})`, // WKT形式（経度, 緯度の順）
      address: buildAddress(row),
      detail_text: buildDetailText(row),
      municipality_jis_code: jisCode,
      source: 'オープンデータ',
      imported_at: now,
    });
  }

  // bboxに少しマージンを追加（約500m）
  const margin = 0.005;
  const bbox: BBox = {
    north: maxLat + margin,
    south: minLat - margin,
    east: maxLng + margin,
    west: minLng - margin,
    centerLat: (maxLat + minLat) / 2,
    centerLng: (maxLng + minLng) / 2,
  };

  return { pois, bbox, jisCode, prefectureName, municipalityName };
}

// Supabaseクライアント型
type SupabaseClient = ReturnType<typeof createClient<Database>>;

// Supabaseクライアントの作成
function createSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error('Error: Missing Supabase environment variables');
    console.error('Required: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// 市町村マスタをupsert
async function upsertMunicipality(
  supabase: SupabaseClient,
  jisCode: string,
  prefectureSlug: string,
  municipalitySlug: string,
  prefectureName: string,
  municipalityName: string,
  bbox: BBox
) {
  const municipalityData: Database['public']['Tables']['municipalities']['Insert'] = {
    jis_code: jisCode,
    prefecture_slug: prefectureSlug,
    municipality_slug: municipalitySlug,
    prefecture_name_ja: prefectureName,
    municipality_name_ja: municipalityName,
    center_lat: bbox.centerLat,
    center_lng: bbox.centerLng,
    bbox_north: bbox.north,
    bbox_south: bbox.south,
    bbox_east: bbox.east,
    bbox_west: bbox.west,
    initial_zoom: 13,
    default_layers: ['fireHydrant'],
    available_layers: ['fireHydrant', 'fireCistern'],
    is_public: true,
    is_indexed: false,
  };

  const { error } = await supabase
    .from('municipalities')
    .upsert(municipalityData, { onConflict: 'jis_code' });

  if (error) {
    throw new Error(`Failed to upsert municipality: ${error.message}`);
  }

  console.log(`✓ Municipality upserted: ${prefectureName}${municipalityName} (${jisCode})`);
}

// POIデータをバッチでupsert
async function upsertPOIs(
  supabase: SupabaseClient,
  pois: POIRecord[],
  batchSize = 500
) {
  let insertedCount = 0;

  for (let i = 0; i < pois.length; i += batchSize) {
    const batch: Database['public']['Tables']['pois']['Insert'][] = pois
      .slice(i, i + batchSize)
      .map((poi) => ({
        id: poi.id,
        type: poi.type,
        name: poi.name,
        location: poi.location,
        address: poi.address,
        detail_text: poi.detail_text,
        municipality_jis_code: poi.municipality_jis_code,
        source: poi.source,
        imported_at: poi.imported_at,
      }));

    const { error } = await supabase
      .from('pois')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      throw new Error(`Failed to upsert POIs (batch ${Math.floor(i / batchSize) + 1}): ${error.message}`);
    }

    insertedCount += batch.length;
    console.log(`  Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} POIs upserted (${insertedCount}/${pois.length})`);
  }

  return insertedCount;
}

// レイヤー状態を更新
async function updateLayerStatus(
  supabase: SupabaseClient,
  jisCode: string,
  poiCounts: Record<string, number>
) {
  for (const [layerType, count] of Object.entries(poiCounts)) {
    const layerData: Database['public']['Tables']['municipality_layer_statuses']['Insert'] = {
      municipality_jis_code: jisCode,
      layer_type: layerType,
      item_count: count,
      last_imported_at: new Date().toISOString(),
      is_available: true,
    };

    const { error } = await supabase
      .from('municipality_layer_statuses')
      .upsert(layerData, { onConflict: 'municipality_jis_code,layer_type' });

    if (error) {
      console.warn(`Warning: Failed to update layer status for ${layerType}: ${error.message}`);
    }
  }
}

// メイン処理
async function main() {
  console.log('=== POI Import Script ===\n');

  const { prefecture, municipality } = parseArgs();
  const csvPath = path.join(process.cwd(), 'data', 'source', prefecture, municipality, 'pois.csv');

  // CSVファイルの存在確認
  if (!fs.existsSync(csvPath)) {
    console.error(`Error: CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  console.log(`Reading CSV: ${csvPath}`);
  const { pois, bbox, jisCode, prefectureName, municipalityName } = parseCSV(csvPath);
  console.log(`Found ${pois.length} POIs\n`);

  // POIタイプ別の件数をカウント
  const poiCounts: Record<string, number> = {};
  for (const poi of pois) {
    poiCounts[poi.type] = (poiCounts[poi.type] || 0) + 1;
  }
  console.log('POI counts by type:');
  for (const [type, count] of Object.entries(poiCounts)) {
    console.log(`  ${type}: ${count}`);
  }
  console.log('');

  // Supabaseに接続
  const supabase = createSupabaseClient();
  console.log('Connected to Supabase\n');

  // 市町村マスタをupsert
  await upsertMunicipality(supabase, jisCode, prefecture, municipality, prefectureName, municipalityName, bbox);

  // POIをバッチでupsert
  console.log('\nUpserting POIs...');
  const insertedCount = await upsertPOIs(supabase, pois);

  // レイヤー状態を更新
  console.log('\nUpdating layer status...');
  await updateLayerStatus(supabase, jisCode, poiCounts);

  console.log(`\n=== Import Complete ===`);
  console.log(`Total POIs imported: ${insertedCount}`);
  console.log(`Municipality: ${prefectureName}${municipalityName}`);
  console.log(`BBox: N${bbox.north.toFixed(4)}, S${bbox.south.toFixed(4)}, E${bbox.east.toFixed(4)}, W${bbox.west.toFixed(4)}`);
}

main().catch((error) => {
  console.error('Import failed:', error);
  process.exit(1);
});
