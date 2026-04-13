'use client';

import { LocationInput } from '@/components/input/LocationInput';
import { ConversionResult } from '@/components/result/ConversionResult';
import { useConversion } from '@/components/hooks/useConversion';

export default function Home() {
  const { result, error, isLoading, convert } = useConversion();

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <header className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            ichi-link
          </h1>
          <p className="text-sm text-gray-600">
            位置情報コンバータ &amp; マップランチャー
          </p>
        </header>

        {/* 入力セクション */}
        <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <LocationInput onConvert={convert} isLoading={isLoading} />
        </section>

        {/* エラー表示 */}
        {error && (
          <section className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </section>
        )}

        {/* 結果表示 */}
        {result && (
          <section className="bg-white rounded-xl shadow-sm p-6">
            <ConversionResult result={result} />
          </section>
        )}

        {/* フッター */}
        <footer className="text-center mt-8 text-xs text-gray-400">
          <p>緊急対応の現場向け位置情報変換ツール</p>
        </footer>
      </main>
    </div>
  );
}
