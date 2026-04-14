import { Coordinate } from '@/lib/types';

/**
 * 共有用のテキストを生成する
 * @param wgs84 WGS84座標
 * @param tokyo Tokyo Datum座標
 * @param mapUrl Google MapsのURL
 * @returns 共有用テキスト
 */
export function generateShareText(
  wgs84: Coordinate,
  tokyo: Coordinate,
  mapUrl: string
): string {
  const wgs84Lat = wgs84.latitude.toFixed(6);
  const wgs84Lng = wgs84.longitude.toFixed(6);
  const tokyoLat = tokyo.latitude.toFixed(6);
  const tokyoLng = tokyo.longitude.toFixed(6);
  return `位置情報\n世界測地系(WGS84):\n${wgs84Lat}, ${wgs84Lng}\n旧日本測地系(Tokyo):\n${tokyoLat}, ${tokyoLng}\n地図: ${mapUrl}`;
}

/**
 * 全部コピー用のテキストを生成する
 * @param wgs84 WGS84座標
 * @param tokyo Tokyo Datum座標
 * @param mapUrl Google MapsのURL
 * @param address 住所（省略可）
 * @returns コピー用テキスト
 */
export function generateFullCopyText(
  wgs84: Coordinate,
  tokyo: Coordinate,
  mapUrl: string,
  address?: string
): string {
  const wgs84Lat = wgs84.latitude.toFixed(6);
  const wgs84Lng = wgs84.longitude.toFixed(6);
  const tokyoLat = tokyo.latitude.toFixed(6);
  const tokyoLng = tokyo.longitude.toFixed(6);

  let text = '位置情報\n';
  if (address) {
    text += `住所: ${address}\n`;
  }
  text += `世界測地系(WGS84): ${wgs84Lat}, ${wgs84Lng}\n`;
  text += `旧日本測地系(Tokyo): ${tokyoLat}, ${tokyoLng}\n`;
  text += `地図: ${mapUrl}`;
  return text;
}

/**
 * LINE Share用のURLを生成する（モバイル向け）
 * @param text 共有するテキスト
 * @returns LINE Share URL
 */
export function generateLineShareUrl(text: string): string {
  const encodedText = encodeURIComponent(text);
  return `https://line.me/R/share?text=${encodedText}`;
}

/**
 * LINE Share用のURLを生成する（PC向け）
 * LINE Social Pluginsを使用してURL+テキスト共有
 * @param url 共有するURL
 * @param text 共有するテキスト（テキストボックスにデフォルト表示される）
 * @returns LINE Social Plugin Share URL
 */
export function generateLineShareUrlForPC(url: string, text: string): string {
  return `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

/**
 * モバイルデバイスかどうかを判定する
 * LINE共有がサポートされるのはモバイルのみ
 * @returns モバイルデバイスの場合true
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
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
