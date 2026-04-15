import { redirect } from 'next/navigation';

/**
 * /maps - 全国トップページ
 *
 * MVPでは座標変換ツールのトップページにリダイレクト。
 * 将来的には都道府県一覧や全国マップを表示する予定。
 */
export default function MapsPage() {
  redirect('/');
}
