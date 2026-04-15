# タスクリスト: AED / 消火栓レイヤー実装

## フェーズ1: 型定義

### 1.1 POI型定義の作成
- [x] lib/types/poi.ts を新規作成
  - [x] POIType型（aed, fireHydrant, fireCistern）
  - [x] POI基本インターフェース
  - [x] AEDDetail型
  - [x] FireHydrantDetail型
  - [x] LayerVisibility型
  - [x] DEFAULT_LAYER_VISIBILITY定数
  - [x] MapBounds型
- [x] lib/types/index.ts にエクスポート追加

## フェーズ2: POIサービス

### 2.1 POIServiceの作成
- [x] lib/services/POIService.ts を新規作成
  - [x] モックデータ定義（AED 5件、消火栓 5件）
  - [x] getPOIs メソッド
  - [x] getPOIDetail メソッド
  - [x] キャッシュ管理
- [x] lib/services/index.ts にエクスポート追加

## フェーズ3: レイヤー切替UI

### 3.1 LayerToggleコンポーネントの作成
- [x] components/map/LayerToggle.tsx を新規作成
  - [x] Mapbox IControl実装
  - [x] AED/消火栓のトグルUI
  - [x] スタイリング（既存コントロールと統一感）

## フェーズ4: MapView POIレイヤー

### 4.1 MapViewの拡張
- [x] Props拡張（pois, selectedPoiId, layerVisibility, onPoiSelect）
- [x] POI GeoJSONソース追加
- [x] AEDレイヤー追加（赤色）
- [x] 消火栓レイヤー追加（オレンジ色）
- [x] POIクリックハンドラ
- [x] レイヤー表示/非表示制御
- [x] style.load時のレイヤー再追加
- [x] LayerToggleコントロール追加

## フェーズ5: SlidePanel POI対応

### 5.1 SlidePanelの拡張
- [x] selectedPoi Propsを追加
- [x] POIモードの判定ロジック追加
- [x] AED詳細表示UI
- [x] 消火栓詳細表示UI（注記付き）
- [x] Google Mapsリンク
- [x] 共有機能

## フェーズ6: 状態管理・統合

### 6.1 page.tsxの拡張
- [x] selectedPoi状態追加
- [x] layerVisibility状態追加
- [x] pois状態追加
- [x] POIService呼び出し（マップ移動時）
- [x] handlePoiSelect実装
- [x] 排他制御の実装
  - [x] POI選択時にアクティブピンをクリア
  - [x] 検索/長押し時にPOI選択をクリア
- [x] SlidePanel/MapViewへのProps渡し

## フェーズ7: 検証

- [x] TypeScriptエラーがないこと
- [x] ESLintエラーがないこと（警告1件: selectedPoiIdは将来のハイライト機能用）
- [x] AEDレイヤーが表示されること
- [x] 消火栓レイヤーが表示されること
- [x] レイヤー切替が動作すること
- [x] POIタップで詳細パネルが表示されること
- [x] AED詳細が正しく表示されること
- [x] 消火栓詳細が正しく表示されること（注記含む）
- [x] POI選択時にアクティブピンがクリアされること
- [x] 検索/長押し時にPOI選択がクリアされること
- [x] スタイル切替後もPOIレイヤーが維持されること
- [x] モバイルでPOIがタップしやすいこと

## 実装後の振り返り

**実装完了日**: 2026-04-14
**手動テスト完了日**: 2026-04-15

**計画と実績の差分**:
- フェーズ1-6: 計画通り完了
- フェーズ7: 全検証項目完了
  - 警告1件（selectedPoiId未使用）: 将来のPOI選択時ハイライト機能用に残置

**発生したバグと修正**:

| バグ | 原因 | 修正方法 |
|-----|------|---------|
| レイヤー切替時に地図が初期位置にリセットされる | `layerVisibility`がuseEffectの依存配列に含まれており、変更のたびにマップ初期化処理が再実行された | useRefパターンを導入。`poisRef`, `layerVisibilityRef`, `onLayerVisibilityChangeRef`, `onPoiSelectRef`で最新値を保持し、依存配列から動的プロパティを除外 |

**学んだこと**:
- Mapbox GL JSでGeoJSONソース+レイヤーを使うとDOM要素を作らずにPOIを効率的に表示できる
- IControl実装によりMapboxの既存コントロールと統一感のあるUIを追加できる
- style.loadイベントでスタイル変更後のレイヤー再追加が必要
- 排他制御は各ハンドラで明示的にクリア処理を呼ぶことで実現
- **useRefパターン**: Reactでマップ等の外部ライブラリを使う際、頻繁に変わるpropsをuseEffectの依存配列に入れると再初期化が走る問題がある。useRefで最新値を保持し、ハンドラ内で`ref.current`を参照することで、useEffectの再実行を防ぎつつ最新の値にアクセスできる

**次回への改善提案**:
- POI取得のデバウンス処理（マップ移動時の連続呼び出し対策）
- POI選択時のハイライト表示（selectedPoiId活用）
- 実際のAPIエンドポイント接続準備
