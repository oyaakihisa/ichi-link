'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { DEFAULT_MAP_STATE, Coordinate, POIListItem, MapBounds, LayerVisibility, DEFAULT_LAYER_VISIBILITY } from '@/lib/types';
import { LayerToggleControl } from './LayerToggle';

const LONG_PRESS_DURATION = 500; // ms
const POI_SOURCE_ID = 'poi-source';
const AED_LAYER_ID = 'aed-layer';
const FIRE_HYDRANT_LAYER_ID = 'fire-hydrant-layer';

// POIデータをGeoJSON形式に変換
function createPOIGeoJSON(pois: POIListItem[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: pois.map((poi) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [poi.longitude, poi.latitude],
      },
      properties: {
        id: poi.id,
        type: poi.type,
        name: poi.name,
      },
    })),
  };
}

// POIレイヤーをマップに追加
function setupPOILayers(
  map: mapboxgl.Map,
  pois: POIListItem[],
  layerVisibility: LayerVisibility,
  selectedPoiId?: string | null
): void {
  // 既存のソースとレイヤーを削除
  if (map.getLayer(AED_LAYER_ID)) {
    map.removeLayer(AED_LAYER_ID);
  }
  if (map.getLayer(FIRE_HYDRANT_LAYER_ID)) {
    map.removeLayer(FIRE_HYDRANT_LAYER_ID);
  }
  if (map.getSource(POI_SOURCE_ID)) {
    map.removeSource(POI_SOURCE_ID);
  }

  // ハイライト用のスタイル値を計算
  const radiusValue = selectedPoiId
    ? (['case', ['==', ['get', 'id'], selectedPoiId], 14, 10] as mapboxgl.ExpressionSpecification)
    : 10;
  const strokeWidthValue = selectedPoiId
    ? (['case', ['==', ['get', 'id'], selectedPoiId], 4, 2] as mapboxgl.ExpressionSpecification)
    : 2;

  // POIソースを追加
  map.addSource(POI_SOURCE_ID, {
    type: 'geojson',
    data: createPOIGeoJSON(pois),
  });

  // AEDレイヤー（赤色）
  map.addLayer({
    id: AED_LAYER_ID,
    type: 'circle',
    source: POI_SOURCE_ID,
    filter: ['==', ['get', 'type'], 'aed'],
    paint: {
      'circle-color': '#dc2626',
      'circle-radius': radiusValue,
      'circle-stroke-width': strokeWidthValue,
      'circle-stroke-color': '#ffffff',
    },
    layout: {
      visibility: layerVisibility.aed ? 'visible' : 'none',
    },
  });

  // 消火栓レイヤー（オレンジ色）
  map.addLayer({
    id: FIRE_HYDRANT_LAYER_ID,
    type: 'circle',
    source: POI_SOURCE_ID,
    filter: ['==', ['get', 'type'], 'fireHydrant'],
    paint: {
      'circle-color': '#f59e0b',
      'circle-radius': radiusValue,
      'circle-stroke-width': strokeWidthValue,
      'circle-stroke-color': '#ffffff',
    },
    layout: {
      visibility: layerVisibility.fireHydrant ? 'visible' : 'none',
    },
  });
}

const MAP_STYLES = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
} as const;

type MapStyleType = keyof typeof MAP_STYLES;

// スタイル切り替えコントロール
class StyleToggleControl implements mapboxgl.IControl {
  private container: HTMLDivElement | null = null;
  private button: HTMLButtonElement | null = null;
  private map: mapboxgl.Map | null = null;
  private currentStyle: MapStyleType;
  private onStyleChange: (style: MapStyleType) => void;

  constructor(initialStyle: MapStyleType, onStyleChange: (style: MapStyleType) => void) {
    this.currentStyle = initialStyle;
    this.onStyleChange = onStyleChange;
  }

