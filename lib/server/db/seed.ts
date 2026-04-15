import { insertPOI, clearAllPOIs } from '../poi/POIRepository';
import type { POIType } from '../../types/poi';

interface SeedPOI {
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
}

/**
 * AEDシードデータ（東京駅周辺）
 */
const SEED_AEDS: SeedPOI[] = [
  {
    id: 'aed-001',
    type: 'aed',
    name: '東京駅丸の内北口 AED',
    latitude: 35.6823,
    longitude: 139.7654,
    address: '東京都千代田区丸の内1-9-1',
    availabilityText: '24時間',
    detailText: '改札内コンコース',
    childPadAvailable: true,
    source: 'seed',
    updatedAt: '2026-04-15T00:00:00Z',
  },
  {
    id: 'aed-002',
    type: 'aed',
    name: '新丸ビル1F AED',
    latitude: 35.6825,
    longitude: 139.7645,
    address: '東京都千代田区丸の内1-5-1',
    availabilityText: '7:00-23:00',
    detailText: '1階インフォメーション横',
    childPadAvailable: true,
    source: 'seed',
    updatedAt: '2026-04-15T00:00:00Z',
  },
  {
    id: 'aed-003',
    type: 'aed',
    name: '丸の内オアゾ AED',
    latitude: 35.6833,
    longitude: 139.765,
    address: '東京都千代田区丸の内1-6-4',
    availabilityText: '10:00-21:00',
    detailText: '1階総合案内',
    childPadAvailable: false,
    source: 'seed',
    updatedAt: '2026-04-15T00:00:00Z',
  },
  {
    id: 'aed-004',
    type: 'aed',
    name: 'KITTE丸の内 AED',
    latitude: 35.6795,
    longitude: 139.765,
    address: '東京都千代田区丸の内2-7-2',
    availabilityText: '11:00-21:00',
    detailText: '1階エントランス',
    childPadAvailable: true,
    source: 'seed',
    updatedAt: '2026-04-15T00:00:00Z',
  },
  {
    id: 'aed-005',
    type: 'aed',
    name: '東京中央郵便局 AED',
    latitude: 35.68,
    longitude: 139.7645,
    address: '東京都千代田区丸の内2-7-2',
    availabilityText: '9:00-19:00（平日）',
    detailText: '1階窓口フロア',
    childPadAvailable: false,
    source: 'seed',
    updatedAt: '2026-04-15T00:00:00Z',
  },
];

/**
 * 消火栓シードデータ（東京駅周辺）
 */
const SEED_FIRE_HYDRANTS: SeedPOI[] = [
  {
    id: 'fh-001',
    type: 'fireHydrant',
    name: '消火栓 丸の内1-9',
    latitude: 35.6818,
    longitude: 139.766,
    address: '東京都千代田区丸の内1-9',
    detailText: '地下式単口',
    source: 'seed',
    updatedAt: '2026-04-15T00:00:00Z',
  },
  {
    id: 'fh-002',
    type: 'fireHydrant',
    name: '消火栓 丸の内1-5',
    latitude: 35.6828,
    longitude: 139.764,
    address: '東京都千代田区丸の内1-5',
    detailText: '地下式単口',
    source: 'seed',
    updatedAt: '2026-04-15T00:00:00Z',
  },
  {
    id: 'fh-003',
    type: 'fireHydrant',
    name: '消火栓 丸の内1-6',
    latitude: 35.6835,
    longitude: 139.7655,
    address: '東京都千代田区丸の内1-6',
    detailText: '地上式双口',
    source: 'seed',
    updatedAt: '2026-04-15T00:00:00Z',
  },
  {
    id: 'fh-004',
    type: 'fireHydrant',
    name: '消火栓 丸の内2-7',
    latitude: 35.679,
    longitude: 139.7655,
    address: '東京都千代田区丸の内2-7',
    detailText: '地下式単口',
    source: 'seed',
    updatedAt: '2026-04-15T00:00:00Z',
  },
  {
    id: 'fh-005',
    type: 'fireHydrant',
    name: '消火栓 丸の内2-4',
    latitude: 35.6805,
    longitude: 139.7635,
    address: '東京都千代田区丸の内2-4',
    detailText: '地下式単口',
    source: 'seed',
    updatedAt: '2026-04-15T00:00:00Z',
  },
];

/**
 * すべてのシードデータ
 */
const ALL_SEED_POIS: SeedPOI[] = [...SEED_AEDS, ...SEED_FIRE_HYDRANTS];

/**
 * シードデータを投入する
 */
export function seedDatabase(): void {
  console.log('Clearing existing POI data...');
  clearAllPOIs();

  console.log('Inserting seed data...');
  for (const poi of ALL_SEED_POIS) {
    insertPOI(poi);
    console.log(`  Inserted: ${poi.name}`);
  }

  console.log(`Seed completed. ${ALL_SEED_POIS.length} POIs inserted.`);
}

// スクリプトとして直接実行された場合
if (require.main === module) {
  seedDatabase();
}
