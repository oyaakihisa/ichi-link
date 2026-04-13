'use client';

import { ConversionResult as ConversionResultType } from '@/lib/types';
import { CopyButton } from '@/components/common/CopyButton';
import { WarningDisplay } from './WarningDisplay';
import { MapButtons } from './MapButtons';
import { useCallback, useState } from 'react';

interface ConversionResultProps {
  result: ConversionResultType;
}

export function ConversionResult({ result }: ConversionResultProps) {
  const [allCopied, setAllCopied] = useState(false);

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

  const allText = `WGS84: ${wgs84Text}\nTokyo Datum: ${tokyoText}`;

  const handleCopyAll = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(allText);
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 2000);
    } catch {
      console.error('コピーに失敗しました');
    }
  }, [allText]);

  const inputTypeLabel = {
    coordinate_decimal: '十進度の緯度経度',
    coordinate_dms: '度分秒の緯度経度',
    address: '住所',
    unknown: '不明',
  }[result.input.inputType];

  const inputSourceLabel = {
    address: '住所入力欄',
    wgs84: 'WGS84入力欄',
    tokyo: 'Tokyo Datum入力欄',
  }[result.inputSource];

  return (
    <div className="space-y-6">
      {/* 判定結果 */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-2">判定結果</h3>
        <p className="text-sm text-gray-600">
          入力種別: <span className="font-medium">{inputTypeLabel}</span>
        </p>
        <p className="text-sm text-gray-600">
          入力元: <span className="font-medium">{inputSourceLabel}</span>
        </p>
      </div>

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
        <button
          onClick={handleCopyAll}
          className={`w-full px-4 py-2 text-sm rounded-lg transition-colors ${
            allCopied
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
          }`}
        >
          {allCopied ? 'コピーしました' : '全部コピー'}
        </button>
      </div>

      {/* 地図ボタン */}
      <MapButtons mapUrls={result.mapUrls} />
    </div>
  );
}
