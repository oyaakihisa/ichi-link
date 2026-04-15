import { getDatabase, runMigrations } from '../db/connection';
import type { POIType, MapBounds } from '../../types/poi';

/**
 * POI一覧取得用の最小限フィールド（パネル初期表示用）
 */
export interface POIListItem {
  id: string;
  type: POIType;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
}

/**
 * POI詳細取得用の全フィールド
 */
export interface POIDetailRow {
  id: string;
  type: POIType;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  detailText?: string;
  availabilityText?: string;
  childPadAvailable?: boolean;
  source: string;
  updatedAt?: string;
}

/**
 * データベースから取得した行の型
 */
interface DBRow {
  id: string;
  type: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  detail_text: string | null;
  availability_text: string | null;
  child_pad_available: number | null;
  source: string;
  updated_at: string;
}

let initialized = false;

/**
 * データベースを初期化する
 */
function ensureInitialized(): void {
  if (!initialized) {
    runMigrations();
    initialized = true;
  }
}

/**
 * bbox範囲でPOI一覧を取得する
 * @param bounds 表示範囲
 * @param types 取得するPOI種別（指定なしの場合は全種別）
 * @returns POI一覧（最小限フィールド）
 */
export function findByBbox(bounds: MapBounds, types?: POIType[]): POIListItem[] {
  ensureInitialized();
  const db = getDatabase();

  let sql = `
    SELECT id, type, name, latitude, longitude, address
    FROM pois
    WHERE latitude BETWEEN ? AND ?
      AND longitude BETWEEN ? AND ?
  `;

  const params: (string | number)[] = [bounds.south, bounds.north, bounds.west, bounds.east];

  if (types && types.length > 0) {
    const placeholders = types.map(() => '?').join(', ');
    sql += ` AND type IN (${placeholders})`;
    params.push(...types);
  }

  const rows = db.prepare(sql).all(...params) as Array<{
    id: string;
    type: string;
    name: string;
    latitude: number;
    longitude: number;
    address: string | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    type: row.type as POIType,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address ?? undefined,
  }));
}

/**
 * IDでPOI詳細を取得する
 * @param id POI ID
 * @returns POI詳細（全フィールド）、見つからない場合はnull
 */
export function findById(id: string): POIDetailRow | null {
  ensureInitialized();
  const db = getDatabase();

  const row = db
    .prepare(
      `
    SELECT id, type, name, latitude, longitude, address,
           detail_text, availability_text, child_pad_available,
           source, updated_at
    FROM pois
    WHERE id = ?
  `
    )
    .get(id) as DBRow | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    type: row.type as POIType,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address ?? undefined,
    detailText: row.detail_text ?? undefined,
    availabilityText: row.availability_text ?? undefined,
    childPadAvailable: row.child_pad_available === 1 ? true : row.child_pad_available === 0 ? false : undefined,
    source: row.source,
    updatedAt: row.updated_at,
  };
}

/**
 * POIを挿入する（シード用）
 */
export function insertPOI(poi: {
  id: string;
  type: POIType;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  detailText?: string;
  availabilityText?: string;
  childPadAvailable?: boolean;
  source: string;
  updatedAt: string;
}): void {
  ensureInitialized();
  const db = getDatabase();

  db.prepare(
    `
    INSERT OR REPLACE INTO pois (
      id, type, name, latitude, longitude, address,
      detail_text, availability_text, child_pad_available,
      source, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    poi.id,
    poi.type,
    poi.name,
    poi.latitude,
    poi.longitude,
    poi.address ?? null,
    poi.detailText ?? null,
    poi.availabilityText ?? null,
    poi.childPadAvailable === undefined ? null : poi.childPadAvailable ? 1 : 0,
    poi.source,
    poi.updatedAt
  );
}

/**
 * 全POIを削除する（シード用）
 */
export function clearAllPOIs(): void {
  ensureInitialized();
  const db = getDatabase();
  db.prepare('DELETE FROM pois').run();
}
