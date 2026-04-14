# 技術仕様書 (Architecture Design Document)

## テクノロジースタック

### 言語・ランタイム

| 技術 | バージョン | 選定理由 |
|------|-----------|----------|
| Node.js | v24.11.0 | CLAUDE.mdで指定された環境。LTSによる長期サポート保証 |
| TypeScript | 5.x | 静的型付けによる開発時のバグ検出、座標計算の型安全性確保 |
| npm | 11.x | Node.js v24.11.0標準搭載、package-lock.jsonによる依存関係の厳密管理 |

### フレームワーク・ライブラリ

| 技術 | バージョン | 用途 | 選定理由 |
|------|-----------|------|----------|
| Next.js | 15.x | フルスタックフレームワーク | Vercelとの親和性、App Router、将来のAPI Routes対応 |
| React | 19.x | UIライブラリ | Next.js 15に同梱、Server Components対応 |
| Tailwind CSS | 3.x | スタイリング | ユーティリティファースト、レスポンシブ対応が容易 |
| proj4 | 2.x | 座標変換 | 測地系変換のデファクトスタンダード、WGS84/JGD2011/Tokyo対応 |
| Mapbox GL JS | 3.x | マップ表示 | Zenrinデータ使用による高精度、長押しイベント対応、無料枠あり（25k views/月） |

### 開発ツール

| 技術 | バージョン | 用途 | 選定理由 |
|------|-----------|------|----------|
| Jest | 29.x | テストフレームワーク | Next.js公式サポート、広いエコシステム |
| React Testing Library | 14.x | コンポーネントテスト | ユーザー視点のテスト、Next.js推奨 |
| ESLint | 9.x | リンター | TypeScript対応、Next.js設定同梱 |
| Prettier | 3.x | フォーマッター | コードスタイルの自動統一 |

### デプロイ

| 技術 | 用途 | 選定理由 |
|------|------|----------|
| Vercel | ホスティング | Next.js開発元、自動デプロイ、無料枠あり |

## アーキテクチャパターン

### レイヤードアーキテクチャ

```
┌─────────────────────────────────────────┐
│   UIレイヤー (React Components)          │ ← マップ中心UI、検索バー、スライドパネル
├─────────────────────────────────────────┤
│   サービスレイヤー (Domain Services)      │ ← 座標変換・判定ロジック
├─────────────────────────────────────────┤
│   データレイヤー (Storage)               │ ← 履歴の永続化
└─────────────────────────────────────────┘
```

#### UIレイヤー

**責務**:
- フローティング検索バーの管理（入力タイプ切り替え、検索実行）
- ユーザー入力の受付（テキスト入力、ボタンクリック）
- 入力値のバリデーション（空チェック等）
- 変換結果・警告のスライドパネル表示
- 地図ボタンのレンダリングとクリックハンドリング
- コピー機能の提供
- マップ表示とインタラクション（ズーム、長押しピン、スライドパネル）
- 変換結果による座標へのズーム・ピン配置

**許可される操作**:
- サービスレイヤーの呼び出し
- React状態管理
- ブラウザAPIの利用（クリップボード、window.open、Geolocation）
- Mapbox GL JSの利用

**禁止される操作**:
- データレイヤーへの直接アクセス
- 座標変換ロジックの実装

```typescript
// UIレイヤーの例
const LocationConverter: React.FC = () => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ConversionResult | null>(null);

  const handleConvert = async () => {
    // OK: サービスレイヤーを呼び出す
    const result = await conversionService.convert(input);
    setResult(result);
  };

  // NG: 直接変換ロジックを実装しない
  // const handleConvert = () => {
  //   const lat = parseFloat(input.split(',')[0]); // ❌
  // };
};
```

#### サービスレイヤー

**責務**:
- 入力文字列の種別判定
- 座標形式の変換（度分秒↔十進度）
- 測地系の変換（WGS84↔JGD2011）
- 警告の生成
- 地図URLの生成
- 逆ジオコーディング（座標→住所）
- 共有テキスト・URL生成

**許可される操作**:
- データレイヤーの呼び出し
- 外部ライブラリ（proj4）の利用
- ドメインロジックの実装

**禁止される操作**:
- UIレイヤーへの依存
- React/ブラウザAPIの直接利用

```typescript
// サービスレイヤーの例
class ConversionService {
  convert(input: string): ConversionResult {
    // 入力判定
    const parsed = this.inputParser.parse(input);

    // 座標変換
    const coordinates = this.coordinateConverter.convert(parsed);

    // 警告生成
    const warnings = this.validator.generateWarnings(parsed, coordinates);

    // URL生成
    const mapUrls = this.mapUrlGenerator.generateAll(coordinates.wgs84);

    return { input: parsed, coordinates, warnings, mapUrls };
  }
}
```

#### データレイヤー

**責務**:
- 変換履歴のLocalStorage保存
- 履歴の取得・削除
- ストレージ容量管理

**許可される操作**:
- LocalStorage APIの利用
- JSONのシリアライズ/デシリアライズ

