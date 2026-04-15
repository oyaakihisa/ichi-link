# タスクリスト: POI選択時ハイライト表示

## フェーズ1: MapView拡張

### 1.1 selectedPoiIdRef追加

- [x] useRefでselectedPoiIdRefを追加
- [x] selectedPoiIdの変更時にrefを更新するuseEffect追加

### 1.2 POIハイライト更新機能

- [x] selectedPoiId変更時にcircle-radiusを更新するuseEffect追加
  - 選択時: 14px、通常時: 10px
- [x] selectedPoiId変更時にcircle-stroke-widthを更新
  - 選択時: 4px、通常時: 2px

### 1.3 setupPOILayers関数の拡張

- [x] 初期セットアップ時に条件付きスタイルを適用
- [x] selectedPoiIdRefを参照して初期ハイライト状態を設定

### 1.4 スタイル切替対応

- [x] style.loadイベントでハイライト状態を再適用

## フェーズ2: 検証

- [x] TypeScriptエラーがないこと（npm run typecheck）
- [x] ESLintエラーがないこと（npm run lint）
- [x] ビルドが成功すること（npm run build）

## フェーズ3: 手動テスト

- [ ] POIタップでハイライト表示されること
- [ ] 別のPOIタップでハイライトが移動すること
- [ ] POIパネル閉じるとハイライトが解除されること
- [ ] スタイル切替後もハイライトが維持されること
- [ ] モバイルでPOIタップ時にハイライトが見やすいこと

---

## 実装後の振り返り

### 実装完了日
{YYYY-MM-DD}

### 計画と実績の差分

**計画と異なった点**:
-

**新たに必要になったタスク**:
-

### 学んだこと

**技術的な学び**:
-

**プロセス上の改善点**:
-

### 次回への改善提案
-
