"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { SlidePanel } from "@/components/map/SlidePanel";
import { MapErrorBoundary } from "@/components/map/MapErrorBoundary";

// MapView を遅延ロード（mapbox-gl を初期バンドルから分離）
const MapView = dynamic(
  () => import("@/components/map/MapView").then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent" />
          <span className="text-sm text-gray-500">地図を読み込み中...</span>
        </div>
      </div>
    ),
  },
);
import { SearchBar } from "@/components/search/SearchBar";
import { useConversion } from "@/components/hooks/useConversion";
import { useMapInteraction } from "@/components/hooks/useMapInteraction";
import {
  Coordinate,
  POIListItem,
  POIDetail,
  MapBounds,
  LayerVisibility,
  AvailablePOITypes,
  DEFAULT_LAYER_VISIBILITY,
} from "@/lib/types";
import { poiService } from "@/lib/services";

export default function Home() {
  const { result, error, isLoading, convert, clear } = useConversion();
  const {
    pin,
    isPanelOpen,
    isLoadingAddress,
    handleLongPress,
    closePanel,
    clearPin,
  } = useMapInteraction();

  // 変換結果パネルの開閉状態を追跡（結果がある間はデフォルトで開く）
  const [isConversionPanelClosed, setIsConversionPanelClosed] = useState(false);

  // POI関連の状態
  const [pois, setPois] = useState<POIListItem[]>([]);
  const [selectedPoi, setSelectedPoi] = useState<POIListItem | null>(null);
  const [selectedPoiDetail, setSelectedPoiDetail] = useState<POIDetail | null>(
    null,
  );
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>(
    DEFAULT_LAYER_VISIBILITY,
  );
  const [isPoiPanelOpen, setIsPoiPanelOpen] = useState(false);

  // デバウンス用のタイマー
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 変換結果がある場合、ユーザーが閉じていなければパネルを開く
  const isConversionPanelOpen = result !== null && !isConversionPanelClosed;

  // マップビューポート変更時にPOIを再取得（デバウンス300ms）
  const handleMoveEnd = useCallback(
    (bounds: MapBounds) => {
      // 既存のタイマーをクリア
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // 300msデバウンス
      debounceTimerRef.current = setTimeout(async () => {
        // 現在有効なレイヤーのPOI種別を取得
        const types: Array<"aed" | "fireHydrant" | "fireCistern"> = [];
        if (layerVisibility.aed) types.push("aed");
        if (layerVisibility.fireHydrant) types.push("fireHydrant");
        if (layerVisibility.fireCistern) types.push("fireCistern");

        if (types.length === 0) {
          setPois([]);
          return;
        }

        const loadedPois = await poiService.getPOIs({
          bounds,
          types,
        });
        setPois(loadedPois);
      }, 300);
    },
    [layerVisibility],
  );

  // コンポーネントアンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // flyTo座標は結果・POI選択・長押しピンから導出
  const flyToCoordinate = useMemo<Coordinate | null>(() => {
    // POI選択時
    if (selectedPoi && isPoiPanelOpen) {
      return {
        latitude: selectedPoi.latitude,
        longitude: selectedPoi.longitude,
      };
    }
    // 長押しピン時
    if (pin && isPanelOpen) {
      return pin.coordinate;
    }
    // 変換結果時
    if (result && !isConversionPanelClosed) {
      return result.coordinates.wgs84;
    }
    return null;
  }, [
    selectedPoi,
    isPoiPanelOpen,
    pin,
    isPanelOpen,
    result,
    isConversionPanelClosed,
  ]);

  // 利用可能なPOIタイプを計算（データが存在するタイプのみtrue）
  const availablePOITypes = useMemo<AvailablePOITypes>(() => ({
    aed: pois.some((p) => p.type === "aed"),
    fireHydrant: pois.some((p) => p.type === "fireHydrant"),
    fireCistern: pois.some((p) => p.type === "fireCistern"),
  }), [pois]);

  // POI選択ハンドラ（排他制御: アクティブピン・変換結果をクリア）
  const handlePoiSelect = useCallback(
    async (poi: POIListItem) => {
      // 変換結果をクリア
      clear();
      setIsConversionPanelClosed(true);
      // 長押しピンをクリア
      closePanel();
      clearPin();
      // POIを選択（一覧データでパネルを即座に表示）
      setSelectedPoi(poi);
      setSelectedPoiDetail(null); // 詳細は後で取得
      setIsPoiPanelOpen(true);

      // バックグラウンドで詳細を取得
      const detail = await poiService.getPOIDetail(poi.id);
      if (detail) {
        setSelectedPoiDetail(detail);
      }
    },
    [clear, closePanel, clearPin],
  );

  // POIパネルを閉じる
  const handleClosePoiPanel = useCallback(() => {
    setIsPoiPanelOpen(false);
    setSelectedPoi(null);
    setSelectedPoiDetail(null);
  }, []);

  // レイヤー表示切替ハンドラ
  const handleLayerVisibilityChange = useCallback(
    (visibility: LayerVisibility) => {
      setLayerVisibility(visibility);
    },
    [],
  );

  // 検索バーからの変換処理（排他制御: POI選択をクリア）
  const handleConvert = useCallback(
    async (input: string, source: "address" | "wgs84" | "tokyo") => {
      // POI選択をクリア
      setSelectedPoi(null);
      setIsPoiPanelOpen(false);
      // 長押しピンのパネルを閉じてピンをクリア
      closePanel();
      clearPin();
      // 変換パネルを閉じた状態をリセット
      setIsConversionPanelClosed(false);

      await convert(input, source);
    },
    [convert, closePanel, clearPin],
  );

  // 変換パネルを閉じる
  const handleCloseConversionPanel = useCallback(() => {
    setIsConversionPanelClosed(true);
  }, []);

  // 長押しピンの処理（排他制御: 変換結果・POI選択をクリア）
  const handleMapLongPress = useCallback(
    (coordinate: Coordinate) => {
      // POI選択をクリア
      setSelectedPoi(null);
      setIsPoiPanelOpen(false);
      // 変換結果パネルを閉じる
      setIsConversionPanelClosed(true);
      clear();
      handleLongPress(coordinate);
    },
    [handleLongPress, clear],
  );

  // ピンの座標を決定
  const pinCoordinate = result?.coordinates.wgs84 || pin?.coordinate || null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* メインコンテンツ */}
      <main className="h-screen relative">
        {/* フローティング検索バー */}
        <div className="absolute top-2 left-2 right-2 z-10 max-w-xl mx-auto">
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
          <MapErrorBoundary>
            <MapView
              onLongPress={handleMapLongPress}
              pinCoordinate={pinCoordinate}
              flyToCoordinate={flyToCoordinate}
              pois={pois}
              selectedPoiId={selectedPoi?.id}
              layerVisibility={layerVisibility}
              availablePOITypes={availablePOITypes}
              onPoiSelect={handlePoiSelect}
              onLayerVisibilityChange={handleLayerVisibilityChange}
              onMoveEnd={handleMoveEnd}
            />
          </MapErrorBoundary>
        </div>

        {/* 変換結果用スライドパネル */}
        {result && !selectedPoi && (
          <SlidePanel
            conversionResult={result}
            isOpen={isConversionPanelOpen}
            onClose={handleCloseConversionPanel}
          />
        )}

        {/* 長押しピン用スライドパネル */}
        {pin && !result && !selectedPoi && (
          <SlidePanel
            pin={pin}
            isLoadingAddress={isLoadingAddress}
            isOpen={isPanelOpen}
            onClose={closePanel}
          />
        )}

        {/* POI詳細用スライドパネル */}
        {selectedPoi && (
          <SlidePanel
            selectedPoi={selectedPoi}
            selectedPoiDetail={selectedPoiDetail}
            isOpen={isPoiPanelOpen}
            onClose={handleClosePoiPanel}
          />
        )}
      </main>
    </div>
  );
}
