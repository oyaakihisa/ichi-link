# タスクリスト: 3入力欄方式へのUI改修

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

---

## フェーズ1: 型定義の修正

- [x] lib/types/input.ts を修正
  - [x] InputSource型を追加（'address' | 'wgs84' | 'tokyo'）→ coordinate.tsに追加
  - [x] ParsedCoordinateからassumedDatum, datumConfidenceを削除
- [x] lib/types/result.ts を修正
  - [x] coordinates.jgd2011 → coordinates.tokyo に変更
  - [x] inputSourceフィールドを追加
- [x] lib/types/coordinate.ts を修正
  - [x] Datum型からJGD2011を削除
  - [x] InputSource型を追加

## フェーズ2: サービス層の修正

- [x] lib/services/DatumTransformer.ts を修正
  - [x] wgs84ToJgd2011()を削除
  - [x] jgd2011ToWgs84()を削除
  - [x] wgs84ToTokyo()を追加
  - [x] tokyoToWgs84()は既存のまま
- [x] lib/services/InputParser.ts を修正
  - [x] parse()メソッドを簡素化（住所判定不要、測地系推定不要）
  - [x] ParsedCoordinateからassumedDatum関連を削除
- [x] lib/services/ConversionService.ts を修正
  - [x] convert()を拡張してInputSourceパラメータを追加
  - [x] WGS84入力時: wgs84ToTokyo()を呼び出す
  - [x] Tokyo入力時: tokyoToWgs84()を呼び出す
  - [x] 結果のcoordinatesをwgs84/tokyoに変更
- [x] lib/services/ValidationService.ts を修正
  - [x] datum_uncertain警告を削除

## フェーズ3: UIコンポーネントの修正

- [x] components/input/LocationInput.tsx を修正
  - [x] 3つの入力欄（住所/WGS84/Tokyo）を作成
  - [x] 各欄に独立した変換ボタンを配置
  - [x] 住所欄は「準備中」として無効化
  - [x] Propsを更新（onConvert(input, source)形式に統一）
- [x] components/result/ConversionResult.tsx を修正
  - [x] jgd2011 → tokyo に変更
  - [x] 「判定結果」セクションから推定測地系・確信度を削除
  - [x] 入力元（inputSource）の表示を追加
- [x] components/hooks/useConversion.ts を修正
  - [x] convert()にsourceパラメータを追加
  - [x] InputSourceに応じた変換処理の分岐

## フェーズ4: ページ統合

- [x] app/page.tsx を修正
  - [x] LocationInputのProps変更に対応（onConvert(input, source)形式）
  - [x] useConversionのconvert呼び出しは既に対応済み

## フェーズ5: テスト修正

- [x] __tests__/unit/DatumTransformer.test.ts を修正
  - [x] JGD2011関連テストを削除
  - [x] wgs84ToTokyo()のテストを追加
- [x] __tests__/unit/ConversionService.test.ts を修正
  - [x] InputSourceパラメータ対応
  - [x] tokyo座標の出力テスト
- [x] __tests__/unit/ValidationService.test.ts を修正
  - [x] datum_uncertain関連テストを削除

## フェーズ6: 品質チェック

- [x] npm test で全テスト通過
- [x] npm run lint でリントエラーなし
- [x] npx tsc --noEmit で型エラーなし
- [x] npm run build でビルド成功
- [x] npm run dev で動作確認
  - [x] WGS84入力欄からの変換確認
  - [x] Tokyo Datum入力欄からの変換確認
  - [x] 住所欄が無効化されていることを確認

---

## 実装後の振り返り

### 実装完了日
2026-04-13

### 計画と実績の差分
- 計画通りに6フェーズを順に実装完了
- テストファイルの修正でInputSourceパラメータ追加と同時にTokyo Datum入力テストも追加

### 学んだこと
- 型定義 → サービス層 → UI → テストの順序で修正することで、型エラーを段階的に解消できた
- proj4jsでEPSG:4301（Tokyo Datum）を定義することでWGS84との正確な変換が可能

### 次回への改善提案
- 住所入力機能の実装時は、ジオコーディングAPI選定を先に行う
