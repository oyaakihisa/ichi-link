'use client';

import { MapView } from './MapView';
import { SlidePanel } from './SlidePanel';
import { useMapInteraction } from '@/components/hooks/useMapInteraction';

export function MapTab() {
  const { pin, isPanelOpen, isLoadingAddress, handleLongPress, closePanel } =
    useMapInteraction();

  return (
    <div
      id="panel-map"
      role="tabpanel"
      aria-labelledby="tab-map"
      className="bg-white rounded-xl shadow-sm overflow-hidden relative"
      style={{ height: 'calc(100vh - 200px)', minHeight: '400px' }}
    >
      <MapView
        onLongPress={handleLongPress}
        pinCoordinate={pin?.coordinate ?? null}
      />

      {pin && (
        <SlidePanel
          pin={pin}
          isOpen={isPanelOpen}
          isLoadingAddress={isLoadingAddress}
          onClose={closePanel}
        />
      )}
    </div>
  );
}
