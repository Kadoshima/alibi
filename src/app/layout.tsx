import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";

export const metadata: Metadata = {
  title: {
    default: "Alibi — AI アリバイ素材メーカー",
    template: "%s | Alibi",
  },
  description:
    "サプライズの準備中や断りにくい誘いに。AI顔合成&チケット日付編集で自然なアリバイ素材を作れるサービス。",
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