**禁止される操作**:
- ビジネスロジックの実装
- UIコンポーネントへの依存

```typescript
// データレイヤーの例
class HistoryStorage {
  private readonly STORAGE_KEY = 'ichi-link:history';
  private readonly MAX_ITEMS = 50;

  save(result: ConversionResult): void {
    const history = this.load();
    history.unshift({
      id: crypto.randomUUID(),
      ...result,
      createdAt: new Date(),
    });

    // 最大件数を超えたら古いものを削除
    if (history.length > this.MAX_ITEMS) {
      history.splice(this.MAX_ITEMS);
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
  }

  load(): ConversionHistory[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }
}
```

## データ永続化戦略

### ストレージ方式

| データ種別 | ストレージ | フォーマット | 理由 |
|-----------|----------|-------------|------|
| 変換履歴 | LocalStorage | JSON | サーバー不要、個人端末内で完結、プライバシー保護 |
| ユーザー設定 | LocalStorage | JSON | シンプルなキーバリュー形式で十分 |

### 容量管理

- **最大履歴件数**: 50件
- **推定容量**: 1件あたり約500バイト、最大約25KB
- **超過時の処理**: 古い履歴から自動削除（FIFO）

### バックアップ戦略

MVPでは自動バックアップは実装しない。
LocalStorageのデータはブラウザのデータクリア時に削除される旨をUIで明示する。

**将来の拡張**:
- エクスポート機能（JSONダウンロード）
- インポート機能（JSONアップロード）

## パフォーマンス要件

### レスポンスタイム

| 操作 | 目標時間 | 測定方法 |
|------|---------|---------|
| 入力判定 | 50ms以内 | 入力確定から判定結果表示まで |
| 座標変換 | 100ms以内 | 判定完了から変換結果表示まで |
| 地図URL生成 | 10ms以内 | 変換完了からURL生成完了まで |
| 初回ロード | 3秒以内 | ページアクセスから操作可能まで（4G回線） |
| マップ表示（初回） | 3秒以内 | マップタブ選択からマップ描画完了まで |
| マップ表示（2回目以降） | 1秒以内 | タイルキャッシュ使用時 |
| ピン表示 | 100ms以内 | 長押し検出からピン描画完了まで |
| 逆ジオコーディング | 1秒以内 | ピン設置から住所取得完了まで |

### リソース使用量

| リソース | 上限 | 理由 |
|---------|------|------|
| バンドルサイズ | 800KB (gzip) | Mapbox GL JS含むモバイル回線対応 |
| メモリ | 100MB | マップタイル + モバイル端末での安定動作 |
| LocalStorage | 50KB | 履歴50件 + 設定データ |

### 外部API利用量

| API | 無料枠 | 想定使用量 |
|-----|--------|-----------|
| Yahoo!ジオコーダ | 50,000件/日 | MVP期間中は余裕あり |
| Mapbox Maps | 25,000 views/月 | MVP期間中は余裕あり |
| Mapbox Geocoding | 100,000件/月 | 逆ジオコーディング用 |

### 最適化方針

1. **コード分割**: 地図サービス固有のロジックは遅延ロード
2. **proj4の最適化**: 必要な測地系定義のみをインポート
3. **デバウンス**: リアルタイム判定は300msのデバウンス適用

## セキュリティアーキテクチャ

### データ保護

**ローカルデータ**:
- 変換履歴はLocalStorageに保存（端末外に送信しない）
- 個人情報・機密情報の収集なし
- サーバーサイドへのデータ送信なし（MVPでは外部API未使用）

**通信セキュリティ**:
- HTTPS必須（本番環境）
- Mixed Contentの禁止

### 入力検証

**バリデーション**:
```typescript
// 入力値の長さ制限
const MAX_INPUT_LENGTH = 1000;

function validateInput(input: string): void {
  if (!input || input.trim().length === 0) {
    throw new ValidationError('位置情報を入力してください');
  }
  if (input.length > MAX_INPUT_LENGTH) {
    throw new ValidationError('入力が長すぎます');
  }
}
```

**サニタイゼーション**:
```typescript
// URL生成時のパラメータエスケープ
function generateGoogleMapsUrl(lat: number, lng: number): string {
  const encodedLat = encodeURIComponent(lat.toFixed(6));
  const encodedLng = encodeURIComponent(lng.toFixed(6));
  return `https://www.google.com/maps?q=${encodedLat},${encodedLng}`;
}
```

**XSS対策**:
- Reactの自動エスケープ機能を活用
- dangerouslySetInnerHTMLの使用禁止
- ユーザー入力の表示時は必ずテキストノードとして扱う

### エラーハンドリング

- スタックトレースをユーザーに表示しない
- エラーメッセージは日本語で分かりやすく
- 入力値をエラーログに含めない（位置情報保護）

## スケーラビリティ設計

### データ増加への対応

**想定データ量**: 履歴50件（上限固定）

**対策**:
- 履歴件数に上限を設定（50件）
- 古い履歴の自動削除
- 将来的にはアーカイブ機能（エクスポート）を検討

### 機能拡張性

**地図サービスの追加**:
```typescript
// MapUrlGeneratorのプラグイン設計
interface MapService {
  name: string;
  icon: string;
  generateUrl(coord: Coordinate): string;
}

