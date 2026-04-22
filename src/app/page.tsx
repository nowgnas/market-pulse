import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Post, PostType } from "@/types/database";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";

const KOREA_TIMEZONE = "Asia/Seoul";

const POST_TYPE_LABELS: Record<PostType, { label: string; emoji: string; desc: string }> = {
  morning: { label: "아침", emoji: "🌅", desc: "미국장 마감 + 한국장 전망" },
  noon: { label: "점심", emoji: "☀️", desc: "오전장 동향 + 실시간 이슈" },
  evening: { label: "저녁", emoji: "🌙", desc: "한국장 마감 + 미국장 프리뷰" },
  weekly_review: { label: "주간 리뷰", emoji: "📊", desc: "이번 주 시장 총정리" },
  week_ahead: { label: "주간 전망", emoji: "🔮", desc: "다음 주 주요 이벤트" },
};

async function getPosts(type?: string): Promise<Post[]> {
  let query = supabase
    .from("posts")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(20);

  if (type && ["morning", "noon", "evening"].includes(type)) {
    query = query.eq("post_type", type);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching posts:", error);
    return [];
  }

  return data || [];
}

function IndexBadge({ idx }: { idx: { name: string; change?: number | null; changePercent?: number | null; value?: number | null } }) {
  const change = idx.change ?? 0;
  const pct = idx.changePercent ?? 0;
  const isUp = change >= 0;

  // 퍼센트가 0이면 표시하지 않음
  if (pct === 0) return null;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${isUp ? "bg-accent-bg text-accent" : "bg-danger-bg text-danger"}`}>
      {idx.name} {isUp ? "+" : ""}{pct.toFixed(2)}%
    </span>
  );
}

function HolidayBadges({ metadata }: { metadata: Post["metadata"] }) {
  if (!metadata?.marketStatus) return null;

  const { kr, us } = metadata.marketStatus;

  return (
    <div className="flex gap-1.5">
      {kr?.isHoliday && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
          🇰🇷 휴장{kr.holidayName && kr.holidayName !== "주말" && ` (${kr.holidayName})`}
        </span>
      )}
      {us?.isHoliday && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
          🇺🇸 휴장{us.holidayName && us.holidayName !== "주말" && ` (${us.holidayName})`}
        </span>
      )}
    </div>
  );
}

function MarketSummary({ indices }: { indices: Post["metadata"] }) {
  if (!indices?.indices || indices.indices.length === 0) return null;

  // 퍼센트가 0이 아닌 데이터만 필터링
  const validIndices = indices.indices.filter((i) => (i.changePercent ?? 0) !== 0);
  if (validIndices.length === 0) return null;

  const kr = validIndices.filter((i) => i.market === "KR");
  const us = validIndices.filter((i) => i.market === "US");

  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {kr.map((idx) => <IndexBadge key={idx.name} idx={idx} />)}
      {us.map((idx) => <IndexBadge key={idx.name} idx={idx} />)}
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const typeInfo = POST_TYPE_LABELS[post.post_type];
  // UTC를 한국 시간대로 변환
  const publishedDate = toZonedTime(new Date(post.published_at), KOREA_TIMEZONE);

  return (
    <Link href={`/posts/${post.id}`}>
      <article className="group bg-card border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-sm">{typeInfo.emoji}</span>
            <span className="font-semibold text-sm">{typeInfo.label}</span>
            <span className="text-secondary text-xs">{typeInfo.desc}</span>
          </div>
          <time dateTime={post.published_at} className="text-xs text-secondary tabular-nums">
            {format(publishedDate, "M/d (EEE) HH:mm", { locale: ko })}
          </time>
        </div>

        <h2 className="text-base font-bold mb-1.5 group-hover:text-primary transition-colors leading-snug">
          {post.title}
        </h2>

        <p className="text-secondary text-sm line-clamp-2 leading-relaxed">{post.summary}</p>

        <div className="flex flex-wrap gap-1.5 mt-3">
          <HolidayBadges metadata={post.metadata} />
        </div>
        <MarketSummary indices={post.metadata} />
      </article>
    </Link>
  );
}

function FilterTabs({ currentType }: { currentType?: string }) {
  const tabs = [
    { key: "", label: "전체" },
    { key: "morning", label: "🌅 아침" },
    { key: "noon", label: "☀️ 점심" },
    { key: "evening", label: "🌙 저녁" },
  ];

  return (
    <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
      {tabs.map((tab) => {
        const isActive = currentType === tab.key || (!currentType && tab.key === "");
        return (
          <Link
            key={tab.key}
            href={tab.key ? `/?type=${tab.key}` : "/"}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              isActive
                ? "bg-primary text-white shadow-sm shadow-primary/25"
                : "text-secondary hover:text-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">📭</div>
      <h2 className="text-lg font-semibold mb-1">아직 브리핑이 없습니다</h2>
      <p className="text-secondary text-sm">
        첫 번째 마켓 브리핑이 곧 업로드됩니다.
      </p>
    </div>
  );
}

function ValueSection() {
  return (
    <section className="mb-8 grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-sm font-semibold mb-1">시장 맥락 정리</div>
        <p className="text-sm text-secondary leading-relaxed">
          단순 뉴스 나열보다 한국과 미국 시장 흐름이 어떻게 연결되는지,
          오늘 무엇이 중요해졌는지를 짧게 정리합니다.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-sm font-semibold mb-1">섹터별 핵심 포인트</div>
        <p className="text-sm text-secondary leading-relaxed">
          반도체, 2차전지, 바이오처럼 수급이 몰리는 섹터를 따로 묶어
          왜 움직이는지와 확인할 포인트를 함께 제공합니다.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-sm font-semibold mb-1">짧지만 실용적인 체크리스트</div>
        <p className="text-sm text-secondary leading-relaxed">
          장중에 어떤 지표, 수급, 업종을 먼저 볼지 빠르게 파악할 수 있도록
          실전형 체크리스트를 함께 담습니다.
        </p>
      </div>
    </section>
  );
}

function ReadingGuideSection() {
  return (
    <section className="mb-10 rounded-3xl border border-border bg-card p-6">
      <h2 className="text-lg font-bold tracking-tight mb-3">이 브리핑을 읽는 방법</h2>
      <div className="space-y-3 text-sm text-secondary leading-relaxed">
        <p>
          마켓 브리핑은 매일 반복되는 시황 뉴스를 그대로 옮기기보다, 바쁜
          직장인이 짧은 시간 안에 시장의 방향과 체크포인트를 이해할 수 있게
          돕는 데 초점을 맞춥니다.
        </p>
        <p>
          각 포스트는 <strong className="text-foreground">시장 요약</strong>,
          <strong className="text-foreground"> 전일 대비 변화</strong>,
          <strong className="text-foreground"> 섹터별 해석</strong>,
          <strong className="text-foreground"> 체크리스트</strong> 순서로
          읽으면 핵심 흐름을 빠르게 파악하기 좋습니다.
        </p>
        <p>
          데이터는 공개 시세와 뉴스 흐름을 기반으로 정리하며, 본문의 목적은
          투자 권유가 아니라 시장을 이해하기 위한 배경 설명과 관찰 포인트를
          제공하는 것입니다.
        </p>
      </div>
    </section>
  );
}

function EditorialStandardsSection() {
  return (
    <section className="mb-10">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">편집 기준</h2>
          <p className="text-sm text-secondary mt-1">
            이 사이트는 아래 기준으로 시장 브리핑을 구성합니다.
          </p>
        </div>
        <Link href="/about" className="text-sm text-primary hover:underline">
          자세히 보기
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-sm font-semibold mb-1">1. 기사 복붙 대신 재구성</div>
          <p className="text-sm text-secondary leading-relaxed">
            기사 제목을 단순히 반복하지 않고, 시장 영향과 배경을 중심으로
            내용을 다시 정리합니다.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-sm font-semibold mb-1">2. 숫자보다 맥락 우선</div>
          <p className="text-sm text-secondary leading-relaxed">
            지수 등락만 보여주는 것이 아니라 왜 움직였는지, 어느 섹터가
            주목받는지를 함께 설명합니다.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-sm font-semibold mb-1">3. 한국·미국 시장 연결</div>
          <p className="text-sm text-secondary leading-relaxed">
            미국장 마감 흐름이 한국장에 어떤 식으로 이어지는지 연결해서
            읽을 수 있도록 구성합니다.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-sm font-semibold mb-1">4. 실전 체크포인트 제공</div>
          <p className="text-sm text-secondary leading-relaxed">
            독자가 장중에 바로 확인할 수 있는 수급, 업종, 이벤트 중심의
            체크리스트를 포함합니다.
          </p>
        </div>
      </div>
    </section>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const posts = await getPosts(params.type);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <section className="mb-8 rounded-3xl border border-border bg-card p-6 sm:p-7">
        <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-secondary mb-4">
          <span>AI 시장 브리핑</span>
          <span>·</span>
          <span>한국 · 미국 증시</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight leading-tight">짧게 읽어도 흐름이 보이는 시장 브리핑</h1>
        <p className="text-secondary text-sm sm:text-base mt-3 leading-relaxed">
          마켓 브리핑은 한국과 미국 증시 데이터를 바탕으로 매일 아침, 점심,
          저녁 시장의 핵심 흐름을 정리합니다. 헤드라인을 모아놓는 대신,
          오늘 시장에서 왜 그 이슈가 중요한지와 무엇을 먼저 확인해야 하는지를
          빠르게 이해할 수 있도록 재구성합니다.
        </p>
      </section>

      <ValueSection />

      <ReadingGuideSection />

      <FilterTabs currentType={params.type} />

      <section className="mb-10">
        <div className="flex items-end justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">최신 브리핑</h2>
            <p className="text-sm text-secondary mt-1">
              시장 데이터와 주요 뉴스를 바탕으로 정리한 최신 포스트입니다.
            </p>
          </div>
        </div>

        {posts.length > 0 ? (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </section>

      <EditorialStandardsSection />
    </div>
  );
}
