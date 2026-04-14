"use client";

import { useState } from "react";
import { LocationInput } from "@/components/input/LocationInput";
import { ConversionResult } from "@/components/result/ConversionResult";
import { TabNavigation } from "@/components/layout/TabNavigation";
import { useConversion } from "@/components/hooks/useConversion";
import { TabType, TABS } from "@/lib/types";
import { MapTab } from "@/components/map/MapTab";

export default function Home() {
  const { result, error, isLoading, convert } = useConversion();
  const [activeTab, setActiveTab] = useState<TabType>("converter");

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <header className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ichi-link</h1>
          <p className="text-sm text-gray-600">
            位置情報変換ツール &amp; マップランチャー
          </p>
        </header>

        {/* タブナビゲーション */}
        <div className="mb-6">
          <TabNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabs={TABS}
          />
        </div>

        {/* 変換ツールタブ */}
        {activeTab === "converter" && (
          <div id="panel-converter" role="tabpanel" aria-labelledby="tab-converter">
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
          </div>
        )}

        {/* マップタブ */}
        {activeTab === "map" && <MapTab />}

        {/* フッター */}
        <footer className="text-center mt-8 text-xs text-gray-400">
          <p>緊急対応の現場向け位置情報変換ツール</p>
        </footer>
      </main>
    </div>
  );
}
