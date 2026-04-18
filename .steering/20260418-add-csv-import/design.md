# 設計書

## アーキテクチャ概要

CLIスクリプトがCSVを読み込み、Supabaseに直接INSERTするシンプルな構成。

```
CSV File (data/source/{pref}/{muni}/pois.csv)
    │
    ▼
scripts/import-pois.ts
    │
    ├─ Parse CSV (csv-parse)
    ├─ Transform columns
    ├─ Calculate bbox
    │
    ▼
Supabase (service_role)
    │
    ├─ municipalities (upsert)
    └─ pois (upsert)
```

## コンポーネント設計

### 1. import-pois.ts

**責務**:
- コマンドライン引数の解析
- CSV読み込みとパース
- データ変換（カラムマッピング）
- Supabaseへの一括INSERT

**実装の要点**:
- `csv-parse` ライブラリでCSVパース
- `@supabase/supabase-js` でDB操作
- service_role キーで RLS バイパス
- バッチサイズ500件でINSERT（大量データ対応）

### 2. カラムマッピング

**入力CSV構造**:
```csv
_id,全国地方公共団体コード,ID,地方公共団体名,種別,町字ID,所在地_都道府県,所在地_市区町村,所在地_町字,所在地_番地以下,建物名等(方書),緯度,経度,口径(管径ｍｍ),備考
```

**変換ルール**:
| CSVカラム | pois カラム | 変換ロジック |
|-----------|-------------|--------------|
| ID | id | `fireHydrant-{ID}` または `fireCistern-{ID}` |
| 種別 | type | 消火栓→'fireHydrant', 防火水槽→'fireCistern' |
| 種別 + 所在地_町字 | name | 「消火栓（河井町小峰山）」形式 |
| 緯度, 経度 | location | `POINT(経度 緯度)` WKT形式 |
| 所在地_* | address | 都道府県+市区町村+町字+番地以下を結合 |
| 口径(管径ｍｍ) | detail_text | 「口径: XXmm」形式 |
| 全国地方公共団体コード | municipality_jis_code | そのまま |

## データフロー

### インポート処理
```
1. コマンドライン引数から prefecture, municipality を取得
2. data/source/{prefecture}/{municipality}/pois.csv を読み込み
3. CSVヘッダーを解析
4. 各行をPOIレコードに変換
5. 緯度経度からbboxを計算
6. municipalities テーブルに市町村をupsert
7. pois テーブルにPOIを一括upsert (500件/バッチ)
8. 結果サマリを出力
```

## エラーハンドリング戦略

- CSVファイルが存在しない → エラーメッセージを出力して終了
- 必須カラムが欠損 → 該当行をスキップしてログ出力
- Supabase接続エラー → リトライなしでエラー終了
- 重複ID → ON CONFLICT DO UPDATE で上書き

## テスト戦略

### 手動テスト
1. `npx tsx scripts/import-pois.ts --prefecture=ishikawa --municipality=wajima` 実行
2. Supabase Dashboard でデータ確認
3. アプリで `/ishikawa/wajima` ページ表示確認
4. マップ上のPOI表示確認

## 依存ライブラリ

```json
{
  "dependencies": {
    "csv-parse": "^5.x"
  }
}
```

## ディレクトリ構造

```
scripts/
└── import-pois.ts          # 新規作成

data/
├── source/
│   └── ishikawa/
│       └── wajima/
│           └── pois.csv    # 配置済み
└── README.md               # 新規作成（フォーマット仕様）
```

## 実装の順序

1. csv-parse ライブラリインストール
2. scripts/import-pois.ts 実装
3. 動作確認（インポート実行）
4. アプリで表示確認

## セキュリティ考慮事項

- service_role キーは `.env.local` で管理（gitignore済み）
- スクリプトはローカル実行のみ（Webからは実行不可）

## パフォーマンス考慮事項

- 500件/バッチでINSERT（メモリ効率）
- 1,396件なら3バッチで完了
