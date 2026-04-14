'use client';

import { useState, useCallback } from 'react';
import { Coordinate, PinLocation, MapInteractionState } from '@/lib/types';
import { DatumTransformer } from '@/lib/services/DatumTransformer';

const datumTransformer = new DatumTransformer();

export function useMapInteraction() {
  const [state, setState] = useState<MapInteractionState>({
    pin: null,
    isPanelOpen: false,
    isLoadingAddress: false,
  });

  const handleLongPress = useCallback(async (coordinate: Coordinate) => {
    // WGS84からTokyo Datumへ変換
    const tokyoCoordinate = datumTransformer.wgs84ToTokyo(coordinate);

    const newPin: PinLocation = {
      coordinate,
      tokyoCoordinate,
      address: undefined,
      timestamp: new Date(),
    };

    setState({
      pin: newPin,
      isPanelOpen: true,
      isLoadingAddress: true,
    });

    // 逆ジオコーディングを実行（API実装後に接続）
    try {
      const response = await fetch(
        `/api/reverse-geocode?lat=${coordinate.latitude}&lng=${coordinate.longitude}`
      );
      if (response.ok) {
        const data = await response.json();
        setState((prev) => ({
          ...prev,
          pin: prev.pin ? { ...prev.pin, address: data.address } : null,
          isLoadingAddress: false,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isLoadingAddress: false,
        }));
      }
    } catch {
      setState((prev) => ({
        ...prev,
        isLoadingAddress: false,
      }));
    }
  }, []);

  const closePanel = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPanelOpen: false,
    }));
  }, []);

  const clearPin = useCallback(() => {
    setState({
      pin: null,
      isPanelOpen: false,
      isLoadingAddress: false,
    });
  }, []);

  return {
    pin: state.pin,
    isPanelOpen: state.isPanelOpen,
    isLoadingAddress: state.isLoadingAddress,
    handleLongPress,
    closePanel,
    clearPin,
  };
}
