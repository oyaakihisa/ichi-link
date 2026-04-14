'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { DEFAULT_MAP_STATE, Coordinate } from '@/lib/types';

const LONG_PRESS_DURATION = 500; // ms

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
}

export function MapView({ onMapReady, onLongPress, pinCoordinate, flyToCoordinate, flyToZoom = 16 }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const startPosition = useRef<{ x: number; y: number } | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    startPosition.current = null;
  }, []);

  const handleLongPressStart = useCallback(
    (e: mapboxgl.MapMouseEvent | mapboxgl.MapTouchEvent) => {
      if (!onLongPress) return;

      const point = 'touches' in e.originalEvent
        ? { x: e.originalEvent.touches[0].clientX, y: e.originalEvent.touches[0].clientY }
        : { x: (e.originalEvent as MouseEvent).clientX, y: (e.originalEvent as MouseEvent).clientY };

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

      const point = 'touches' in e.originalEvent
        ? { x: e.originalEvent.touches[0].clientX, y: e.originalEvent.touches[0].clientY }
        : { x: (e.originalEvent as MouseEvent).clientX, y: (e.originalEvent as MouseEvent).clientY };

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
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_STYLES.streets,
      center: [DEFAULT_MAP_STATE.center.longitude, DEFAULT_MAP_STATE.center.latitude],
      zoom: DEFAULT_MAP_STATE.zoom,
    });
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

    // エラー時のログ出力
    map.on('error', (e) => {
      console.error('[MapView] Mapbox error:', e.error);
    });

    // スタイル変更時にも日本語ラベルを再適用
    map.on('style.load', () => {
      log('style.load - 日本語ラベル適用');
      applyJapaneseLabels(map);
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
  }, [onMapReady, handleLongPressStart, handleMove, clearLongPressTimer]);

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