  onAdd(map: mapboxgl.Map): HTMLDivElement {
    this.map = map;
    this.container = document.createElement('div');
    this.container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';

    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.style.cssText = 'width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer;';
    this.button.title = this.currentStyle === 'streets' ? '衛星画像に切り替え' : '標準地図に切り替え';
    this.updateIcon();

    this.button.addEventListener('click', () => {
      const newStyle: MapStyleType = this.currentStyle === 'streets' ? 'satellite' : 'streets';
      this.currentStyle = newStyle;
      this.updateIcon();
      this.button!.title = newStyle === 'streets' ? '衛星画像に切り替え' : '標準地図に切り替え';
      this.map?.setStyle(MAP_STYLES[newStyle]);
      this.onStyleChange(newStyle);
    });

    this.container.appendChild(this.button);
    return this.container;
  }

  onRemove(): void {
    this.container?.parentNode?.removeChild(this.container);
    this.map = null;
  }

  private updateIcon(): void {
    if (!this.button) return;
    // 現在のスタイルと反対のアイコンを表示（切り替え先を示す）
    if (this.currentStyle === 'streets') {
      // 衛星アイコン（切り替え先が衛星）
      this.button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`;
    } else {
      // 地図アイコン（切り替え先が標準地図）
      this.button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15"/><path d="M15 6v15"/></svg>`;
    }
  }
}

// 地図のラベルを日本語に変更する関数
function applyJapaneseLabels(map: mapboxgl.Map): void {
  const layers = map.getStyle()?.layers;
  if (!layers) return;

  layers.forEach((layer) => {
    if (
      layer.type === 'symbol' &&
      layer.layout &&
      'text-field' in layer.layout
    ) {
      const textField = layer.layout['text-field'];
      const textFieldStr = JSON.stringify(textField);
      if (textFieldStr.includes('name')) {
        map.setLayoutProperty(layer.id, 'text-field', [
          'coalesce',
          ['get', 'name_ja'],
          ['get', 'name'],
        ]);
      }
    }
  });
}

interface MapViewProps {
  onMapReady?: (map: mapboxgl.Map) => void;
  onLongPress?: (coordinate: Coordinate) => void;
  pinCoordinate?: Coordinate | null;
  flyToCoordinate?: Coordinate | null;
  flyToZoom?: number;
  // POI関連
  pois?: POIListItem[];
  selectedPoiId?: string | null;
  layerVisibility?: LayerVisibility;
  onPoiSelect?: (poi: POIListItem) => void;
  onLayerVisibilityChange?: (visibility: LayerVisibility) => void;
  onMoveEnd?: (bounds: MapBounds) => void;
  // 初期表示設定（市町村ページ用）
  initialCenter?: Coordinate;
  initialZoom?: number;
  initialBounds?: MapBounds;
}

