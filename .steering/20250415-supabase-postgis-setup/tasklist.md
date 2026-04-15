# Tasklist: Supabase + PostGIS基盤構築

## タスク一覧

- [x] @supabase/supabase-js と @supabase/ssr パッケージをインストール
- [x] 環境変数テンプレート (.env.example) を作成
- [x] lib/types/database.ts にSupabase用データベース型を定義
- [x] lib/types/municipality.ts に市町村関連型を定義
- [x] lib/server/db/supabase.ts にサーバーサイドSupabaseクライアントを作成
- [x] lib/supabase/client.ts にクライアントサイドSupabaseクライアントを作成
- [x] supabase/migrations/001_initial_schema.sql を作成（PostGIS有効化、テーブル定義）
- [x] supabase/migrations/002_rls_policies.sql を作成（RLSポリシー定義）
- [x] lib/types/index.ts を更新し municipality 型をエクスポート

---

## 申し送り事項

### 実装完了日
2025-04-15

### 実装概要
Supabase + PostGIS の基盤となる型定義、クライアント設定、SQLマイグレーションを作成。
既存のSQLite (`better-sqlite3`) からの移行基盤を整備。

### 作成ファイル一覧
| ファイル | 役割 |
|---------|------|
| `.env.example` | 環境変数テンプレート |
| `lib/types/database.ts` | Supabase用データベース型定義 |
| `lib/types/municipality.ts` | 市町村マスタ・レイヤー状態の型とDB行変換関数 |
| `lib/server/db/supabase.ts` | サーバーサイドSupabaseクライアント |
| `lib/supabase/client.ts` | クライアントサイドSupabaseクライアント |
| `supabase/migrations/001_initial_schema.sql` | テーブル定義（PostGIS有効化、GIST インデックス） |
| `supabase/migrations/002_rls_policies.sql` | RLSポリシー（is_public制御） |

### 計画と実績の差分
計画通り完了。追加作業なし。

### 学んだこと
- Supabase の `@supabase/ssr` パッケージでブラウザクライアントを簡単に作成できる
- PostGIS の `geometry(Point, 4326)` 型は TypeScript では表現が難しく、`unknown` または GeoJSON型のユニオンで対応
- RLSポリシーは `anon` と `authenticated` の両方に定義が必要

### 今後の改善提案
1. **テストコードの追加**
   - `toMunicipality()` / `toMunicipalityLayerStatus()` の変換テスト
   - 環境変数不足時のエラーケーステスト
   - RLSポリシーのE2Eテスト

2. **Supabase CLIによる型定義自動生成**
   - `npx supabase gen types typescript` で database.ts を自動生成
   - 本番環境移行時に検討

3. **location型の明確化**
   - 現在 `unknown` → GeoJSON Point型のユニオンに変更を検討

### 次のステップ
1. **市町村マスタAPI** - MunicipalityRepository、API Routes
2. **市町村ランディングページ** - App Router、generateStaticParams/Metadata
3. **POI API拡張** - bbox検索RPC、POIRepository Supabase対応
