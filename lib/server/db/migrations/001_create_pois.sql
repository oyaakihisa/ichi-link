-- POIテーブルの作成
CREATE TABLE IF NOT EXISTS pois (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('aed', 'fireHydrant', 'fireCistern')),
  name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  address TEXT,
  detail_text TEXT,
  availability_text TEXT,
  child_pad_available INTEGER,
  source TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_pois_type ON pois(type);
CREATE INDEX IF NOT EXISTS idx_pois_lat ON pois(latitude);
CREATE INDEX IF NOT EXISTS idx_pois_lng ON pois(longitude);
CREATE INDEX IF NOT EXISTS idx_pois_lat_lng ON pois(latitude, longitude);
