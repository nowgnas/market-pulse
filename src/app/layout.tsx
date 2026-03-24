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

const SITE_NAME = "마켓펄스 - Market Pulse";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://market-pulse.vercel.app";
const SITE_DESCRIPTION =
  "매일 아침, 점심, 저녁 한국·미국 증시와 경제 뉴스를 AI가 분석하여 요약해드립니다. KOSPI, KOSDAQ, 나스닥, S&P500 실시간 브리핑.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "증시 브리핑", "주식 뉴스 요약", "AI 증시 분석",
    "KOSPI", "KOSDAQ", "나스닥", "S&P500", "다우존스",
    "한국 증시", "미국 증시", "경제 뉴스", "투자 정보",
    "주식 시장 분석", "오늘의 증시", "market pulse",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
    other: {
      "naver-site-verification": process.env.NEXT_PUBLIC_NAVER_VERIFICATION || "",
    },
  },
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

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: "ko-KR",
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
  },
};

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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
