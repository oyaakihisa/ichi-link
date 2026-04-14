# 設計書

## アーキテクチャ概要

既存のレイヤードアーキテクチャに従い、共有機能を追加する。

```
┌─────────────────────────────────────────┐
│   UIレイヤー                              │
│   └─ ShareButtons (新規コンポーネント)     │
├─────────────────────────────────────────┤
│   サービスレイヤー                         │
│   └─ ShareService (新規サービス)          │
└─────────────────────────────────────────┘
```

## コンポーネント設計

### 1. ShareButtons コンポーネント

**責務**:
- 「LINEで共有」ボタンの表示とクリックハンドリング
- 「共有」ボタンの表示とWeb Share API呼び出し
- Web Share API未対応時の「共有」ボタン非表示制御

**実装の要点**:
- クライアントコンポーネント（'use client'）
- Web Share API対応チェックは`useEffect`でマウント後に行う（SSR対策）
- LINEアイコンは外部リソースを使わずテキストで表現

**Props**:
```typescript
interface ShareButtonsProps {
  coordinate: Coordinate;
  googleMapsUrl: string;
}
```

### 2. ShareService サービス

**責務**:
- LINE Share用のURL生成
- Web Share API用の共有データ生成
- 共有テキストのフォーマット

**実装の要点**:
- 純粋関数として実装（副作用なし）
- URLエンコーディングの適切な処理

**インターフェース**:
```typescript
interface ShareService {
  // LINE共有用のURLを生成
  generateLineShareUrl(text: string): string;

  // 共有用テキストを生成
  generateShareText(coordinate: Coordinate, mapUrl: string): string;

  // Web Share APIが利用可能かどうか
  isWebShareSupported(): boolean;

  // Web Share APIで共有
  shareViaWebShareApi(data: ShareData): Promise<void>;
}
```

## データフロー

### LINEで共有フロー
```
1. ユーザーが「LINEで共有」ボタンをクリック
2. ShareService.generateShareText() で共有テキスト生成
3. ShareService.generateLineShareUrl() でLINE Share URL生成
4. window.open() でLINEアプリ/Webを開く
```

### Web Share APIで共有フロー
```
1. ユーザーが「共有」ボタンをクリック
2. ShareService.generateShareText() で共有テキスト生成
3. navigator.share() を呼び出し
4. OS/ブラウザの共有シートが表示される
```

## エラーハンドリング戦略

### Web Share API

- `navigator.share()`が失敗した場合は静かに失敗（ユーザーがキャンセルした場合含む）
- `AbortError`（ユーザーキャンセル）は無視
- その他のエラーはコンソールにログ出力のみ

### LINE Share

- LINE Share URLは常に動作する（LINE未インストールでもWebブラウザで開く）
- エラーハンドリング不要

## テスト戦略

### ユニットテスト
- `ShareService.generateShareText()` - テキスト生成の正確性
- `ShareService.generateLineShareUrl()` - URL生成とエンコーディング

### 統合テスト
- ShareButtonsコンポーネントのレンダリング
- ボタンクリック時のハンドラー呼び出し

## 依存ライブラリ

新規ライブラリの追加なし。

## ディレクトリ構造

```
lib/
  services/
    ShareService.ts        # 新規
components/
  result/
    ShareButtons.tsx       # 新規
    ConversionResult.tsx   # 修正（ShareButtonsを追加）
__tests__/
  lib/
    services/
      ShareService.test.ts # 新規
```

## 実装の順序

1. ShareServiceの実装とテスト
2. ShareButtonsコンポーネントの実装
3. ConversionResultへのShareButtons統合
4. 動作確認とテスト

## セキュリティ考慮事項

- 共有テキストにユーザー入力を直接含めないため、XSSリスクは低い
- URLエンコーディングを適切に行い、インジェクションを防止

## パフォーマンス考慮事項

- Web Share API対応チェックはマウント時に1回のみ
- LINE Share URLの生成は即時（外部APIコール不要）

## 将来の拡張性

- 他のメッセンジャー（Slack、Teams等）への直接共有ボタン追加が容易
- 共有テンプレートのカスタマイズ機能追加が可能