export function MapView({
  onMapReady,
  onLongPress,
  pinCoordinate,
  flyToCoordinate,
  flyToZoom = 16,
  pois = [],
  selectedPoiId,
  layerVisibility = DEFAULT_LAYER_VISIBILITY,
  onPoiSelect,
  onLayerVisibilityChange,
  onMoveEnd,
  initialCenter,
  initialZoom,
  initialBounds,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const startPosition = useRef<{ x: number; y: number } | null>(null);
  const layerToggleRef = useRef<LayerToggleControl | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // 最新値を参照するためのref（useEffect依存配列を減らすため）
  const poisRef = useRef<POIListItem[]>(pois);
  const layerVisibilityRef = useRef<LayerVisibility>(layerVisibility);
  const onLayerVisibilityChangeRef = useRef(onLayerVisibilityChange);
  const onPoiSelectRef = useRef(onPoiSelect);
  const selectedPoiIdRef = useRef<string | null | undefined>(selectedPoiId);
  const onMoveEndRef = useRef(onMoveEnd);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    startPosition.current = null;
  }, []);

  // refを最新値で更新
  useEffect(() => {
    poisRef.current = pois;
  }, [pois]);

  useEffect(() => {
    layerVisibilityRef.current = layerVisibility;
  }, [layerVisibility]);

  useEffect(() => {
    onLayerVisibilityChangeRef.current = onLayerVisibilityChange;
  }, [onLayerVisibilityChange]);

  useEffect(() => {
    onPoiSelectRef.current = onPoiSelect;
  }, [onPoiSelect]);

  useEffect(() => {
    selectedPoiIdRef.current = selectedPoiId;
  }, [selectedPoiId]);

  useEffect(() => {
    onMoveEndRef.current = onMoveEnd;
  }, [onMoveEnd]);

  const handleLongPressStart = useCallback(
    (e: mapboxgl.MapMouseEvent | mapboxgl.MapTouchEvent) => {
      if (!onLongPress) return;

      let point: { x: number; y: number };

      if ('touches' in e.originalEvent && e.originalEvent.touches.length > 0) {
        // マルチタッチ（ピンチ等）の場合は長押し判定しない
        if (e.originalEvent.touches.length > 1) {
          clearLongPressTimer();
          return;
        }
        // タッチイベント（指が画面上にある場合のみ）
        point = {
          x: e.originalEvent.touches[0].clientX,
          y: e.originalEvent.touches[0].clientY,
        };
      } else if ('clientX' in e.originalEvent) {
        // マウスイベント
        point = {
          x: (e.originalEvent as MouseEvent).clientX,
          y: (e.originalEvent as MouseEvent).clientY,
        };
      } else {
        // どちらでもない場合は処理しない
        return;
      }

      startPosition.current = point;

      longPressTimer.current = setTimeout(() => {
        const lngLat = e.lngLat;
        onLongPress({
          latitude: lngLat.lat,
          longitude: lngLat.lng,
        });
      }, LONG_PRESS_DURATION);
    },
    [onLongPress]
  );

  const handleMove = useCallback(
    (e: mapboxgl.MapMouseEvent | mapboxgl.MapTouchEvent) => {
      if (!startPosition.current) return;

      let point: { x: number; y: number };

      if ('touches' in e.originalEvent && e.originalEvent.touches.length > 0) {
        // マルチタッチ（ピンチ等）の場合は長押しをキャンセル
        if (e.originalEvent.touches.length > 1) {
          clearLongPressTimer();
          return;
        }
        // タッチイベント（指がまだ画面上にある場合のみ）
        point = {
          x: e.originalEvent.touches[0].clientX,
          y: e.originalEvent.touches[0].clientY,
        };
      } else if ('clientX' in e.originalEvent) {
        // マウスイベント
        point = {
          x: (e.originalEvent as MouseEvent).clientX,
          y: (e.originalEvent as MouseEvent).clientY,
        };
      } else {
        // どちらでもない場合（touchmove発火時にtouchesが空など）はキャンセル
        clearLongPressTimer();
        return;
      }

      const dx = Math.abs(point.x - startPosition.current.x);
      const dy = Math.abs(point.y - startPosition.current.y);

      // 10px以上動いたらキャンセル
      if (dx > 10 || dy > 10) {
        clearLongPressTimer();
      }
    },
    [clearLongPressTimer]
  );

  // ピンの表示を更新
  useEffect(() => {
    if (!mapRef.current) return;

    // 既存のマーカーを削除
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    // 新しいピンを追加
    if (pinCoordinate) {
      markerRef.current = new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat([pinCoordinate.longitude, pinCoordinate.latitude])
        .addTo(mapRef.current);
    }
  }, [pinCoordinate]);

  // flyTo機能（変換結果への移動）
  // スライドパネルに隠れないよう、下部にパディングを追加してピンを画面上部に表示
  useEffect(() => {
    if (!mapRef.current || !flyToCoordinate) return;

    // 画面高さの1/3を下部パディングとして設定（ピンが上から約1/3の位置に表示される）
    const bottomPadding = window.innerHeight * 0.33;

    mapRef.current.flyTo({
      center: [flyToCoordinate.longitude, flyToCoordinate.latitude],
      zoom: flyToZoom,
      duration: 1500,
      padding: { bottom: bottomPadding },
    });
  }, [flyToCoordinate, flyToZoom]);

  // POIデータを更新
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;
    const map = mapRef.current;

    // スタイルが読み込まれていない場合はスキップ
    if (!map.isStyleLoaded()) return;

    const source = map.getSource(POI_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(createPOIGeoJSON(pois));
    }
  }, [pois, isMapReady]);

  // レイヤー表示/非表示を更新
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;
    const map = mapRef.current;

    // スタイルが読み込まれていない場合はスキップ
    if (!map.isStyleLoaded()) return;

    if (map.getLayer(AED_LAYER_ID)) {
      map.setLayoutProperty(
        AED_LAYER_ID,
        'visibility',
        layerVisibility.aed ? 'visible' : 'none'
      );
    }
    if (map.getLayer(FIRE_HYDRANT_LAYER_ID)) {
      map.setLayoutProperty(
        FIRE_HYDRANT_LAYER_ID,
        'visibility',
        layerVisibility.fireHydrant ? 'visible' : 'none'
      );
    }
  }, [layerVisibility, isMapReady]);

  // POIハイライト表示を更新
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;
    const map = mapRef.current;

    // スタイルが読み込まれていない場合はスキップ
    if (!map.isStyleLoaded()) return;

    // 選択されたPOIのハイライト表示（サイズとストローク幅を変更）
    // selectedPoiIdがある場合は条件式、ない場合は固定値
    const radiusValue = selectedPoiId
      ? (['case', ['==', ['get', 'id'], selectedPoiId], 14, 10] as mapboxgl.ExpressionSpecification)
      : 10;
    const strokeWidthValue = selectedPoiId
      ? (['case', ['==', ['get', 'id'], selectedPoiId], 4, 2] as mapboxgl.ExpressionSpecification)
      : 2;

    if (map.getLayer(AED_LAYER_ID)) {
      map.setPaintProperty(AED_LAYER_ID, 'circle-radius', radiusValue);
      map.setPaintProperty(AED_LAYER_ID, 'circle-stroke-width', strokeWidthValue);
    }
    if (map.getLayer(FIRE_HYDRANT_LAYER_ID)) {
      map.setPaintProperty(FIRE_HYDRANT_LAYER_ID, 'circle-radius', radiusValue);
      map.setPaintProperty(FIRE_HYDRANT_LAYER_ID, 'circle-stroke-width', strokeWidthValue);
    }
  }, [selectedPoiId, isMapReady]);

  // POIクリックハンドラ（ref経由で最新のpoisとonPoiSelectを参照）
  const handlePOIClick = useCallback(
    (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.GeoJSONFeature[] }) => {
      if (!e.features || e.features.length === 0) return;
      const feature = e.features[0];
      const poiId = feature.properties?.id as string;
      const poi = poisRef.current.find((p) => p.id === poiId);
      if (poi && onPoiSelectRef.current) {
        onPoiSelectRef.current(poi);
      }
    },
    []
  );

  useEffect(() => {
    // ========== パフォーマンス計測 ==========
    // localStorage.getItem('debug-map-perf') === '1' で有効化
    const perfEnabled = typeof window !== 'undefined' && localStorage.getItem('debug-map-perf') === '1';
    const t0 = performance.now();
    let firstStyledataTime: number | null = null;
    let firstSourcedataTime: number | null = null;
    let firstRenderTime: number | null = null;
    let loadTime: number | null = null;
    let idleTime: number | null = null;
    let labelProcessingTime: number | null = null;
    let containerSize: { width: number; height: number } | null = null;

    const log = (label: string, detail?: unknown) => {
      if (!perfEnabled) return;
      const elapsed = (performance.now() - t0).toFixed(0);
      if (detail !== undefined) {
        console.log(`[MapViewPerf] ${label}: +${elapsed}ms`, detail);
      } else {
        console.log(`[MapViewPerf] ${label}: +${elapsed}ms`);
      }
    };

    log('useEffect開始');

    if (!mapContainer.current) {
      log('mapContainer.current が null');
      return;
    }
    log('mapContainer存在確認OK');

    if (mapRef.current) {
      log('既に初期化済み、スキップ');
      return;
    }

    // コンテナサイズ・可視性確認
    containerSize = {
      width: mapContainer.current.offsetWidth,
      height: mapContainer.current.offsetHeight,
    };
    log('container.offset', containerSize);

    const rect = mapContainer.current.getBoundingClientRect();
    log('container.getBoundingClientRect', { width: rect.width, height: rect.height });

    const computedStyle = window.getComputedStyle(mapContainer.current);
    log('container.computedStyle', {
      display: computedStyle.display,
      visibility: computedStyle.visibility,
    });

    // 親要素のサイズ・可視性確認
    const parent = mapContainer.current.parentElement;
    if (parent) {
      log('parentElement.offset', {
        width: parent.offsetWidth,
        height: parent.offsetHeight,
      });
      const parentRect = parent.getBoundingClientRect();
      log('parentElement.getBoundingClientRect', {
        width: parentRect.width,
        height: parentRect.height,
      });
      const parentStyle = window.getComputedStyle(parent);
      log('parentElement.computedStyle', {
        display: parentStyle.display,
        visibility: parentStyle.visibility,
      });
    } else {
      log('parentElement が null');
    }

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error('Mapbox token is not configured');
      return;
    }

    mapboxgl.accessToken = token;

    log('new mapboxgl.Map() 直前');

    // 初期表示設定: propsがあればそちらを使用、なければデフォルト値
    const mapCenter = initialCenter
      ? [initialCenter.longitude, initialCenter.latitude] as [number, number]
      : [DEFAULT_MAP_STATE.center.longitude, DEFAULT_MAP_STATE.center.latitude] as [number, number];
    const mapZoom = initialZoom ?? DEFAULT_MAP_STATE.zoom;

    // initialBoundsが指定されている場合はbounds優先（center/zoomは後で上書き）
    const mapOptions: mapboxgl.MapboxOptions = {
      container: mapContainer.current,
      style: MAP_STYLES.streets,
      center: mapCenter,
      zoom: mapZoom,
    };

    // boundsが指定されている場合はboundsを使用
    if (initialBounds) {
      mapOptions.bounds = [
        [initialBounds.west, initialBounds.south],
        [initialBounds.east, initialBounds.north],
      ];
      mapOptions.fitBoundsOptions = { padding: 20 };
    }

    const map = new mapboxgl.Map(mapOptions);
    log('new mapboxgl.Map() 直後');

    // ナビゲーションコントロールを追加（右下に配置、スマホで検索バーと重ならないように）
    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    // スタイル切り替えコントロールを追加（右下、ナビゲーションの上に配置）
    map.addControl(
      new StyleToggleControl('streets', () => {
        // スタイル変更はコントロール内部で処理済み
      }),
      'bottom-right'
    );

    // レイヤー切り替えコントロールを追加（左下、Mapboxロゴの上に配置）
    layerToggleRef.current = new LayerToggleControl(
      layerVisibilityRef.current,
      (newVisibility) => {
        onLayerVisibilityChangeRef.current?.(newVisibility);
      }
    );
    map.addControl(layerToggleRef.current, 'bottom-left');

    mapRef.current = map;

    // ========== イベントリスナー（計測用、once相当） ==========
    map.on('styledata', () => {
      if (firstStyledataTime === null) {
        firstStyledataTime = performance.now() - t0;
        log('first styledata');
      }
    });

    map.on('sourcedata', () => {
      if (firstSourcedataTime === null) {
        firstSourcedataTime = performance.now() - t0;
        log('first sourcedata');
      }
    });

    map.on('render', () => {
      if (firstRenderTime === null) {
        firstRenderTime = performance.now() - t0;
        log('first render');
      }
    });

    // 長押し検出（マウス）
    map.on('mousedown', handleLongPressStart);
    map.on('mouseup', clearLongPressTimer);
    map.on('mousemove', handleMove);
    map.on('dragstart', clearLongPressTimer);

    // 長押し検出（タッチ）
    map.on('touchstart', handleLongPressStart);
    map.on('touchend', clearLongPressTimer);
    map.on('touchmove', handleMove);
    map.on('touchcancel', clearLongPressTimer);

    // エラー時のログ出力
    map.on('error', (e) => {
      console.error('[MapView] Mapbox error:', e.error);
    });

    // スタイル変更時にも日本語ラベルとPOIレイヤーを再適用
    map.on('style.load', () => {
      log('style.load - 日本語ラベル・POIレイヤー適用');
      applyJapaneseLabels(map);
      // POIレイヤーを再セットアップ（スタイル変更でレイヤーが消えるため）
      setupPOILayers(map, poisRef.current, layerVisibilityRef.current, selectedPoiIdRef.current);
    });

    map.once('load', () => {
      loadTime = performance.now() - t0;
      log('load');

      const labelStart = performance.now();
      log('日本語ラベル処理開始');

      applyJapaneseLabels(map);

      labelProcessingTime = performance.now() - labelStart;
      log('日本語ラベル処理完了', {
        processingTime: labelProcessingTime.toFixed(1) + 'ms',
      });

      // POIレイヤーをセットアップ
      setupPOILayers(map, poisRef.current, layerVisibilityRef.current, selectedPoiIdRef.current);

      // POIクリックハンドラ（AED）
      map.on('click', AED_LAYER_ID, handlePOIClick);
      // POIクリックハンドラ（消火栓）
      map.on('click', FIRE_HYDRANT_LAYER_ID, handlePOIClick);

      // POIホバー時のカーソル変更
      map.on('mouseenter', AED_LAYER_ID, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', AED_LAYER_ID, () => {
        map.getCanvas().style.cursor = '';
      });
      map.on('mouseenter', FIRE_HYDRANT_LAYER_ID, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', FIRE_HYDRANT_LAYER_ID, () => {
        map.getCanvas().style.cursor = '';
      });

      // マップ移動/ズーム終了時にboundsを通知
      map.on('moveend', () => {
        const mapBounds = map.getBounds();
        if (!mapBounds) return;
        const bounds: MapBounds = {
          north: mapBounds.getNorth(),
          south: mapBounds.getSouth(),
          east: mapBounds.getEast(),
          west: mapBounds.getWest(),
        };
        onMoveEndRef.current?.(bounds);
      });

      // 初回ロード時にも現在のboundsを通知
      const initialBounds = map.getBounds();
      if (initialBounds) {
        onMoveEndRef.current?.({
          north: initialBounds.getNorth(),
          south: initialBounds.getSouth(),
          east: initialBounds.getEast(),
          west: initialBounds.getWest(),
        });
      }

      setIsMapReady(true);
      log('onMapReady呼び出し');
      onMapReady?.(map);
    });

    map.on('idle', () => {
      if (idleTime === null) {
        idleTime = performance.now() - t0;
        log('idle');

        // ========== 初期化サマリー ==========
        if (perfEnabled) {
          console.log('[MapViewPerf] ========== 初期化サマリー ==========');
          console.log('[MapViewPerf] containerSize:', containerSize);
          console.log('[MapViewPerf] useEffect → first styledata:', firstStyledataTime?.toFixed(0) + 'ms');
          console.log('[MapViewPerf] useEffect → first sourcedata:', firstSourcedataTime?.toFixed(0) + 'ms');
          console.log('[MapViewPerf] useEffect → first render:', firstRenderTime?.toFixed(0) + 'ms');
          console.log('[MapViewPerf] useEffect → load:', loadTime?.toFixed(0) + 'ms');
          console.log('[MapViewPerf] useEffect → idle:', idleTime.toFixed(0) + 'ms');
          console.log('[MapViewPerf] load後処理（日本語ラベル）:', labelProcessingTime?.toFixed(1) + 'ms');
          console.log('[MapViewPerf] geolocation待ち: なし（未使用）');
          console.log('[MapViewPerf] =====================================');
        }
      }
    });

    // クリーンアップ
    return () => {
      clearLongPressTimer();
      if (markerRef.current) {
        markerRef.current.remove();
      }
      map.remove();
      mapRef.current = null;
    };
    // initialBounds/initialCenter/initialZoomは初期化時のみ使用し、
    // その後の変更は意図的に無視する（マップは一度だけ初期化される）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onMapReady, handleLongPressStart, handleMove, clearLongPressTimer, handlePOIClick]);

  return (
    <div className="w-full h-full min-h-[400px] relative">
      <div
        ref={mapContainer}
        className="w-full h-full"
        style={{ position: 'absolute', inset: 0 }}
      />
      {!isMapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent" />
            <span className="text-sm text-gray-500">地図を読み込み中...</span>
          </div>
        </div>
      )}
    </div>
  );
}
