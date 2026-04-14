'use client';

import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { DEFAULT_MAP_STATE, Coordinate } from '@/lib/types';

const LONG_PRESS_DURATION = 500; // ms

interface MapViewProps {
  onMapReady?: (map: mapboxgl.Map) => void;
  onLongPress?: (coordinate: Coordinate) => void;
  pinCoordinate?: Coordinate | null;
}

export function MapView({ onMapReady, onLongPress, pinCoordinate }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const startPosition = useRef<{ x: number; y: number } | null>(null);

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

  useEffect(() => {
    if (!mapContainer.current) return;
    if (mapRef.current) return; // すでに初期化済み

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error('Mapbox token is not configured');
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [DEFAULT_MAP_STATE.center.longitude, DEFAULT_MAP_STATE.center.latitude],
      zoom: DEFAULT_MAP_STATE.zoom,
    });

    // ナビゲーションコントロールを追加
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    mapRef.current = map;

    // 長押し検出（マウス）
    map.on('mousedown', handleLongPressStart);
    map.on('mouseup', clearLongPressTimer);
    map.on('mousemove', handleMove);
    map.on('dragstart', clearLongPressTimer);

    // 長押し検出（タッチ）
    map.on('touchstart', handleLongPressStart);
    map.on('touchend', clearLongPressTimer);
    map.on('touchmove', handleMove);

    map.on('load', () => {
      // 地図のラベルを日本語に変更（nameフィールドを使用しているレイヤーのみ）
      const layers = map.getStyle().layers;
      if (layers) {
        layers.forEach((layer) => {
          if (
            layer.type === 'symbol' &&
            layer.layout &&
            'text-field' in layer.layout
          ) {
            const textField = layer.layout['text-field'];
            // text-fieldにnameが含まれているレイヤーのみ日本語化
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
      onMapReady?.(map);
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
    <div
      ref={mapContainer}
      className="w-full h-full min-h-[400px]"
      style={{ position: 'relative' }}
    />
  );
}
