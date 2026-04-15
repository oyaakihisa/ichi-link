-- ============================================================
-- POI RPC Functions
-- ============================================================
-- PostGIS bbox検索をRPC関数として提供
-- Supabase JSクライアントから効率的に呼び出し可能
-- ============================================================

-- ============================================================
-- get_pois_by_bbox: bbox範囲内のPOI一覧を取得
-- ============================================================
-- GISTインデックスを活用した高速なbbox検索
-- ST_Y/ST_Xで緯度経度を数値として返却
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

-- RLSバイパス用のセキュリティ設定（anon/authenticatedから呼び出し可能）
-- 注: poisテーブルにRLSを設定する場合は、この関数にSECURITY DEFINERを追加
GRANT EXECUTE ON FUNCTION get_pois_by_bbox TO anon, authenticated;

-- ============================================================
-- get_poi_detail: 単一POIの詳細情報を取得
-- ============================================================
-- 一覧取得では返さない追加情報を含める
CREATE OR REPLACE FUNCTION get_poi_detail(
  p_id VARCHAR(100)
)
RETURNS TABLE (
  id VARCHAR(100),
  type VARCHAR(20),
  name VARCHAR(200),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address VARCHAR(500),
  detail_text TEXT,
  availability_text VARCHAR(200),
  child_pad_available BOOLEAN,
  source VARCHAR(100),
  source_updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.type,
    p.name,
    ST_Y(p.location)::DOUBLE PRECISION AS latitude,
    ST_X(p.location)::DOUBLE PRECISION AS longitude,
    p.address,
    p.detail_text,
    p.availability_text,
    p.child_pad_available,
    p.source,
    p.source_updated_at
  FROM pois p
  WHERE p.id = p_id;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_poi_detail TO anon, authenticated;
