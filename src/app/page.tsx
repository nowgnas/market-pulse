import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Post, PostType } from "@/types/database";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";

const KOREA_TIMEZONE = "Asia/Seoul";

const POST_TYPE_LABELS: Record<PostType, { label: string; emoji: string; desc: string }> = {
  morning: { label: "데일리 인사이트", emoji: "🔎", desc: "핵심 원인 + 확인 포인트" },
  noon: { label: "장중 메모", emoji: "☀️", desc: "장중 변수 정리" },
  evening: { label: "마감 노트", emoji: "🌙", desc: "마감 해설 + 다음 관점" },
  weekly_review: { label: "주간 리뷰", emoji: "📊", desc: "이번 주 시장 총정리" },
  week_ahead: { label: "주간 전망", emoji: "🔮", desc: "다음 주 주요 이벤트" },
};

async function getPosts(type?: string): Promise<Post[]> {
  let query = supabase
    .from("posts")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(20);

  if (type && ["morning", "noon", "evening", "weekly_review", "week_ahead"].includes(type)) {
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
    { key: "morning", label: "🔎 인사이트" },
    { key: "weekly_review", label: "📊 주간 리뷰" },
    { key: "week_ahead", label: "🔮 주간 전망" },
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
      <h2 className="text-lg font-semibold mb-1">아직 시장 해설이 없습니다</h2>
      <p className="text-secondary text-sm">
        첫 번째 데일리 인사이트가 곧 업로드됩니다.
      </p>
    </div>
  );
}

function ValueSection() {
  return (
    <section className="mb-8 grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-sm font-semibold mb-1">핵심 원인 중심 해설</div>
        <p className="text-sm text-secondary leading-relaxed">
          하루 시장을 움직인 원인을 하나로 좁히고, 한국과 미국 시장이
          어떻게 연결되는지 근거와 함께 설명합니다.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-sm font-semibold mb-1">반대 시나리오 포함</div>
        <p className="text-sm text-secondary leading-relaxed">
          한쪽 방향을 단정하지 않고, 해석이 틀릴 수 있는 조건과 리스크를
          함께 정리합니다.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-sm font-semibold mb-1">직접 확인할 체크리스트</div>
        <p className="text-sm text-secondary leading-relaxed">
          장중에 어떤 지표, 수급, 업종, 이벤트를 먼저 볼지 직접 확인할
          항목으로 정리합니다.
        </p>
      </div>
    </section>
  );
}

function ReadingGuideSection() {
  return (
    <section className="mb-10 rounded-3xl border border-border bg-card p-6">
      <h2 className="text-lg font-bold tracking-tight mb-3">이 시장 해설을 읽는 방법</h2>
      <div className="space-y-3 text-sm text-secondary leading-relaxed">
        <p>
          마켓 브리핑은 반복되는 시황 뉴스를 그대로 옮기기보다, 바쁜
          직장인이 하루 시장을 움직인 원인과 확인할 체크포인트를 이해할 수
          있게 돕는 데 초점을 맞춥니다.
        </p>
        <p>
          각 포스트는 <strong className="text-foreground">핵심 원인</strong>,
          <strong className="text-foreground"> 근거 데이터</strong>,
          <strong className="text-foreground"> 반대 시나리오</strong>,
          <strong className="text-foreground"> 체크리스트</strong> 순서로
          읽으면 해석과 확인 포인트를 함께 파악하기 좋습니다.
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
            이 사이트는 아래 기준으로 시장 해설을 구성합니다.
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
          <div className="text-sm font-semibold mb-1">2. 근거 없는 수치 배제</div>
          <p className="text-sm text-secondary leading-relaxed">
            제공된 데이터나 뉴스에서 확인되지 않는 정확한 수치와 과장된
            표현은 사용하지 않습니다.
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
          <div className="text-sm font-semibold mb-1">4. 반대 시나리오와 체크포인트</div>
          <p className="text-sm text-secondary leading-relaxed">
            해석이 틀릴 수 있는 조건과 독자가 직접 확인할 수 있는 수급,
            업종, 이벤트 중심의 체크리스트를 포함합니다.
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
          <span>AI 시장 해설</span>
          <span>·</span>
          <span>한국 · 미국 증시</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight leading-tight">하루 한 번, 근거로 읽는 시장 해설</h1>
        <p className="text-secondary text-sm sm:text-base mt-3 leading-relaxed">
          마켓 브리핑은 한국과 미국 증시 데이터를 바탕으로 하루 시장을
          움직인 핵심 원인과 확인할 근거를 정리합니다. 헤드라인을 모아놓는
          대신, 왜 그 이슈가 중요한지와 어떤 조건을 함께 봐야 하는지를
          이해할 수 있도록 재구성합니다.
        </p>
      </section>

      <ValueSection />

      <ReadingGuideSection />

      <FilterTabs currentType={params.type} />

      <section className="mb-10">
        <div className="flex items-end justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">최신 시장 해설</h2>
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
