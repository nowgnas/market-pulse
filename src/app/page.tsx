import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Post, PostType } from "@/types/database";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const POST_TYPE_LABELS: Record<PostType, { label: string; emoji: string; desc: string }> = {
  morning: { label: "아침", emoji: "🌅", desc: "미국장 마감 + 한국장 전망" },
  noon: { label: "점심", emoji: "☀️", desc: "오전장 동향 + 실시간 이슈" },
  evening: { label: "저녁", emoji: "🌙", desc: "한국장 마감 + 미국장 프리뷰" },
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

function MarketSummary({ indices }: { indices: Post["metadata"] }) {
  if (!indices?.indices || indices.indices.length === 0) return null;

  const kr = indices.indices.filter((i) => i.market === "KR");
  const us = indices.indices.filter((i) => i.market === "US");

  const renderIndex = (idx: typeof indices.indices[0]) => {
    const change = idx.change ?? 0;
    const changePercent = idx.changePercent ?? 0;
    const isUp = change >= 0;

    return (
      <div key={idx.name} className="flex items-center gap-1.5">
        <span className="font-medium text-sm">{idx.name}</span>
        <span className={`text-xs font-medium ${isUp ? "text-accent" : "text-danger"}`}>
          {isUp ? "▲" : "▼"} {Math.abs(changePercent).toFixed(1)}%
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm">
      {kr.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs">🇰🇷</span>
          {kr.map(renderIndex)}
        </div>
      )}
      {us.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs">🇺🇸</span>
          {us.map(renderIndex)}
        </div>
      )}
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const typeInfo = POST_TYPE_LABELS[post.post_type];
  const publishedDate = new Date(post.published_at);

  return (
    <Link href={`/posts/${post.id}`}>
      <article className="bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{typeInfo.emoji}</span>
            <div>
              <span className="font-medium text-sm">{typeInfo.label} 브리핑</span>
              <span className="text-secondary text-xs ml-2">{typeInfo.desc}</span>
            </div>
          </div>
          <time
            dateTime={post.published_at}
            className="text-xs text-secondary"
          >
            {format(publishedDate, "M/d (EEE) HH:mm", { locale: ko })}
          </time>
        </div>

        <h2 className="text-lg font-semibold mb-2 text-foreground group-hover:text-primary transition-colors">
          {post.title}
        </h2>

        <p className="text-secondary text-sm line-clamp-2 mb-2">{post.summary}</p>

        <MarketSummary indices={post.metadata} />
      </article>
    </Link>
  );
}

function FilterTabs({ currentType }: { currentType?: string }) {
  const tabs = [
    { key: "", label: "전체", emoji: "📊" },
    { key: "morning", label: "아침", emoji: "🌅" },
    { key: "noon", label: "점심", emoji: "☀️" },
    { key: "evening", label: "저녁", emoji: "🌙" },
  ];

  return (
    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.key ? `/?type=${tab.key}` : "/"}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            currentType === tab.key || (!currentType && tab.key === "")
              ? "bg-primary text-white"
              : "bg-card border border-border hover:border-primary/50"
          }`}
        >
          <span>{tab.emoji}</span>
          <span>{tab.label}</span>
        </Link>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 bg-card border border-border rounded-xl">
      <div className="text-5xl mb-4">📭</div>
      <h2 className="text-lg font-semibold mb-2">아직 브리핑이 없습니다</h2>
      <p className="text-secondary text-sm">
        첫 번째 마켓 브리핑이 곧 업로드됩니다.
        <br />
        매일 08:00, 12:00, 18:00에 자동 업데이트됩니다.
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
    <div className="max-w-2xl mx-auto px-4 py-8">
      <section className="mb-6">
        <h1 className="text-2xl font-bold mb-1">마켓 브리핑</h1>
        <p className="text-secondary text-sm">
          바쁜 직장인을 위한 한국/미국 증시 뉴스 요약
        </p>
      </section>

      <FilterTabs currentType={params.type} />

      {posts.length > 0 ? (
        <div className="space-y-4">
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
