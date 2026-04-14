'use client';

import { ConversionResult as ConversionResultType } from '@/lib/types';
import { CopyButton } from '@/components/common/CopyButton';
import { WarningDisplay } from './WarningDisplay';
import { MapButtons } from './MapButtons';
import { ShareButtons } from './ShareButtons';

interface ConversionResultProps {
  result: ConversionResultType;
}

export function ConversionResult({ result }: ConversionResultProps) {
  const formatCoordinate = (lat: number, lng: number): string => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const wgs84Text = formatCoordinate(
    result.coordinates.wgs84.latitude,
    result.coordinates.wgs84.longitude
  );

  const tokyoText = formatCoordinate(
    result.coordinates.tokyo.latitude,
    result.coordinates.tokyo.longitude
  );

  return (
    <div className="space-y-6">
      {/* 警告 */}
      {result.warnings.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">警告</h3>
          <WarningDisplay warnings={result.warnings} />
        </div>
      )}

      {/* 変換結果 */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">変換結果</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
            <div>
              <span className="text-xs text-gray-500 block">WGS84（世界測地系）</span>
              <span className="font-mono text-sm">{wgs84Text}</span>
            </div>
            <CopyButton text={wgs84Text} />
          </div>
          <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
            <div>
              <span className="text-xs text-gray-500 block">Tokyo Datum（旧日本測地系）</span>
              <span className="font-mono text-sm">{tokyoText}</span>
            </div>
            <CopyButton text={tokyoText} />
          </div>
        </div>
      </div>

      {/* 地図ボタン */}
      <MapButtons mapUrls={result.mapUrls} />

      {/* 共有ボタン */}
      <ShareButtons
        coordinate={result.coordinates.wgs84}
        googleMapsUrl={result.mapUrls.googleMaps}
      />
    </div>
  );
}
