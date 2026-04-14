# タスクリスト: AED / 消火栓レイヤー機能のPRD追加

## フェーズ1: PRD修正

### 1.1 product-requirements.md 更新
- [x] プロダクト概要の拡張（コンセプト、ビジョン、目的）
- [x] 公開設備レイヤーの前提セクション追加
- [x] ターゲットユーザーの価値拡張
- [x] KPI追加（POIレイヤー関連指標）
- [x] ピン状態管理の明確化（排他制御ルール）
- [x] 新機能追加（AED/消火栓レイヤー表示、レイヤー切替UI）
- [x] スライドパネルのPOI対応
- [x] 共通POIデータモデルの追加
- [x] UIインターフェース図の更新
- [x] 非機能要件の追加
- [x] スコープ外の明確化

## フェーズ2: 関連ドキュメント更新

### 2.1 glossary.md 更新
- [x] POI (Point of Interest) 追加
- [x] AED 追加
- [x] 消火栓 (Fire Hydrant) 追加
- [x] 防火水槽 (Fire Cistern) 追加
- [x] 公開設備 (Public Facility) 追加
- [x] レイヤー (Layer) 追加
- [x] アクティブピン (Active Pin) 追加
- [x] 索引の更新

### 2.2 functional-design.md 更新
- [x] システム構成図にPOIService追加
- [x] 詳細構成図にPOILayer、LayerToggle追加
- [x] POIエンティティの型定義追加
- [x] MapStateにPOI関連状態追加
- [x] POIServiceコンポーネント設計追加
- [x] ユースケース5（POIタップ→詳細確認）追加
- [x] ユースケース6（レイヤー切替）追加
- [x] UIレイアウトにレイヤー切替UI追加
- [x] スライドパネル動作にPOI詳細追加
- [x] E2EテストにPOI関連追加

### 2.3 architecture.md 更新
- [x] サービスレイヤーの責務にPOI追加
- [x] 外部API利用量にPOIデータソース追加
- [x] POIデータ取得戦略追加
- [x] POI種別追加のプラグイン設計追加

### 2.4 repository-structure.md 更新
- [x] lib/services/poi/ ディレクトリ追加
- [x] lib/types/ にpoi.ts、layer.ts追加
- [x] components/map/ ディレクトリ追加
- [x] components/panel/ ディレクトリ追加
- [x] components/hooks/ にPOI関連フック追加
- [x] 初期ファイル一覧の更新

## フェーズ3: 検証

- [x] PRDの整合性確認
- [x] 各ドキュメント間の整合性確認

## 実装後の振り返り

**実装完了日**: 2026-04-14

**計画と実績の差分**:
- 特になし。計画通りに全ドキュメントを更新

**学んだこと**:
- PRDに新機能を追加する際は、関連する全ドキュメント（glossary、functional-design、architecture、repository-structure）も同時に更新する必要がある
- 状態管理の排他制御は、理由（現場での混乱を防ぐ）とともに明記することで仕様の意図が明確になる

**次回への改善提案**:
- ドキュメント間の整合性チェックリストを作成すると効率的
