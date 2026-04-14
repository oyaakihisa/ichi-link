import { Coordinate } from '@/lib/types';

/**
 * 共有用のテキストを生成する
 * @param coordinate WGS84座標
 * @param mapUrl Google MapsのURL
 * @returns 共有用テキスト
 */
export function generateShareText(coordinate: Coordinate, mapUrl: string): string {
  const lat = coordinate.latitude.toFixed(6);
  const lng = coordinate.longitude.toFixed(6);
  return `位置情報\n座標: ${lat}, ${lng}\n地図: ${mapUrl}`;
}

/**
 * LINE Share用のURLを生成する
 * @param text 共有するテキスト
 * @returns LINE Share URL
 */
export function generateLineShareUrl(text: string): string {
  const encodedText = encodeURIComponent(text);
  return `https://line.me/R/share?text=${encodedText}`;
}

/**
 * Web Share APIが利用可能かどうかを確認する
 * @returns Web Share APIが利用可能な場合true
 */
export function isWebShareSupported(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return typeof navigator.share === 'function';
}

/**
 * Web Share APIで共有する
 * @param data 共有データ
 * @returns 共有が完了したらresolve、キャンセルまたはエラー時はreject
 */
export async function shareViaWebShareApi(data: ShareData): Promise<void> {
  if (!isWebShareSupported()) {
    throw new Error('Web Share API is not supported');
  }
  await navigator.share(data);
}
