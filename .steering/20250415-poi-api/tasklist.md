# Tasklist: POI API拡張

## タスク一覧

- [x] supabase/migrations/003_poi_rpc.sql を作成（bbox検索RPC関数）
- [x] lib/types/database.ts に get_pois_by_bbox の型定義を追加
- [x] lib/server/poi/SupabasePOIRepository.ts を実装
- [x] lib/server/poi/index.ts でエクスポート切り替えを実装
- [x] app/api/pois/route.ts を Supabase版に対応
- [x] app/api/pois/[id]/route.ts を Supabase版に対応

---

## 振り返り

### 実装完了日
2025-04-15

### 計画と実績の差分

**計画通り実装できた点:**
- PostGIS RPC関数によるbbox検索の実装
- Supabase版とSQLite版のリポジトリ切り替え機構
- API Routeの非同期対応

**追加で対応が必要だった点:**
- Supabase TypeScript SDKのRPC型推論問題
  - `rpc()` メソッドがカスタムFunctions型を正しく推論しない
  - `as any` + 明示的戻り値型キャストで回避
- 動的インポートへの変換
  - `require()` はESLintで警告されるため `import()` に変更
  - 遅延初期化パターンで実装

### 学んだこと

1. **Supabase RPCの型推論制限**: database.tsにFunctions型を定義しても、`rpc()` メソッドはこれを自動的に推論しない場合がある。`as any` キャストと明示的な戻り値型アサーションが安全な回避策。

2. **動的インポートと遅延初期化**: 環境変数で切り替えるリポジトリパターンでは、`require()` ではなく `import()` + モジュールキャッシュ変数の組み合わせが推奨される。

3. **geometry vs geography**: PostGISではgeometry(Point, 4326)が一般的な地図表示用途に適している。距離計算が必要な場合のみgeography型にキャストすべき。

### 次回への改善提案

1. **Supabase CLI型生成の活用**: `npx supabase gen types typescript` でdatabase.tsを自動生成すれば、RPC関数の型もより正確になる可能性がある。

2. **統合テストの追加**: Supabase版POIリポジトリの実際のRPC呼び出しをテストするE2Eテストがあると、型の問題を早期に検出できる。

3. **エラーハンドリングの統一**: 現在はconsole.errorで出力しているが、より構造化されたエラーログ（例: Sentry統合）を検討すべき。
