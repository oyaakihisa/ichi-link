# 設計書

## アーキテクチャ概要

既存の`MapView.tsx`のタッチイベント処理にマルチタッチ判定を追加する軽微な修正。

```
タッチイベント
    │
    ▼
touchstart/touchmove
    │
    ├─ touches.length > 1 → clearLongPressTimer() → return
    │
    └─ touches.length == 1 → 既存ロジック継続
```

## コンポーネント設計

### 1. handleLongPressStart (修正)

**現在の実装**:
- `touches.length > 0`のみチェック
- マルチタッチでもタイマーを開始してしまう

**修正後**:
- `touches.length > 1`でタイマーをキャンセルしてreturn
- シングルタッチの場合のみタイマーを開始

**実装の要点**:
- 条件分岐を追加（`touches.length > 1`のチェック）
- 早期リターンでマルチタッチを除外

### 2. handleMove (修正)

**現在の実装**:
- `touches.length > 0`のみチェック
- マルチタッチ中も移動距離のみでキャンセル判定

**修正後**:
- `touches.length > 1`で即座にタイマーをキャンセル
- シングルタッチの場合のみ移動距離で判定

**実装の要点**:
- 条件分岐を追加（`touches.length > 1`のチェック）
- マルチタッチ検出時は即座にキャンセル

### 3. イベント登録 (修正)

**現在の実装**:
- `touchstart`, `touchend`, `touchmove`のみ登録

**修正後**:
- `touchcancel`イベントハンドラを追加

**実装の要点**:
- `map.on('touchcancel', clearLongPressTimer)`を追加
- クリーンアップは`map.remove()`で一括処理されるため追加不要

## データフロー

### ピンチアウト操作時（修正後）
```
1. 1本目の指でtouchstart → handleLongPressStart呼び出し
2. touches.length == 1 なのでタイマー開始
3. 2本目の指が接触 → 新たなtouchstartまたはtouchmove
4. touches.length > 1 を検出 → clearLongPressTimer() → return
5. ピンチ操作が継続 → タイマーは既にキャンセル済み
6. touchend → 長押しは発火しない
```

## エラーハンドリング戦略

特別なエラーハンドリングは不要。既存のnullチェックで対応済み。

## テスト戦略

### 手動テスト
1. iPhone実機またはiOSシミュレータでピンチアウト
2. ピンチイン
3. 1本指での長押し
4. Android実機での同様の操作

### ユニットテスト
- 既存テストがあれば追加、なければスキップ（手動テストで代替）

## 依存ライブラリ

新規ライブラリの追加なし。

## ディレクトリ構造

```
components/map/MapView.tsx  # 修正対象（既存ファイル）
```

## 実装の順序

1. `handleLongPressStart`にマルチタッチ判定を追加
2. `handleMove`にマルチタッチ判定を追加
3. `touchcancel`イベントハンドラを登録
4. 動作確認

## セキュリティ考慮事項

なし（UIの修正のみ）

## パフォーマンス考慮事項

- 条件分岐の追加のみで、パフォーマンスへの影響は無視できるレベル

## 将来の拡張性

- 今回の修正により、マルチタッチジェスチャーの基盤が整備される
- 今後3本指ジェスチャーなどを追加する場合も同様のパターンで対応可能
