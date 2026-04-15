import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'pois.db');

let db: Database.Database | null = null;

/**
 * SQLiteデータベース接続を取得する（シングルトン）
 */
export function getDatabase(): Database.Database {
  if (db) {
    return db;
  }

  // dataディレクトリが存在しない場合は作成
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(DB_PATH);

  // WALモードを有効化（パフォーマンス向上）
  db.pragma('journal_mode = WAL');

  return db;
}

/**
 * データベース接続を閉じる
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * マイグレーションを実行する
 */
export function runMigrations(): void {
  const database = getDatabase();

  // マイグレーション管理テーブルを作成
  database.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // マイグレーションファイルを読み込んで実行
  const migrationsDir = path.join(process.cwd(), 'lib/server/db/migrations');

  if (!fs.existsSync(migrationsDir)) {
    return;
  }

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const migrationName = file.replace('.sql', '');

    // すでに適用済みかチェック
    const applied = database
      .prepare('SELECT 1 FROM migrations WHERE name = ?')
      .get(migrationName);

    if (applied) {
      continue;
    }

    // マイグレーションを実行
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    database.exec(sql);

    // 適用済みとして記録
    database.prepare('INSERT INTO migrations (name) VALUES (?)').run(migrationName);

    console.log(`Migration applied: ${migrationName}`);
  }
}
