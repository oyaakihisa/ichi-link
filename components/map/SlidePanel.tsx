'use client';

import { useCallback, useMemo, useState } from 'react';
import { PinLocation, Coordinate, ConversionResult, Warning } from '@/lib/types';
import { CopyButton } from '@/components/common/CopyButton';
import { WarningDisplay } from '@/components/result/WarningDisplay';
import { MapButtons } from '@/components/result/MapButtons';
import {
  generateShareText,
  generateLineShareUrl,
  generateLineShareUrlForPC,
  isWebShareSupported,
  isMobileDevice,
  generateFullCopyText,
} from '@/lib/services/ShareService';
import { MapUrlGenerator } from '@/lib/services/MapUrlGenerator';
import { useSyncExternalStore } from 'react';

// 表示モード: 長押しピン or 変換結果
type PanelMode = 'pin' | 'conversion';

interface SlidePanelProps {
  // 長押しピンモード用
  pin?: PinLocation | null;
  isLoadingAddress?: boolean;
  // 変換結果モード用
  conversionResult?: ConversionResult | null;
  // 共通
  isOpen: boolean;
  onClose: () => void;
}

const mapUrlGenerator = new MapUrlGenerator();

// useSyncExternalStoreで使用するための関数
const subscribeToNothing = () => () => {};
const getWebShareSupported = () => isWebShareSupported();
const getMobileDevice = () => isMobileDevice();
const getServerSnapshot = () => false;

function formatCoordinate(coord: Coordinate): string {
  return `${coord.latitude.toFixed(6)}, ${coord.longitude.toFixed(6)}`;
}

function getInputTypeLabel(inputSource: string): string {
  switch (inputSource) {
    case 'address':
      return '住所として判定';
    case 'wgs84':
      return 'WGS84座標として判定';
    case 'tokyo':
      return 'Tokyo Datum座標として判定';
    default:
      return '座標として判定';
  }
}

export function SlidePanel({
  pin,
  isLoadingAddress = false,
  conversionResult,
  isOpen,
  onClose,
}: SlidePanelProps) {
  // 全部コピーのフィードバック用state
  const [copyAllSuccess, setCopyAllSuccess] = useState(false);

  const webShareSupported = useSyncExternalStore(
    subscribeToNothing,
    getWebShareSupported,
    getServerSnapshot
  );

  const isMobile = useSyncExternalStore(
    subscribeToNothing,
    getMobileDevice,
    getServerSnapshot
  );

  // 表示モードを判定
  const mode: PanelMode = conversionResult ? 'conversion' : 'pin';

  // 座標データを取得
  const wgs84Coord = conversionResult
    ? conversionResult.coordinates.wgs84
    : pin?.coordinate;
  const tokyoCoord = conversionResult
    ? conversionResult.coordinates.tokyo
    : pin?.tokyoCoordinate;
  const address = conversionResult?.address || pin?.address;
  const warnings: Warning[] = conversionResult?.warnings || [];
  const mapUrls = conversionResult?.mapUrls;

  const googleMapsUrl = useMemo(() => {
    if (mapUrls) return mapUrls.googleMaps;
    if (wgs84Coord) return mapUrlGenerator.generateGoogleMaps(wgs84Coord);
    return '';
  }, [wgs84Coord, mapUrls]);

  const wgs84Text = wgs84Coord ? formatCoordinate(wgs84Coord) : '';
  const tokyoText = tokyoCoord ? formatCoordinate(tokyoCoord) : '';

  const handleLineShare = useCallback(() => {
    if (!wgs84Coord || !tokyoCoord) return;
    const text = generateShareText(wgs84Coord, tokyoCoord, googleMapsUrl);
    if (isMobile) {
      const url = generateLineShareUrl(text);
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      const url = generateLineShareUrlForPC(googleMapsUrl, text);
      window.open(url, '_blank', 'width=600,height=500');
    }
  }, [wgs84Coord, tokyoCoord, googleMapsUrl, isMobile]);

  const handleWebShare = useCallback(async () => {
    if (!wgs84Coord || !tokyoCoord) return;
    const text = generateShareText(wgs84Coord, tokyoCoord, googleMapsUrl);
    try {
      await navigator.share({ text });
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Share failed:', error);
      }
    }
  }, [wgs84Coord, tokyoCoord, googleMapsUrl]);

  const handleCopyAll = useCallback(async () => {
    if (!wgs84Coord || !tokyoCoord) return;
    const text = generateFullCopyText(wgs84Coord, tokyoCoord, googleMapsUrl, address);
    try {
      await navigator.clipboard.writeText(text);
      setCopyAllSuccess(true);
      setTimeout(() => setCopyAllSuccess(false), 2000);
    } catch {
      console.error('コピーに失敗しました');
    }
  }, [wgs84Coord, tokyoCoord, googleMapsUrl, address]);

  if (!wgs84Coord || !tokyoCoord) return null;

  return (
    <>
      {/* オーバーレイ */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* スライドパネル */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="位置情報詳細"
      >
        {/* ドラッグハンドル */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 text-gray-500 hover:text-gray-700"
          aria-label="閉じる"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="px-4 pb-6 pt-2 max-h-[70vh] overflow-y-auto">
          {/* 変換結果モード: 判定結果表示 */}
          {mode === 'conversion' && conversionResult && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                {getInputTypeLabel(conversionResult.inputSource)}
              </p>
            </div>
          )}

          {/* 警告表示 */}
          {warnings.length > 0 && (
            <div className="mb-4">
              <WarningDisplay warnings={warnings} />
            </div>
          )}

          {/* 共有ボタン・全部コピーボタン */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={handleLineShare}
              className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors bg-[#06C755] hover:bg-[#05b04d]"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
              LINEで共有
            </button>

            {webShareSupported && (
              <button
                onClick={handleWebShare}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 text-sm font-medium rounded-lg transition-colors bg-gray-200 hover:bg-gray-300"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
                </svg>
                共有
              </button>
            )}

            {/* 全部コピーボタン（右端） */}
            <button
              onClick={handleCopyAll}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ml-auto ${
                copyAllSuccess
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copyAllSuccess ? 'コピーしました' : '全部コピー'}
            </button>
          </div>

          {/* 住所 */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 uppercase tracking-wide">住所</span>
              {address && <CopyButton text={address} />}
            </div>
            {isLoadingAddress ? (
              <div className="mt-1 h-5 bg-gray-200 rounded animate-pulse" />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{address || '住所情報なし'}</p>
            )}
          </div>

          {/* WGS84座標 */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 uppercase tracking-wide">世界測地系（WGS84）</span>
              <CopyButton text={wgs84Text} />
            </div>
            <p className="mt-1 text-sm font-mono text-gray-900">{wgs84Text}</p>
          </div>

          {/* Tokyo Datum座標 */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 uppercase tracking-wide">旧日本測地系（Tokyo Datum）</span>
              <CopyButton text={tokyoText} />
            </div>
            <p className="mt-1 text-sm font-mono text-gray-900">{tokyoText}</p>
          </div>

          {/* 地図ボタン（変換結果モードのみ） */}
          {mode === 'conversion' && mapUrls && (
            <div className="border-t border-gray-200 pt-4">
              <MapButtons mapUrls={mapUrls} />
            </div>
          )}

          {/* 長押しモード: Google Maps リンクのみ */}
          {mode === 'pin' && (
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Google Maps</span>
                <CopyButton text={googleMapsUrl} />
              </div>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 text-sm text-blue-600 hover:text-blue-800 underline break-all"
              >
                {googleMapsUrl}
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
