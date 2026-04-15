'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { SlidePanel } from '@/components/map/SlidePanel';
import type { Municipality, MunicipalityLayerStatus } from '@/lib/types/municipality';
import type { Coordinate, POIListItem, POIDetail, MapBounds, LayerVisibility } from '@/lib/types';
import { poiService } from '@/lib/services';

// MapView を遅延ロード（mapbox-gl を初期バンドルから分離）
const MapView = dynamic(
  () => import('@/components/map/MapView').then((mod) => mod.MapView),
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
  }
);

interface MunicipalityMapViewProps {
  municipality: Municipality;
  layerStatuses: MunicipalityLayerStatus[];
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
  layerStatuses,
}: MunicipalityMapViewProps) {
  // 市町村マスタから初期状態を設定
  const initialCenter = useMemo<Coordinate>(
    () => ({
      latitude: municipality.map.center.lat,
      longitude: municipality.map.center.lng,
    }),
    [municipality.map.center.lat, municipality.map.center.lng]
  );

  const initialBounds = useMemo<MapBounds>(
    () => ({
      north: municipality.map.bbox.north,
      south: municipality.map.bbox.south,
      east: municipality.map.bbox.east,
      west: municipality.map.bbox.west,
    }),
    [municipality.map.bbox]
  );

  // defaultLayersからレイヤー表示状態を初期化
  const initialLayerVisibility = useMemo<LayerVisibility>(
    () => ({
      aed: municipality.layers.defaultLayers.includes('aed'),
      fireHydrant: municipality.layers.defaultLayers.includes('fireHydrant'),
    }),
    [municipality.layers.defaultLayers]
  );

  // POI関連の状態
  const [pois, setPois] = useState<POIListItem[]>([]);
  const [selectedPoi, setSelectedPoi] = useState<POIListItem | null>(null);
  const [selectedPoiDetail, setSelectedPoiDetail] = useState<POIDetail | null>(null);
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>(initialLayerVisibility);
  const [isPoiPanelOpen, setIsPoiPanelOpen] = useState(false);

  // 長押しピン関連
  const [pin, setPin] = useState<{ coordinate: Coordinate; address?: string } | null>(null);
  const [isPinPanelOpen, setIsPinPanelOpen] = useState(false);

  // デバウンス用のタイマー
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 初回POI取得フラグ
  const isInitialFetchDone = useRef(false);

  // 市町村bboxで初回POI取得
  useEffect(() => {
    if (isInitialFetchDone.current) return;
    isInitialFetchDone.current = true;

    const fetchInitialPois = async () => {
      const types: Array<'aed' | 'fireHydrant'> = [];
      if (layerVisibility.aed) types.push('aed');
      if (layerVisibility.fireHydrant) types.push('fireHydrant');

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
        const types: Array<'aed' | 'fireHydrant'> = [];
        if (layerVisibility.aed) types.push('aed');
        if (layerVisibility.fireHydrant) types.push('fireHydrant');

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
    [layerVisibility]
  );

  // コンポーネントアンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // flyTo座標はPOI選択・長押しピンから導出
  const flyToCoordinate = useMemo<Coordinate | null>(() => {
    if (selectedPoi && isPoiPanelOpen) {
      return { latitude: selectedPoi.latitude, longitude: selectedPoi.longitude };
    }
    if (pin && isPinPanelOpen) {
      return pin.coordinate;
    }
    return null;
  }, [selectedPoi, isPoiPanelOpen, pin, isPinPanelOpen]);

  // POI選択ハンドラ
  const handlePoiSelect = useCallback(async (poi: POIListItem) => {
    // 長押しピンをクリア
    setPin(null);
    setIsPinPanelOpen(false);
    // POIを選択
    setSelectedPoi(poi);
    setSelectedPoiDetail(null);
    setIsPoiPanelOpen(true);

    // バックグラウンドで詳細を取得
    const detail = await poiService.getPOIDetail(poi.id);
    if (detail) {
      setSelectedPoiDetail(detail);
    }
  }, []);

  // POIパネルを閉じる
  const handleClosePoiPanel = useCallback(() => {
    setIsPoiPanelOpen(false);
    setSelectedPoi(null);
    setSelectedPoiDetail(null);
  }, []);

  // レイヤー表示切替ハンドラ
  const handleLayerVisibilityChange = useCallback((visibility: LayerVisibility) => {
    setLayerVisibility(visibility);
  }, []);

  // 長押しハンドラ
  const handleLongPress = useCallback((coordinate: Coordinate) => {
    // POI選択をクリア
    setSelectedPoi(null);
    setIsPoiPanelOpen(false);
    // ピンを設置
    setPin({ coordinate });
    setIsPinPanelOpen(true);
  }, []);

  // ピンパネルを閉じる
  const handleClosePinPanel = useCallback(() => {
    setIsPinPanelOpen(false);
  }, []);

  // ピンの座標を決定
  const pinCoordinate = pin?.coordinate || null;

  // 最終更新日を取得
  const lastUpdatedAt = useMemo(() => {
    const dates = layerStatuses
      .filter((s) => s.lastImportedAt)
      .map((s) => s.lastImportedAt!.getTime());
    if (dates.length === 0) return null;
    return new Date(Math.max(...dates));
  }, [layerStatuses]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm z-20 relative">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900">
            {municipality.seo.h1 || `${municipality.municipalityNameJa} AED・消火栓マップ`}
          </h1>
          <p className="text-xs text-gray-500">
            {municipality.prefectureNameJa} {municipality.municipalityNameJa}
            {lastUpdatedAt && (
              <span className="ml-2">
                最終更新: {lastUpdatedAt.toLocaleDateString('ja-JP')}
              </span>
            )}
          </p>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 relative">
        {/* 市町村情報（導入テキストがある場合） */}
        {municipality.content.introText && (
          <div className="absolute top-4 left-4 right-4 z-10 max-w-xl mx-auto">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm">
              <p className="text-sm text-gray-700">{municipality.content.introText}</p>
            </div>
          </div>
        )}

        {/* マップ */}
        <div className="absolute inset-0">
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
        </div>

        {/* 長押しピン用スライドパネル */}
        {pin && (
          <SlidePanel
            pin={{ coordinate: pin.coordinate, timestamp: new Date() }}
            isOpen={isPinPanelOpen}
            onClose={handleClosePinPanel}
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

      {/* 注意事項（ある場合） */}
      {municipality.content.cautionText && (
        <footer className="bg-amber-50 border-t border-amber-200 z-20 relative">
          <div className="max-w-4xl mx-auto px-4 py-2">
            <p className="text-xs text-amber-800">{municipality.content.cautionText}</p>
          </div>
        </footer>
      )}
    </div>
  );
}
