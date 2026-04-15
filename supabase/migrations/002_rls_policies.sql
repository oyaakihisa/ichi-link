-- ============================================================
-- RLS (Row Level Security) Policies
-- ============================================================
-- This migration sets up RLS policies for public data access.
--
-- Policy Design:
-- - anon role: Read-only access to public data
-- - service_role: Full CRUD access (bypasses RLS)
--
-- isPublic / isIndexed Control:
-- | isPublic | isIndexed | Behavior                              |
-- |----------|-----------|---------------------------------------|
-- | false    | -         | RLS blocks access, returns 404        |
-- | true     | false     | Accessible but noindex meta tag       |
-- | true     | true      | Fully public, included in sitemap     |
-- ============================================================

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
ALTER TABLE municipalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipality_layer_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pois ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- municipalities: 市町村マスタのRLSポリシー
-- ============================================================
-- 公開市町村のみ読み取り可能
CREATE POLICY "Public municipalities are viewable by everyone"
ON municipalities
FOR SELECT
TO anon
USING (is_public = true);

-- authenticated ユーザーも同様（将来の管理機能用）
CREATE POLICY "Public municipalities are viewable by authenticated users"
ON municipalities
FOR SELECT
TO authenticated
USING (is_public = true);

-- ============================================================
-- municipality_layer_statuses: レイヤー状態のRLSポリシー
-- ============================================================
-- 公開市町村に属するレイヤー状態のみ読み取り可能
CREATE POLICY "Layer statuses in public municipalities are viewable"
ON municipality_layer_statuses
FOR SELECT
TO anon
USING (
  municipality_jis_code IN (
    SELECT jis_code FROM municipalities WHERE is_public = true
  )
);

CREATE POLICY "Layer statuses in public municipalities are viewable by authenticated"
ON municipality_layer_statuses
FOR SELECT
TO authenticated
USING (
  municipality_jis_code IN (
    SELECT jis_code FROM municipalities WHERE is_public = true
  )
);

-- ============================================================
-- pois: POIデータのRLSポリシー
-- ============================================================
-- 公開市町村に属するPOIのみ読み取り可能
-- municipality_jis_code が NULL の場合も許可（市町村未割当のPOI）
CREATE POLICY "POIs in public municipalities are viewable"
ON pois
FOR SELECT
TO anon
USING (
  municipality_jis_code IS NULL
  OR municipality_jis_code IN (
    SELECT jis_code FROM municipalities WHERE is_public = true
  )
);

CREATE POLICY "POIs in public municipalities are viewable by authenticated"
ON pois
FOR SELECT
TO authenticated
USING (
  municipality_jis_code IS NULL
  OR municipality_jis_code IN (
    SELECT jis_code FROM municipalities WHERE is_public = true
  )
);

-- ============================================================
-- GRANT statements
-- ============================================================
-- anon: 読み取りのみ
GRANT SELECT ON municipalities TO anon;
GRANT SELECT ON municipality_layer_statuses TO anon;
GRANT SELECT ON pois TO anon;

-- authenticated: 読み取りのみ（将来の管理機能で拡張可能）
GRANT SELECT ON municipalities TO authenticated;
GRANT SELECT ON municipality_layer_statuses TO authenticated;
GRANT SELECT ON pois TO authenticated;

-- service_role: フルアクセス（バッチ処理用）
-- Note: service_role は RLS をバイパスするため、GRANT は参考
GRANT ALL ON municipalities TO service_role;
GRANT ALL ON municipality_layer_statuses TO service_role;
GRANT ALL ON pois TO service_role;
GRANT USAGE, SELECT ON SEQUENCE municipality_layer_statuses_id_seq TO service_role;
