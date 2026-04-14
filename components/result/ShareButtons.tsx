"use client";

import { Coordinate } from "@/lib/types";
import {
  generateShareText,
  generateLineShareUrl,
  generateLineShareUrlForPC,
  isWebShareSupported,
  isMobileDevice,
} from "@/lib/services/ShareService";
import { useCallback, useSyncExternalStore } from "react";

interface ShareButtonsProps {
  wgs84: Coordinate;
  tokyo: Coordinate;
  googleMapsUrl: string;
}

// useSyncExternalStoreで使用するための関数
const subscribeToNothing = () => () => {};
const getWebShareSupported = () => isWebShareSupported();
const getMobileDevice = () => isMobileDevice();
const getServerSnapshot = () => false;

export function ShareButtons({ wgs84, tokyo, googleMapsUrl }: ShareButtonsProps) {
  // useSyncExternalStoreを使ってSSRセーフにブラウザAPIをチェック
  const webShareSupported = useSyncExternalStore(
    subscribeToNothing,
    getWebShareSupported,
    getServerSnapshot,
  );

  // LINE共有はモバイルでのみサポート
  const isMobile = useSyncExternalStore(
    subscribeToNothing,
    getMobileDevice,
    getServerSnapshot,
  );

  const handleLineShare = useCallback(() => {
    const text = generateShareText(wgs84, tokyo, googleMapsUrl);
    if (isMobile) {
      // モバイル: テキスト+URL共有
      const url = generateLineShareUrl(text);
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      // PC: URL+テキスト共有（LINE Social Plugins）
      const url = generateLineShareUrlForPC(googleMapsUrl, text);
      window.open(url, "_blank", "width=600,height=500");
    }
  }, [wgs84, tokyo, googleMapsUrl, isMobile]);

  const handleWebShare = useCallback(async () => {
    const text = generateShareText(wgs84, tokyo, googleMapsUrl);
    try {
      await navigator.share({
        text: text,
      });
    } catch (error) {
      // ユーザーがキャンセルした場合やエラーの場合は何もしない
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Share failed:", error);
      }
    }
  }, [wgs84, tokyo, googleMapsUrl]);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700">
        共有 (世界測地系、旧日本測地系、Google Maps url)
      </h3>
      <div className="flex gap-2">
        <button
          onClick={handleLineShare}
          className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors bg-[#06C755] hover:bg-[#05b04d]"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 fill-current"
            aria-hidden="true"
          >
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
          </svg>
          LINEで共有
        </button>

        {webShareSupported && (
          <button
            onClick={handleWebShare}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 text-sm font-medium rounded-lg transition-colors bg-gray-200 hover:bg-gray-300"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 fill-current"
              aria-hidden="true"
            >
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
            </svg>
            共有
          </button>
        )}
      </div>
    </div>
  );
}
