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

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const posts = await getPosts(params.type);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <section className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Market Pulse</h1>
        <p className="text-secondary text-sm mt-0.5">
          한국 · 미국 증시를 AI가 매일 분석합니다
        </p>
      </section>

      <FilterTabs currentType={params.type} />

      {posts.length > 0 ? (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
