# 設計書

## アーキテクチャ概要

既存のレイヤードアーキテクチャを維持しつつ、マップ関連コンポーネントを追加する。

```
┌─────────────────────────────────────────┐
│   UIレイヤー                             │
│   ├── TabNavigation                      │
│   ├── ConverterTab (既存)                │
│   └── MapTab (新規)                      │
│       ├── MapView                        │
│       ├── PinMarker                      │
│       └── SlidePanel                     │
├─────────────────────────────────────────┤
│   サービスレイヤー                        │
│   ├── 既存サービス                       │
│   └── ReverseGeocodingService (新規)     │
├─────────────────────────────────────────┤
│   データレイヤー (変更なし)               │
└─────────────────────────────────────────┘
```

## コンポーネント設計

### 1. TabNavigation

**責務**:
- タブの表示とスタイリング
- アクティブタブの状態管理
- タブ切り替えイベントの発火

**実装の要点**:
- 状態管理は親コンポーネント（page.tsx）で行う
- アクセシビリティ: role="tablist", role="tab", aria-selected

### 2. MapTab

**責務**:
- Mapbox GL JSの初期化と管理
- 長押しイベントの検出
- ピン状態とパネル表示状態の管理

**実装の要点**:
- `useRef`でmap instanceを保持
- `useEffect`で初期化と後片付け
- 長押し検出: `mousedown`/`touchstart` + タイマー

### 3. MapView

**責務**:
- Mapboxマップのレンダリング
- マップイベント（長押し）のコールバック

**実装の要点**:
- Mapbox GL JSはクライアントサイドのみで動作
- `'use client'`ディレクティブ必須
- 動的インポートでSSR回避

### 4. SlidePanel

**責務**:
- ボトムシート形式のパネル表示
- 位置情報の表示
- 共有ボタン、コピーボタンの配置

**実装の要点**:
- CSS transition で滑らかなアニメーション
- 既存の ShareButtons, CopyButton を再利用

### 5. ReverseGeocodingService

**責務**:
- 座標から住所への変換
- Mapbox Geocoding APIとの通信

**実装の要点**:
- API Route経由でアクセス（トークン秘匿）
- エラーハンドリング（ネットワーク、API制限）

## データフロー

### 長押し→ピン設置→パネル表示
```
1. ユーザーがマップを長押し（500ms）
2. MapView が onLongPress(lngLat) を発火
3. MapTab が状態を更新:
   - pin: { coordinate: lngLat }
   - isPanelOpen: true
   - isLoadingAddress: true
4. ReverseGeocodingService.reverseGeocode(coord) を呼び出し
5. 住所取得完了後、pin.address を更新
6. DatumTransformer.wgs84ToTokyo(coord) で Tokyo Datum 計算
7. SlidePanel に全情報を表示
```

## エラーハンドリング戦略

### カスタムエラークラス

```typescript
class ReverseGeocodingError extends Error {
  constructor(
    message: string,
    public code: 'NETWORK_ERROR' | 'API_ERROR' | 'NOT_FOUND'
  ) {
    super(message);
    this.name = 'ReverseGeocodingError';
  }
}
```

### エラーハンドリングパターン

- 逆ジオコーディング失敗時: 「住所を取得できませんでした」と表示、座標は表示
- マップ読み込み失敗時: エラーメッセージと再読み込みボタン

## テスト戦略

### ユニットテスト
- ReverseGeocodingService: APIレスポンスのパース
- 座標変換: WGS84 ↔ Tokyo Datum
- SlidePanel: 表示ロジック

### 統合テスト
- 長押し→逆ジオコーディング→表示フロー
- 共有ボタンの動作

### E2Eテスト（将来）
- タブ切り替え
- マップ長押し→パネル表示

## 依存ライブラリ

```json
{
  "dependencies": {
    "mapbox-gl": "^3.0.0"
  },
  "devDependencies": {
    "@types/mapbox-gl": "^3.0.0"
  }
}
```

## ディレクトリ構造

```
components/
├── layout/
│   └── TabNavigation.tsx       (新規)
├── map/
│   ├── MapTab.tsx              (新規)
│   ├── MapView.tsx             (新規)
│   └── SlidePanel.tsx          (新規)
├── input/                      (既存)
├── result/                     (既存)
└── common/                     (既存)

lib/
├── services/
│   ├── ReverseGeocodingService.ts  (新規)
│   └── ...                         (既存)
└── types/
    └── index.ts                    (MapState, PinLocation 追加)

app/
├── page.tsx                    (タブ対応に修正)
└── api/
    └── reverse-geocode/
        └── route.ts            (新規)
```

## 実装の順序

1. Mapboxセットアップ（パッケージ追加、環境変数）
2. タブナビゲーション
3. MapView（基本的なマップ表示）
4. 長押し検出とピン表示
5. 逆ジオコーディングAPI Route
6. ReverseGeocodingService
7. SlidePanel
8. 共有・コピー機能の統合
9. スタイリングと調整
10. テスト

## セキュリティ考慮事項

- Mapbox Access Tokenはクライアントに公開（読み取り専用トークン使用）
- 逆ジオコーディングはAPI Route経由で実行（トークン秘匿は不要だがレート制限対策）

## パフォーマンス考慮事項

- Mapbox GL JSは動的インポート（バンドルサイズ削減）
- マップタイルはMapbox CDNからキャッシュ
- 逆ジオコーディングはデバウンス不要（ユーザーアクション起点）

## 将来の拡張性

- 現在地取得機能の追加
- 複数ピン対応
- 地図スタイル切り替え
- オフラインキャッシュ
