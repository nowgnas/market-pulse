import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "소개",
  description:
    "마켓 브리핑의 편집 기준, 데이터 출처, AI 활용 방식, 업데이트 원칙을 소개합니다.",
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

        <p>
          이 사이트의 목표는 단순히 기사를 모아두는 것이 아니라, 하루 시장을
          이해하는 데 필요한 핵심 맥락과 체크포인트를 짧게 제공하는 것입니다.
          시장 데이터, 뉴스 흐름, 섹터별 이슈를 함께 읽을 수 있도록 구성하며,
          투자 권유가 아닌 정보 정리와 해석에 초점을 맞춥니다.
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

        <h2>누구를 위한 서비스인가요?</h2>
        <p>
          장중 시황을 하루 종일 따라가기 어려운 직장인, 투자 입문자, 또는
          한국장과 미국장 흐름을 빠르게 함께 파악하고 싶은 독자를 주요 대상으로
          합니다. 긴 리포트보다 핵심 흐름을 먼저 이해하고 싶은 독자에게 맞춘
          형식입니다.
        </p>

        <h2>어떻게 작동하나요?</h2>
        <p>
          네이버 증권과 Yahoo Finance에서 실시간 시장 데이터와 뉴스를 수집하고,
          AI가 이를 분석하여 핵심 내용을 정리합니다. 단순 요약이 아닌, 시장
          맥락을 파악한 심층 분석을 제공합니다.
        </p>

        <h2>편집 기준</h2>
        <ul>
          <li>기사 제목을 그대로 반복하기보다 시장에 미치는 의미를 중심으로 재구성합니다.</li>
          <li>지수 등락 수치만 나열하지 않고, 움직임의 배경과 섹터 흐름을 함께 설명합니다.</li>
          <li>한국과 미국 시장을 분리해서 보지 않고, 서로 어떤 영향을 주는지 연결해 해석합니다.</li>
          <li>각 브리핑에는 장중에 바로 확인할 수 있는 체크포인트를 포함하려고 합니다.</li>
        </ul>

        <h2>콘텐츠 작성 방식</h2>
        <ol>
          <li>공개 시장 데이터와 주요 뉴스 수집</li>
          <li>중요 뉴스와 지수 흐름 선별</li>
          <li>AI를 활용한 초안 생성</li>
          <li>시장 맥락, 섹터 흐름, 체크포인트 중심으로 재구성</li>
          <li>사이트에 게시 후 독자가 빠르게 읽을 수 있는 형식으로 제공</li>
        </ol>

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

        <h2>AI 사용 방식과 한계</h2>
        <p>
          본 서비스는 AI를 이용해 초안을 생성하고 시장 흐름을 정리합니다. 다만
          AI가 생성한 내용은 데이터 해석 과정에서 실제 시장 상황과 다를 수
          있으며, 기사 원문이나 공식 공시를 완전히 대체하지 않습니다. 따라서
          본 사이트의 브리핑은 시장을 이해하기 위한 참고 자료로 활용하시고,
          최종 투자 판단은 반드시 이용자 본인의 확인과 책임 하에 이루어져야
          합니다.
        </p>

        <h2>업데이트 원칙</h2>
        <ul>
          <li>시장 상황에 따라 아침, 점심, 저녁 브리핑을 정기적으로 발행합니다.</li>
          <li>생성된 콘텐츠가 충분하지 않다고 판단되면 게시하지 않을 수 있습니다.</li>
          <li>중복되거나 품질이 낮은 포스트는 삭제하거나 재정비할 수 있습니다.</li>
        </ul>

        <h2>광고와 수익화</h2>
        <p>
          본 사이트는 향후 Google AdSense와 같은 광고 프로그램을 통해 수익을
          얻을 수 있습니다. 다만 광고 노출보다 콘텐츠의 질과 사용자 경험을 우선
          고려하며, 정보가 충분하지 않은 화면에는 광고를 노출하지 않는 방향을
          지향합니다.
        </p>

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