class MapUrlGenerator {
  private services: MapService[] = [];

  register(service: MapService): void {
    this.services.push(service);
  }

  generateAll(coord: Coordinate): Record<string, string> {
    return Object.fromEntries(
      this.services.map(s => [s.name, s.generateUrl(coord)])
    );
  }
}
```

**測地系の追加**:
```typescript
// proj4への定義追加で対応可能
proj4.defs('EPSG:XXXX', '+proj=... +datum=...');
```

**設定のカスタマイズ**:
- デフォルト測地系の変更
- 優先地図サービスの設定
- 履歴保存の有効/無効

## テスト戦略

### ユニットテスト

**フレームワーク**: Jest + React Testing Library

**対象**:
- InputParser: 各入力パターンの判定
- CoordinateConverter: 座標変換の精度
- DatumTransformer: 測地系変換の精度
- ValidationService: 警告生成ロジック
- MapUrlGenerator: URL形式の正確性

**カバレッジ目標**: 80%以上（サービスレイヤー）

```typescript
// テスト例
describe('InputParser', () => {
  it('十進度形式を正しく判定する', () => {
    const result = parser.parse('35.6812, 139.7671');
    expect(result.inputType).toBe('coordinate_decimal');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('度分秒形式を正しく判定する', () => {
    const result = parser.parse('35°40\'52"N 139°46\'2"E');
    expect(result.inputType).toBe('coordinate_dms');
  });
});
```

### 統合テスト

**方法**: Jest + React Testing Libraryでコンポーネント間の連携をテスト

**対象**:
- 入力→判定→変換→URL生成の一連フロー
- 警告表示条件の網羅
- 履歴保存・取得

### E2Eテスト

**ツール**: Playwright

**シナリオ**:
1. 検索バー入力→変換→マップズーム→パネル表示→地図ボタンクリック
2. 曖昧入力→警告表示→確認→地図起動
3. コピーボタン→クリップボード確認
4. レスポンシブUI（モバイル/デスクトップ）
5. フローティング検索バーのドロップダウン切り替え
6. マップ長押し→ピン設置→パネル表示→共有

## 技術的制約

### 環境要件

- **対応ブラウザ**: Chrome 90+, Firefox 90+, Safari 14+, Edge 90+
- **対応デバイス**: デスクトップ、タブレット、スマートフォン
- **最小画面幅**: 320px
- **必要な外部依存**: なし（MVPでは外部API未使用）

### パフォーマンス制約

- LocalStorageの容量上限（5MB）を考慮し、履歴は50件に制限
- モバイル回線でも3秒以内にロード完了

### セキュリティ制約

- 位置情報は端末外に送信しない
- 外部APIを使用する場合はユーザーに明示

## 依存関係管理

| ライブラリ | 用途 | バージョン管理方針 |
|-----------|------|-------------------|
| next | フルスタックフレームワーク | ^15.0.0（メジャー固定） |
| react | UIライブラリ | ^19.0.0（Next.jsと同期） |
| react-dom | React DOM | ^19.0.0（reactと同期） |
| proj4 | 座標変換 | ^2.9.0（メジャー固定） |
| mapbox-gl | マップ表示 | ^3.0.0（メジャー固定） |
| tailwindcss | スタイリング | ^3.0.0（メジャー固定） |
| jest | テスト | ^29.0.0（メジャー固定） |
| @testing-library/react | コンポーネントテスト | ^14.0.0（メジャー固定） |
| typescript | 言語 | ~5.3.0（マイナー固定） |
| eslint | リンター | ^9.0.0（メジャー固定） |
| prettier | フォーマッター | ^3.0.0（メジャー固定） |

**更新方針**:
- セキュリティパッチは即座に適用
- マイナーバージョンは月次で確認・更新
- メジャーバージョンは破壊的変更を確認してから計画的に更新

## デプロイ戦略

### Vercelへのデプロイ

**自動デプロイフロー**:
```
GitHub Push → Vercel Build → Preview/Production Deploy
```

**環境**:
- **Production**: mainブランチへのマージで自動デプロイ
- **Preview**: PRごとにプレビュー環境を自動生成

**設定**:
```json
// vercel.json（必要な場合のみ）
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next"
}
```

**環境変数**:
- Vercelダッシュボードで設定
- 本番/プレビュー環境で分離可能

**必要な環境変数**:
| 変数名 | 用途 | 公開設定 |
|--------|------|----------|
| YAHOO_CLIENT_ID | Yahoo!ジオコーダAPI認証 | サーバーサイドのみ |
| NEXT_PUBLIC_MAPBOX_TOKEN | Mapbox GL JS認証 | クライアント公開（`NEXT_PUBLIC_`プレフィックス） |

**無料枠の範囲**:
- 帯域: 100GB/月
- ビルド時間: 6000分/月
- サーバーレス関数: 100GB-時間/月
