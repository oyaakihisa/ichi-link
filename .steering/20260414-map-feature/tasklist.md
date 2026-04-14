# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

### 実装可能なタスクのみを計画
- 計画段階で「実装可能なタスク」のみをリストアップ
- 「将来やるかもしれないタスク」は含めない
- 「検討中のタスク」は含めない

### タスクスキップが許可される唯一のケース
以下の技術的理由に該当する場合のみスキップ可能:
- 実装方針の変更により、機能自体が不要になった
- アーキテクチャ変更により、別の実装方法に置き換わった
- 依存関係の変更により、タスクが実行不可能になった

スキップ時は必ず理由を明記:
```markdown
- [x] ~~タスク名~~（実装方針変更により不要: 具体的な技術的理由）
```

### タスクが大きすぎる場合
- タスクを小さなサブタスクに分割
- 分割したサブタスクをこのファイルに追加
- サブタスクを1つずつ完了させる

---

## フェーズ1: セットアップ

- [x] Mapboxパッケージをインストール
  - [x] `npm install mapbox-gl`
  - [x] `npm install -D @types/mapbox-gl`

- [x] 環境変数を設定
  - [x] `.env.local` に `NEXT_PUBLIC_MAPBOX_TOKEN` を追加
  - [x] `.env.example` を更新

- [x] 型定義を追加
  - [x] `lib/types/index.ts` に `MapState`, `PinLocation` を追加

## フェーズ2: タブナビゲーション

- [x] TabNavigationコンポーネントを作成
  - [x] `components/layout/TabNavigation.tsx` を作成
  - [x] props: `activeTab`, `onTabChange`, `tabs`
  - [x] アクセシビリティ属性（role, aria-selected）を設定
  - [x] Tailwindでスタイリング（アンダーライン）

- [x] page.tsxをタブ対応に修正
  - [x] タブ状態（`activeTab`）を追加
  - [x] TabNavigationを配置
  - [x] 条件付きレンダリング（変換ツール / マップ）
  - [x] 既存の変換ツールUIをそのまま維持

## フェーズ3: 基本マップ表示

- [x] MapViewコンポーネントを作成
  - [x] `components/map/MapView.tsx` を作成
  - [x] `'use client'`ディレクティブを追加
  - [x] Mapbox GL JSの初期化
  - [x] 日本中心の初期表示（zoom: 5）
  - [x] クリーンアップ処理（useEffect return）

- [x] MapTabコンポーネントを作成
  - [x] `components/map/MapTab.tsx` を作成
  - [x] MapViewを配置
  - [x] フルスクリーン表示のスタイリング

- [x] page.tsxにMapTabを統合
  - [x] マップタブ選択時にMapTabを表示

## フェーズ4: 長押し検出とピン表示

- [x] 長押し検出を実装
  - [x] MapViewに長押しイベントハンドラを追加
  - [x] 500ms後にonLongPressコールバックを発火
  - [x] タッチ対応（touchstart/touchend）

- [x] ピン表示を実装
  - [x] Mapbox Markerでピンを表示
  - [x] ピン位置の状態管理
  - [x] 既存ピンの削除→新規ピン追加

- [x] useMapInteractionフックを作成
  - [x] `components/hooks/useMapInteraction.ts` を作成
  - [x] pin状態、パネル表示状態を管理
  - [x] handleLongPress, closePanel関数

## フェーズ5: 逆ジオコーディング

- [x] API Routeを作成
  - [x] `app/api/reverse-geocode/route.ts` を作成
  - [x] Mapbox Geocoding APIを呼び出し
  - [x] 住所を返却

- [x] ReverseGeocodingServiceを作成
  - [x] `lib/services/ReverseGeocodingService.ts` を作成
  - [x] reverseGeocode(coord) メソッド
  - [x] エラーハンドリング

- [x] ピン設置時に逆ジオコーディングを実行
  - [x] useMapInteractionで呼び出し
  - [x] ローディング状態の管理
  - [x] 住所取得完了後に状態更新

## フェーズ6: スライドパネル

- [x] SlidePanelコンポーネントを作成
  - [x] `components/map/SlidePanel.tsx` を作成
  - [x] ボトムシート形式のUI
  - [x] ドラッグハンドル
  - [x] 開閉アニメーション（CSS transition）

- [x] 位置情報表示を実装
  - [x] 住所表示（ローディング中はスケルトン）
  - [x] WGS84座標表示
  - [x] Tokyo Datum座標表示
  - [x] CopyButtonを再利用

- [x] 共有ボタンを統合
  - [x] ShareButtonsを再利用（props調整）
  - [x] generateShareText, generateLineShareUrl を使用

- [x] パネル閉じる機能
  - [x] 閉じるボタン
  - [x] 外側タップで閉じる（オプション）

## フェーズ7: 品質チェックと修正

- [x] すべてのテストが通ることを確認
  - [x] `npm test`

- [x] リントエラーがないことを確認
  - [x] `npm run lint`

- [x] 型エラーがないことを確認
  - [x] `npx tsc --noEmit`

- [x] ビルドが成功することを確認
  - [x] `npm run build`

- [x] 動作確認
  - [x] タブ切り替えが動作する
  - [x] マップが表示される
  - [x] 長押しでピンが立つ
  - [x] スライドパネルが表示される
  - [x] 住所が取得される
  - [x] 座標が正しく表示される
  - [x] 共有ボタンが動作する
  - [x] コピーボタンが動作する

## フェーズ8: ドキュメント更新

- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-04-14

### 計画と実績の差分

**計画と異なった点**:
- なし。計画通りに実装を完了した。

**新たに必要になったタスク**:
- なし。事前の計画で必要なタスクを網羅できていた。

**技術的理由でスキップしたタスク**:
- なし。すべてのタスクを完了した。

### 学んだこと

**技術的な学び**:
- Mapbox GL JS v3系でのマップ初期化とReact統合パターン
- 長押し検出の実装（タイマー + 移動キャンセル）
- useSyncExternalStoreによるSSRセーフなブラウザAPI検出
- Next.js App Routerでの動的API Route実装
- スライドパネルのアクセシビリティ対応（role="dialog", aria-modal）

**プロセス上の改善点**:
- フェーズ分割により、依存関係を意識した実装順序を維持できた
- 既存コンポーネント（CopyButton, ShareButtons）の再利用パターンを参照して統一感を保てた
- 型定義を先に追加することで、後の実装がスムーズになった

### 次回への改善提案
- マップコンポーネントのテストケース追加を検討（現在はE2Eテストで確認）
- パフォーマンス計測ポイントの追加（マップ読み込み時間、ピン反応時間）
- オフライン対応の検討（ServiceWorkerによるマップタイルキャッシュ）
