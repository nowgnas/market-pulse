import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "소개",
  description:
    "마켓 브리핑은 AI가 한국·미국 증시 뉴스를 매일 분석하여 핵심만 전달하는 서비스입니다.",
  robots: { index: true, follow: true },
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-secondary hover:text-primary transition-colors mb-6"
      >
        <span>&#8592;</span> 홈으로
      </Link>

      <article className="prose max-w-none">
        <h1>마켓 브리핑 소개</h1>

        <p>
          <strong>마켓 브리핑(Market Pulse)</strong>은 바쁜 직장인을 위해 만들어진
          AI 기반 증시 뉴스 분석 서비스입니다. 매일 아침, 점심, 저녁 3회에 걸쳐
          한국과 미국 증시의 핵심 동향을 분석하여 전달합니다.
        </p>

        <h2>무엇을 제공하나요?</h2>
        <ul>
          <li>
            <strong>아침 브리핑 (08:00)</strong> — 전일 미국장 마감 정리와 오늘
            한국장 전망
          </li>
          <li>
            <strong>점심 브리핑 (12:00)</strong> — 오전장 동향과 실시간 주요 이슈
          </li>
          <li>
            <strong>저녁 브리핑 (18:00)</strong> — 한국장 마감 정리와 미국장
            프리뷰
          </li>
        </ul>

        <h2>어떻게 작동하나요?</h2>
        <p>
          네이버 증권과 Yahoo Finance에서 실시간 시장 데이터와 뉴스를 수집하고,
          AI가 이를 분석하여 핵심 내용을 정리합니다. 단순 요약이 아닌, 시장
          맥락을 파악한 심층 분석을 제공합니다.
        </p>

        <h2>데이터 출처</h2>
        <ul>
          <li>
            <strong>한국 시장</strong> — 네이버 증권 (KOSPI, KOSDAQ, 인기 종목)
          </li>
          <li>
            <strong>미국 시장</strong> — Yahoo Finance (다우존스, S&P 500, 나스닥,
            주요 종목)
          </li>
          <li>
            <strong>뉴스</strong> — 네이버 뉴스 경제/증권 섹션
          </li>
        </ul>

        <h2>면책 조항</h2>
        <p>
          본 서비스에서 제공하는 정보는 투자 참고용이며, 투자 권유가 아닙니다.
          AI가 생성한 분석 내용은 실제 시장 상황과 차이가 있을 수 있으며,
          투자에 따른 손실에 대해 본 서비스는 책임을 지지 않습니다.
          투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
        </p>

        <h2>문의</h2>
        <p>
          서비스 관련 문의나 제안은{" "}
          <a
            href="https://github.com/nowgnas/market-pulse"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            GitHub 저장소
          </a>
          를 통해 남겨주세요.
        </p>
      </article>
    </div>
  );
}
