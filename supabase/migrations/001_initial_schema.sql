-- ============================================================
-- Supabase + PostGIS Initial Schema
-- ============================================================
-- This migration creates the core tables for the municipality
-- landing page feature with PostGIS spatial support.
--
-- Tables:
-- - municipalities: 市町村マスタ
-- - municipality_layer_statuses: 市町村別レイヤー状態
-- - pois: POIデータ（PostGIS geometry型）
-- ============================================================

-- PostGIS拡張を有効化（Supabaseでは通常有効済み）
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- municipalities: 市町村マスタテーブル
-- ============================================================
CREATE TABLE municipalities (
  -- 基本情報
  jis_code VARCHAR(6) PRIMARY KEY,  -- 全国地方公共団体コード
  prefecture_slug VARCHAR(50) NOT NULL,  -- URL用都道府県スラッグ
  municipality_slug VARCHAR(50) NOT NULL,  -- URL用市町村スラッグ
  prefecture_name_ja VARCHAR(20) NOT NULL,  -- 都道府県名（日本語）
  municipality_name_ja VARCHAR(50) NOT NULL,  -- 市町村名（日本語）

  -- マップ設定
  center_lat DECIMAL(9,6) NOT NULL,  -- 中心緯度
  center_lng DECIMAL(9,6) NOT NULL,  -- 中心経度
  bbox_north DECIMAL(9,6) NOT NULL,  -- 北端緯度
  bbox_south DECIMAL(9,6) NOT NULL,  -- 南端緯度
  bbox_east DECIMAL(9,6) NOT NULL,   -- 東端経度
  bbox_west DECIMAL(9,6) NOT NULL,   -- 西端経度
  initial_zoom INTEGER DEFAULT 12,    -- 初期ズームレベル

  -- レイヤー設定
  default_layers TEXT[] DEFAULT ARRAY['aed'],  -- 初期表示レイヤー
  available_layers TEXT[] DEFAULT ARRAY['aed', 'fireHydrant'],  -- 利用可能レイヤー

  -- SEO設定
  seo_title VARCHAR(200),       -- ページタイトル
  seo_description TEXT,          -- メタディスクリプション
  seo_h1 VARCHAR(200),          -- H1テキスト

  -- コンテンツ設定
  content_intro_text TEXT,       -- 導入テキスト
  content_caution_text TEXT,     -- 注意事項テキスト

  -- 公開状態 (status.isPublic / status.isIndexed)
  is_public BOOLEAN DEFAULT false,   -- ページ公開可否（RLS制御）
  is_indexed BOOLEAN DEFAULT false,  -- 検索エンジンインデックス可否

  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 制約
  UNIQUE (prefecture_slug, municipality_slug)
);

-- スラッグ検索用インデックス
CREATE INDEX idx_municipalities_slugs ON municipalities(prefecture_slug, municipality_slug);

-- 公開状態フィルタ用インデックス
CREATE INDEX idx_municipalities_public ON municipalities(is_public) WHERE is_public = true;

-- ============================================================
-- municipality_layer_statuses: 市町村別レイヤー状態テーブル
-- ============================================================
-- 動的情報（件数、更新日時）を管理
-- lastImportedAt: アプリDBへの反映日時（ページ上で「最終更新日」として表示）
-- sourceUpdatedAt: 元データの更新日時（参照情報として補足表示）
CREATE TABLE municipality_layer_statuses (
  id SERIAL PRIMARY KEY,
  municipality_jis_code VARCHAR(6) NOT NULL REFERENCES municipalities(jis_code) ON DELETE CASCADE,
  layer_type VARCHAR(20) NOT NULL,  -- 'aed', 'fireHydrant', etc.
  item_count INTEGER DEFAULT 0,      -- POI件数
  last_imported_at TIMESTAMPTZ,      -- 最終インポート日時
  source_updated_at TIMESTAMPTZ,     -- ソース側更新日時
  is_available BOOLEAN DEFAULT true, -- 利用可能状態

  UNIQUE (municipality_jis_code, layer_type)
);

-- 市町村コード検索用インデックス
CREATE INDEX idx_layer_statuses_municipality ON municipality_layer_statuses(municipality_jis_code);

-- ============================================================
-- pois: POIテーブル（PostGIS geometry型）
-- ============================================================
-- geometry(Point, 4326) + GIST インデックスで bbox 検索を高速化
CREATE TABLE pois (
  id VARCHAR(100) PRIMARY KEY,       -- POI一意識別子
  type VARCHAR(20) NOT NULL,         -- 'aed', 'fireHydrant', 'fireCistern'
  name VARCHAR(200) NOT NULL,        -- 名称
  location geometry(Point, 4326) NOT NULL,  -- WGS84座標（PostGIS geometry）
  address VARCHAR(500),              -- 住所
  detail_text TEXT,                  -- 設置場所詳細
  availability_text VARCHAR(200),    -- 利用可能時間
  child_pad_available BOOLEAN,       -- 小児対応パッド有無（AED）
  source VARCHAR(100),               -- データソース
  source_updated_at TIMESTAMPTZ,     -- ソース側更新日時
  imported_at TIMESTAMPTZ DEFAULT NOW(),  -- インポート日時
  municipality_jis_code VARCHAR(6) REFERENCES municipalities(jis_code) ON DELETE SET NULL
);

-- 空間インデックス（GIST）- bbox検索の高速化
CREATE INDEX idx_pois_location ON pois USING GIST(location);

-- タイプ検索用インデックス
CREATE INDEX idx_pois_type ON pois(type);

-- 市町村コード検索用インデックス
CREATE INDEX idx_pois_municipality ON pois(municipality_jis_code);

-- 複合インデックス（タイプ + 市町村）
CREATE INDEX idx_pois_type_municipality ON pois(type, municipality_jis_code);

-- ============================================================
-- updated_at 自動更新トリガー
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_municipalities_updated_at
  BEFORE UPDATE ON municipalities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
