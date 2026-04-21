"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { SlidePanel } from "@/components/map/SlidePanel";
import { MapErrorBoundary } from "@/components/map/MapErrorBoundary";
import { SearchBar } from "@/components/search/SearchBar";
import { useConversion } from "@/components/hooks/useConversion";
import { useMapInteraction } from "@/components/hooks/useMapInteraction";
import type { Municipality } from "@/lib/types/municipality";
import type {
  Coordinate,
  POIListItem,
  POIDetail,
  MapBounds,
  LayerVisibility,
} from "@/lib/types";
import { poiService } from "@/lib/services";

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

interface MunicipalityMapViewProps {
  municipality: Municipality;
}

/**
 * 市町村ランディングページのメインビュー
 *
 * - 市町村マスタから地図の初期状態を設定
 * - 市町村bboxでPOIを初回取得
 * - 以後はユーザー操作に応じてviewportベース取得
 */
export function MunicipalityMapView({
  municipality,
}: MunicipalityMapViewProps) {
  // 座標変換フック
  const { result, error, isLoading, convert, clear } = useConversion();

  // 変換結果パネルの開閉状態を追跡（結果がある間はデフォルトで開く）
  const [isConversionPanelClosed, setIsConversionPanelClosed] = useState(false);

  // 変換結果がある場合、ユーザーが閉じていなければパネルを開く
  const isConversionPanelOpen = result !== null && !isConversionPanelClosed;

  // 市町村マスタから初期状態を設定
  const initialCenter = useMemo<Coordinate>(
    () => ({
      latitude: municipality.map.center.lat,
      longitude: municipality.map.center.lng,
    }),
    [municipality.map.center.lat, municipality.map.center.lng],
  );

  const initialBounds = useMemo<MapBounds>(
    () => ({
      north: municipality.map.bbox.north,
      south: municipality.map.bbox.south,
      east: municipality.map.bbox.east,
      west: municipality.map.bbox.west,
    }),
    [municipality.map.bbox],
  );

  // defaultLayersからレイヤー表示状態を初期化
  const initialLayerVisibility = useMemo<LayerVisibility>(
    () => ({
      aed: municipality.layers.defaultLayers.includes("aed"),
      fireHydrant: municipality.layers.defaultLayers.includes("fireHydrant"),
      fireCistern: municipality.layers.defaultLayers.includes("fireCistern"),
    }),
    [municipality.layers.defaultLayers],
  );

  // POI関連の状態
  const [pois, setPois] = useState<POIListItem[]>([]);
  const [selectedPoi, setSelectedPoi] = useState<POIListItem | null>(null);
  const [selectedPoiDetail, setSelectedPoiDetail] = useState<POIDetail | null>(
    null,
  );
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>(
    initialLayerVisibility,
  );
  const [isPoiPanelOpen, setIsPoiPanelOpen] = useState(false);

  // 長押しピン関連（useMapInteractionフックを使用）
  const {
    pin,
    isPanelOpen: isPinPanelOpen,
    isLoadingAddress,
    handleLongPress: hookHandleLongPress,
    closePanel: closePinPanel,
    clearPin,
  } = useMapInteraction();

  // デバウンス用のタイマー
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 初回POI取得フラグ
  const isInitialFetchDone = useRef(false);

  // 市町村bboxで初回POI取得
  useEffect(() => {
    if (isInitialFetchDone.current) return;
    isInitialFetchDone.current = true;

    const fetchInitialPois = async () => {
      const types: Array<"aed" | "fireHydrant" | "fireCistern"> = [];
      if (layerVisibility.aed) types.push("aed");
      if (layerVisibility.fireHydrant) types.push("fireHydrant");
      if (layerVisibility.fireCistern) types.push("fireCistern");

      if (types.length === 0) {
        return;
      }

      const loadedPois = await poiService.getPOIs({
        bounds: initialBounds,
        types,
      });
      setPois(loadedPois);
    };

    fetchInitialPois();
  }, [initialBounds, layerVisibility]);

  // マップビューポート変更時にPOIを再取得（デバウンス300ms）
  const handleMoveEnd = useCallback(
    (bounds: MapBounds) => {
      // 既存のタイマーをクリア
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // 300msデバウンス
      debounceTimerRef.current = setTimeout(async () => {
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

  // flyTo座標はPOI選択・長押しピン・変換結果から導出
  const flyToCoordinate = useMemo<Coordinate | null>(() => {
    // POI選択時
    if (selectedPoi && isPoiPanelOpen) {
      return {
        latitude: selectedPoi.latitude,
        longitude: selectedPoi.longitude,
      };
    }
    // 長押しピン時
    if (pin && isPinPanelOpen) {
      return pin.coordinate;
    }
    // 変換結果時
    if (result && !isConversionPanelClosed) {
      return result.coordinates.wgs84;
    }
    return null;
  }, [selectedPoi, isPoiPanelOpen, pin, isPinPanelOpen, result, isConversionPanelClosed]);

  // POI選択ハンドラ（排他制御: 変換結果・ピンをクリア）
  const handlePoiSelect = useCallback(
    async (poi: POIListItem) => {
      // 変換結果をクリア
      clear();
      setIsConversionPanelClosed(true);
      // 長押しピンをクリア
      closePinPanel();
      clearPin();
      // POIを選択（一覧データでパネルを即座に表示）
      setSelectedPoi(poi);
      setSelectedPoiDetail(null);
      setIsPoiPanelOpen(true);

      // バックグラウンドで詳細を取得
      const detail = await poiService.getPOIDetail(poi.id);
      if (detail) {
        setSelectedPoiDetail(detail);
      }
    },
    [clear, closePinPanel, clearPin],
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

  // 長押しハンドラ（排他制御: 変換結果・POI選択をクリア）
  const handleLongPress = useCallback(
    (coordinate: Coordinate) => {
      // 変換結果をクリア
      clear();
      setIsConversionPanelClosed(true);
      // POI選択をクリア
      setSelectedPoi(null);
      setIsPoiPanelOpen(false);
      // フックのhandleLongPressを呼び出し（逆ジオコーディング・Tokyo Datum変換を実行）
      hookHandleLongPress(coordinate);
    },
    [clear, hookHandleLongPress],
  );

  // 検索バーからの変換処理（排他制御: POI選択・ピンをクリア）
  const handleConvert = useCallback(
    async (input: string, source: "address" | "wgs84" | "tokyo") => {
      // POI選択をクリア
      setSelectedPoi(null);
      setIsPoiPanelOpen(false);
      // 長押しピンをクリア
      closePinPanel();
      clearPin();
      // 変換パネルを閉じた状態をリセット
      setIsConversionPanelClosed(false);

      await convert(input, source);
    },
    [convert, closePinPanel, clearPin],
  );

  // 変換パネルを閉じる
  const handleCloseConversionPanel = useCallback(() => {
    setIsConversionPanelClosed(true);
  }, []);

  // ピンの座標を決定（変換結果またはピン）
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
              onLongPress={handleLongPress}
              pinCoordinate={pinCoordinate}
              flyToCoordinate={flyToCoordinate}
              pois={pois}
              selectedPoiId={selectedPoi?.id}
              layerVisibility={layerVisibility}
              onPoiSelect={handlePoiSelect}
              onLayerVisibilityChange={handleLayerVisibilityChange}
              onMoveEnd={handleMoveEnd}
              initialCenter={initialCenter}
              initialZoom={municipality.map.initialZoom}
              initialBounds={initialBounds}
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
            isOpen={isPinPanelOpen}
            onClose={closePinPanel}
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
