import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "마켓 브리핑 개인정보처리방침",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-secondary hover:text-primary transition-colors mb-6"
      >
        <span>&#8592;</span> 홈으로
      </Link>

      <article className="prose max-w-none">
        <h1>개인정보처리방침</h1>
        <p className="text-secondary text-sm">최종 수정일: 2026년 3월 24일</p>

        <h2>1. 수집하는 개인정보</h2>
        <p>
          마켓 브리핑(이하 &quot;서비스&quot;)은 별도의 회원가입 없이 이용 가능하며,
          이용자로부터 직접적으로 개인정보를 수집하지 않습니다.
          다만, 서비스 이용 과정에서 아래 정보가 자동으로 생성·수집될 수 있습니다.
        </p>
        <ul>
          <li>방문 기록(접속 일시, 페이지 URL)</li>
          <li>브라우저 종류 및 운영체제 정보</li>
          <li>IP 주소 (익명화 처리)</li>
        </ul>

        <h2>2. 개인정보의 이용 목적</h2>
        <p>수집된 정보는 다음 목적으로만 사용됩니다.</p>
        <ul>
          <li>서비스 이용 통계 분석 및 개선</li>
          <li>사이트 성능 모니터링</li>
        </ul>

        <h2>3. 쿠키 및 분석 도구</h2>
        <p>
          본 서비스는 Google Analytics를 사용하여 방문자 통계를 수집합니다.
          Google Analytics는 쿠키를 사용하여 사이트 이용 정보를 수집하며,
          수집된 정보는 Google의 개인정보처리방침에 따라 처리됩니다.
        </p>
        <p>
          쿠키 수집을 원하지 않으시면 브라우저 설정에서 쿠키를 비활성화하거나,{" "}
          <a
            href="https://tools.google.com/dlpage/gaoptout"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Google Analytics 차단 브라우저 부가기능
          </a>
          을 설치하실 수 있습니다.
        </p>

        <h2>4. 광고</h2>
        <p>
          본 서비스는 Google AdSense를 통해 광고를 게재할 수 있습니다.
          Google AdSense는 사용자의 관심사에 기반한 광고를 표시하기 위해
          쿠키를 사용할 수 있으며, 이에 대한 자세한 내용은{" "}
          <a
            href="https://policies.google.com/technologies/ads"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Google 광고 정책
          </a>
          에서 확인하실 수 있습니다.
        </p>

        <h2>5. 개인정보의 보관 및 파기</h2>
        <p>
          자동 수집된 로그 데이터는 수집일로부터 최대 26개월간 보관되며,
          보관 기간이 경과하면 자동으로 삭제됩니다.
        </p>

        <h2>6. 제3자 제공</h2>
        <p>
          본 서비스는 이용자의 개인정보를 제3자에게 제공하지 않습니다.
          단, 법령에 의해 요구되는 경우는 예외로 합니다.
        </p>

        <h2>7. 이용자의 권리</h2>
        <p>이용자는 다음과 같은 권리를 행사할 수 있습니다.</p>
        <ul>
          <li>쿠키 수집 거부 (브라우저 설정)</li>
          <li>Google Analytics 추적 비활성화</li>
          <li>개인정보 관련 문의</li>
        </ul>

        <h2>8. 문의처</h2>
        <p>
          개인정보 관련 문의사항은 아래로 연락해 주시기 바랍니다.
        </p>
        <ul>
          <li>서비스명: 마켓 브리핑 (Market Pulse)</li>
          <li>GitHub: <a href="https://github.com/nowgnas/market-pulse" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">github.com/nowgnas/market-pulse</a></li>
        </ul>

        <h2>9. 방침 변경</h2>
        <p>
          본 개인정보처리방침은 법령 변경 또는 서비스 정책 변경에 따라
          수정될 수 있으며, 변경 시 이 페이지를 통해 공지합니다.
        </p>
      </article>
    </div>
  );
}
