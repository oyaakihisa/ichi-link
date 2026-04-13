import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ichi-link - 位置情報コンバータ",
  description: "緊急対応の現場向け位置情報変換ツール。住所や座標を入力すると、複数の地図サービスで即座に開けます。",
  keywords: ["位置情報", "座標変換", "地図", "緯度経度", "WGS84", "JGD2011"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
