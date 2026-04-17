# 修正要求

## 修正対象

- 機能名: 地図のタッチイベント処理
- 関連ファイル: `components/map/MapView.tsx`

## 問題の説明

Androidデバイス（Google Pixel）で地図がフリーズする。iPhoneでは問題なく動作する。

根本原因: `touchmove`イベントハンドラで、`touches`プロパティの存在のみをチェックし、`touches.length > 0`をチェックしていなかった。Android Chromeでは、指が離れる瞬間に`touchmove`が発火し、`touches.length === 0`になるケースがある。

## 現在の動作

```typescript
// 修正前
const point = 'touches' in e.originalEvent
  ? { x: e.originalEvent.touches[0].clientX, y: e.originalEvent.touches[0].clientY }
  : { x: (e.originalEvent as MouseEvent).clientX, y: (e.originalEvent as MouseEvent).clientY };
```

- `touches[0]`が`undefined`になり、`undefined.clientX`でエラー発生
- JavaScriptエラーにより地図がフリーズ

## 期待する動作

- Androidデバイスでも地図操作がフリーズしない
- 長押し検出が正常に動作する
- タッチ終了時のエッジケースを適切にハンドリング

## 修正アプローチ

1. `handleLongPressStart`関数で`touches.length > 0`をチェック
2. `handleMove`関数で`touches.length > 0`をチェック
3. タッチでもマウスでもない場合は早期リターンまたは`clearLongPressTimer()`を呼び出し

## 影響範囲

- `components/map/MapView.tsx`
  - `handleLongPressStart`関数 (270-303行目)
  - `handleMove`関数 (305-339行目)

## 受け入れ条件

- [x] TypeScriptの型チェックがパスする
- [x] Android Chromeで地図がフリーズしない
- [x] iPhoneでの動作に影響がない
- [x] 長押しで座標取得が動作する
- [x] POIのタップが正常に動作する

## テスト計画

1. ローカルでの動作確認: `npm run dev`
2. TypeScript型チェック: `npm run typecheck`
3. Android実機でのテスト（Vercelデプロイ後）
4. Chrome DevToolsでのモバイルエミュレーション

## スコープ外

以下はこの修正では対応しません:

- タッチ・マウスイベントの重複発火対策（今回の問題の副次的原因だが、主原因ではない）
- 他のタッチイベント関連の最適化

## 参照ドキュメント

- `docs/product-requirements.md` - プロダクト要求定義書
- `docs/functional-design.md` - 機能設計書
