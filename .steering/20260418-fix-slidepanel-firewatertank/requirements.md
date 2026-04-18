# 修正要求

## 修正対象

- 機能名: POIレイヤー表示（防火水槽対応）
- 関連ファイル:
  - `lib/types/poi.ts`
  - `components/map/MapView.tsx`
  - `components/map/LayerToggle.tsx`
  - `app/page.tsx`

## 問題の説明

SlidePanelでは防火水槽（fireCistern）のバッジ定義が存在するが、地図上のレイヤーとして表示されておらず、レイヤー切り替えコントロールにも防火水槽のトグルがない。

## 現在の動作

- SlidePanelに防火水槽のバッジ定義はある（SlidePanel.tsx:82-87）
- POITypeに`fireCistern`は定義されている（poi.ts:6）
- しかし`LayerVisibility`には`aed`と`fireHydrant`のみ
- MapViewには防火水槽用のレイヤー定義がない
- LayerToggleには防火水槽のトグルがない
- app/page.tsxのhandleMoveEndでは`aed`と`fireHydrant`のみ取得

## 期待する動作

- 防火水槽がAED・消火栓と同様に地図上にレイヤーとして表示される
- レイヤー切り替えコントロールで防火水槽のON/OFF切り替えができる
- 防火水槽をクリックするとSlidePanelで詳細が表示される

## 修正アプローチ

1. `LayerVisibility`インターフェースに`fireCistern: boolean`を追加
2. `DEFAULT_LAYER_VISIBILITY`に`fireCistern: false`を追加（デフォルトOFF）
3. MapViewに防火水槽用レイヤー（青色）を追加
4. LayerToggleに防火水槽のトグル行を追加
5. app/page.tsxのhandleMoveEndで`fireCistern`を追加

## 影響範囲

- `lib/types/poi.ts` - LayerVisibility型の変更
- `components/map/MapView.tsx` - レイヤー追加
- `components/map/LayerToggle.tsx` - トグルUI追加
- `app/page.tsx` - POI取得ロジック
- テストファイル（型の変更に伴う）

## 受け入れ条件

- [x] 防火水槽がレイヤー切り替えコントロールに表示される
- [x] 防火水槽レイヤーをONにすると地図上に青色の円で表示される
- [x] 防火水槽をクリックするとSlidePanelで詳細が表示される
- [x] 既存のAED・消火栓レイヤーは影響を受けない
- [x] TypeScript型エラーがない
- [x] 既存テストが通る

## テスト計画

1. `npm run typecheck` - 型エラーがないこと
2. `npm run lint` - リントエラーがないこと
3. `npm test` - 既存テストが通ること
4. 手動確認:
   - レイヤー切り替えコントロールに防火水槽トグルが表示される
   - 防火水槽をONにすると地図に表示される
   - 防火水槽をクリックするとSlidePanelが開く

## スコープ外

以下はこの修正では対応しません:

- 防火水槽のデータ投入（CSVインポートは別タスクで実施済み前提）
- 防火水槽固有の詳細情報表示の追加
- 市町村ページでの防火水槽対応

## 参照ドキュメント

- `docs/product-requirements.md` - プロダクト要求定義書
- `docs/functional-design.md` - 機能設計書
