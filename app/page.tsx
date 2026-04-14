"use client";

import { useState, useCallback, useMemo } from "react";
import { MapView } from "@/components/map/MapView";
import { SlidePanel } from "@/components/map/SlidePanel";
import { SearchBar } from "@/components/search/SearchBar";
import { useConversion } from "@/components/hooks/useConversion";
import { useMapInteraction } from "@/components/hooks/useMapInteraction";
import { Coordinate } from "@/lib/types";

export default function Home() {
  const { result, error, isLoading, convert, clear } = useConversion();
  const { pin, isPanelOpen, isLoadingAddress, handleLongPress, closePanel, clearPin } =
    useMapInteraction();

  // 変換結果パネルの開閉状態を追跡（結果がある間はデフォルトで開く）
  const [isConversionPanelClosed, setIsConversionPanelClosed] = useState(false);

  // 変換結果がある場合、ユーザーが閉じていなければパネルを開く
  const isConversionPanelOpen = result !== null && !isConversionPanelClosed;

  // flyTo座標は結果から直接導出
  const flyToCoordinate = useMemo<Coordinate | null>(() => {
    if (result && !isConversionPanelClosed) {
      return result.coordinates.wgs84;
    }
    return null;
  }, [result, isConversionPanelClosed]);

  // 検索バーからの変換処理
  const handleConvert = useCallback(
    async (input: string, source: "address" | "wgs84" | "tokyo") => {
      // 長押しピンのパネルを閉じてピンをクリア
      closePanel();
      clearPin();
      // 変換パネルを閉じた状態をリセット
      setIsConversionPanelClosed(false);

      await convert(input, source);
    },
    [convert, closePanel, clearPin]
  );

  // 変換パネルを閉じる
  const handleCloseConversionPanel = useCallback(() => {
    setIsConversionPanelClosed(true);
  }, []);

  // 長押しピンの処理（変換結果パネルを閉じる）
  const handleMapLongPress = useCallback(
    (coordinate: Coordinate) => {
      setIsConversionPanelClosed(true);
      clear();
      handleLongPress(coordinate);
    },
    [handleLongPress, clear]
  );

  // ピンの座標を決定
  const pinCoordinate = result?.coordinates.wgs84 || pin?.coordinate || null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm z-20 relative">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900">ichi-link</h1>
          <p className="text-xs text-gray-500">位置情報変換ツール</p>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 relative">
        {/* フローティング検索バー */}
        <div className="absolute top-4 left-4 right-4 z-10 max-w-xl mx-auto">
          <SearchBar onConvert={handleConvert} isLoading={isLoading} />

          {/* エラー表示 */}
          {error && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* マップ */}
        <div className="absolute inset-0">
          <MapView
            onLongPress={handleMapLongPress}
            pinCoordinate={pinCoordinate}
            flyToCoordinate={flyToCoordinate}
          />
        </div>

        {/* 変換結果用スライドパネル */}
        {result && (
          <SlidePanel
            conversionResult={result}
            isOpen={isConversionPanelOpen}
            onClose={handleCloseConversionPanel}
          />
        )}

        {/* 長押しピン用スライドパネル */}
        {pin && !result && (
          <SlidePanel
            pin={pin}
            isLoadingAddress={isLoadingAddress}
            isOpen={isPanelOpen}
            onClose={closePanel}
          />
        )}
      </main>
    </div>
  );
}
