'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { DEFAULT_MAP_STATE, Coordinate, POIListItem, MapBounds, LayerVisibility, AvailablePOITypes, DEFAULT_LAYER_VISIBILITY } from '@/lib/types';
import { LayerToggleControl } from './LayerToggle';

const LONG_PRESS_DURATION = 500; // ms
const LOAD_TIMEOUT_MS = 15000; // 15秒でタイムアウト
const POI_SOURCE_ID = 'poi-source';

// エラー状態の型定義（テスト段階用の詳細情報付き）
interface MapErrorState {
  type: 'webgl' | 'timeout' | 'mapbox' | 'unknown';
  message: string;
  details?: string;
}
const AED_LAYER_ID = 'aed-layer';
const FIRE_HYDRANT_LAYER_ID = 'fire-hydrant-layer';
const FIRE_CISTERN_LAYER_ID = 'fire-cistern-layer';
const CLUSTER_CIRCLE_LAYER_ID = 'cluster-circle-layer';
const CLUSTER_COUNT_LAYER_ID = 'cluster-count-layer';

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
  if (map.getLayer(CLUSTER_COUNT_LAYER_ID)) {
    map.removeLayer(CLUSTER_COUNT_LAYER_ID);
  }
  if (map.getLayer(CLUSTER_CIRCLE_LAYER_ID)) {
    map.removeLayer(CLUSTER_CIRCLE_LAYER_ID);
  }
  if (map.getLayer(AED_LAYER_ID)) {
    map.removeLayer(AED_LAYER_ID);
  }
  if (map.getLayer(FIRE_HYDRANT_LAYER_ID)) {
    map.removeLayer(FIRE_HYDRANT_LAYER_ID);
  }
  if (map.getLayer(FIRE_CISTERN_LAYER_ID)) {
    map.removeLayer(FIRE_CISTERN_LAYER_ID);
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

  // POIソースを追加（クラスタリング有効）
  map.addSource(POI_SOURCE_ID, {
    type: 'geojson',
    data: createPOIGeoJSON(pois),
    cluster: true,
    clusterMaxZoom: 12,
    clusterRadius: 50,
  });

  // AEDレイヤー（赤色）- 非クラスタPOIのみ
  map.addLayer({
    id: AED_LAYER_ID,
    type: 'circle',
    source: POI_SOURCE_ID,
    filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'type'], 'aed']],
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

  // 消火栓レイヤー（オレンジ色）- 非クラスタPOIのみ
  map.addLayer({
    id: FIRE_HYDRANT_LAYER_ID,
    type: 'circle',
    source: POI_SOURCE_ID,
    filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'type'], 'fireHydrant']],
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

  // 防火水槽レイヤー（青色）- 非クラスタPOIのみ
  map.addLayer({
    id: FIRE_CISTERN_LAYER_ID,
    type: 'circle',
    source: POI_SOURCE_ID,
    filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'type'], 'fireCistern']],
    paint: {
      'circle-color': '#2563eb',
      'circle-radius': radiusValue,
      'circle-stroke-width': strokeWidthValue,
      'circle-stroke-color': '#ffffff',
    },
    layout: {
      visibility: layerVisibility.fireCistern ? 'visible' : 'none',
    },
  });

  // クラスタ円レイヤー
  map.addLayer({
    id: CLUSTER_CIRCLE_LAYER_ID,
    type: 'circle',
    source: POI_SOURCE_ID,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#51bbd6',
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        20,   // デフォルト（〜10件）
        10, 25,  // 10件以上
        50, 30,  // 50件以上
      ],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  });

  // クラスタ件数テキストレイヤー
  map.addLayer({
    id: CLUSTER_COUNT_LAYER_ID,
    type: 'symbol',
    source: POI_SOURCE_ID,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-size': 12,
    },
    paint: {
      'text-color': '#ffffff',
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
  availablePOITypes?: AvailablePOITypes;
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
  availablePOITypes = { aed: true, fireHydrant: true, fireCistern: true },
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
  const [mapError, setMapError] = useState<MapErrorState | null>(null);
  const isMapReadyRef = useRef(false); // タイムアウト判定用
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 最新値を参照するためのref（useEffect依存配列を減らすため）
  const poisRef = useRef<POIListItem[]>(pois);
  const layerVisibilityRef = useRef<LayerVisibility>(layerVisibility);
  const availablePOITypesRef = useRef<AvailablePOITypes>(availablePOITypes);
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
    availablePOITypesRef.current = availablePOITypes;
    // LayerToggleを更新
    if (layerToggleRef.current) {
      layerToggleRef.current.updateAvailableTypes(availablePOITypes);
    }
  }, [availablePOITypes]);

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
    if (map.getLayer(FIRE_CISTERN_LAYER_ID)) {
      map.setLayoutProperty(
        FIRE_CISTERN_LAYER_ID,
        'visibility',
        layerVisibility.fireCistern ? 'visible' : 'none'
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
    if (map.getLayer(FIRE_CISTERN_LAYER_ID)) {
      map.setPaintProperty(FIRE_CISTERN_LAYER_ID, 'circle-radius', radiusValue);
      map.setPaintProperty(FIRE_CISTERN_LAYER_ID, 'circle-stroke-width', strokeWidthValue);
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
      setMapError({
        type: 'unknown',
        message: 'Mapboxトークンが設定されていません',
        details: '環境変数 NEXT_PUBLIC_MAPBOX_TOKEN を確認してください',
      });
      setIsMapReady(true);
      return;
    }

    // WebGLサポートチェック
    if (!mapboxgl.supported()) {
      console.error('WebGL is not supported');
      setMapError({
        type: 'webgl',
        message: 'WebGLがサポートされていません',
        details: `UA: ${navigator.userAgent}`,
      });
      setIsMapReady(true);
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

    // タイムアウト処理: 15秒以内にloadイベントが発火しない場合はエラー表示
    loadTimeoutRef.current = setTimeout(() => {
      if (!isMapReadyRef.current) {
        console.error('[MapView] Load timeout after ' + LOAD_TIMEOUT_MS + 'ms');
        setMapError({
          type: 'timeout',
          message: '地図の読み込みがタイムアウトしました',
          details: `経過時間: ${LOAD_TIMEOUT_MS}ms, UA: ${navigator.userAgent}`,
        });
        setIsMapReady(true);
      }
    }, LOAD_TIMEOUT_MS);

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
      },
      availablePOITypesRef.current
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

    // エラー時のログ出力と状態更新
    map.on('error', (e) => {
      console.error('[MapView] Mapbox error:', e.error);
      // まだ読み込み完了していない場合のみエラー表示
      if (!isMapReadyRef.current) {
        const errorMessage = e.error?.message || JSON.stringify(e.error) || 'Unknown error';
        setMapError({
          type: 'mapbox',
          message: 'Mapboxエラーが発生しました',
          details: errorMessage,
        });
        setIsMapReady(true);
        // タイムアウトをクリア
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
          loadTimeoutRef.current = null;
        }
      }
    });

    // スタイル変更時にも日本語ラベルとPOIレイヤーを再適用
    map.on('style.load', () => {
      log('style.load - 日本語ラベル・POIレイヤー適用');
      applyJapaneseLabels(map);
      // POIレイヤーを再セットアップ（スタイル変更でレイヤーが消えるため）
      setupPOILayers(map, poisRef.current, layerVisibilityRef.current, selectedPoiIdRef.current);
    });

    map.once('load', () => {
      // タイムアウトをクリア
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }

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
      // POIクリックハンドラ（防火水槽）
      map.on('click', FIRE_CISTERN_LAYER_ID, handlePOIClick);

      // クラスタクリックハンドラ（クリックでズームイン）
      map.on('click', CLUSTER_CIRCLE_LAYER_ID, (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: [CLUSTER_CIRCLE_LAYER_ID],
        });
        if (!features.length) return;
        const clusterId = features[0].properties?.cluster_id;
        if (clusterId === undefined) return;
        const source = map.getSource(POI_SOURCE_ID) as mapboxgl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) {
            console.error('Error getting cluster expansion zoom:', err);
            return;
          }
          const geometry = features[0].geometry;
          if (geometry.type !== 'Point') return;
          map.easeTo({
            center: geometry.coordinates as [number, number],
            zoom: zoom ?? 13,
          });
        });
      });

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
      map.on('mouseenter', FIRE_CISTERN_LAYER_ID, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', FIRE_CISTERN_LAYER_ID, () => {
        map.getCanvas().style.cursor = '';
      });
      // クラスタホバー時のカーソル変更
      map.on('mouseenter', CLUSTER_CIRCLE_LAYER_ID, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', CLUSTER_CIRCLE_LAYER_ID, () => {
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

      isMapReadyRef.current = true;
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
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
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
      {!isMapReady && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent" />
            <span className="text-sm text-gray-500">地図を読み込み中...</span>
          </div>
        </div>
      )}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="flex flex-col items-center gap-4 p-4 text-center max-w-md">
            <div className="text-red-500 text-lg font-bold">
              地図読み込みエラー [{mapError.type}]
            </div>
            <div className="text-gray-700">{mapError.message}</div>
            {mapError.details && (
              <div className="text-xs text-gray-500 bg-gray-200 p-2 rounded break-all max-h-32 overflow-auto">
                {mapError.details}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              ページを再読み込み
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
