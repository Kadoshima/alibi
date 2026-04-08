import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";

export const metadata: Metadata = {
  title: {
    default: "Alibi - 合法的アリバイサービス・プラットフォーム",
    template: "%s | Alibi",
  },
  description:
    "フリーランス向け在籍確認・サプライズ企画・代理出席など、合法的用途に限定したアリバイ関連サービスのマーケットプレイスです。",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "Alibi",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans">
        <Navbar />
        <main className="min-h-[calc(100vh-16rem)]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
