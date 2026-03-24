import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  preload: true,
});

export const metadata: Metadata = {
  title: "오늘의 증시 브리핑",
  description: "매일 아침, 점심, 저녁 증시와 경제 뉴스를 AI가 요약해드립니다",
};

function Header() {
  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary">
            오늘의 증시
          </Link>
          <div className="flex gap-4 text-sm text-secondary">
            <Link href="/?type=morning" className="hover:text-primary transition-colors">
              아침
            </Link>
            <Link href="/?type=noon" className="hover:text-primary transition-colors">
              점심
            </Link>
            <Link href="/?type=evening" className="hover:text-primary transition-colors">
              저녁
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-secondary">
        <p>매일 08:00, 12:00, 18:00 자동 업데이트</p>
        <p className="mt-1">데이터 출처: 네이버 뉴스, 네이버 증권</p>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${notoSansKr.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
