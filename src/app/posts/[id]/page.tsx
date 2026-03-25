import type { Metadata } from "next";
import { notFound } from "next/navigation";
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

async function getPost(id: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching post:", error);
    return null;
  }

  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    return { title: "포스트를 찾을 수 없습니다" };
  }

  const typeLabel = POST_TYPE_LABELS[post.post_type]?.label || "";
  const publishedDate = new Date(post.published_at);
  const dateStr = format(publishedDate, "yyyy년 M월 d일", { locale: ko });
  const description = post.summary || `${dateStr} ${typeLabel} 마켓 브리핑`;

  return {
    title: post.title,
    description,
    openGraph: {
      type: "article",
      title: post.title,
      description,
      publishedTime: post.published_at,
    },
  };
}

function parseBoldText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={match.index} className="font-semibold">
        {match[1]}
      </strong>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, index) => {
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={index} className="text-xl font-bold mt-8 mb-4 flex items-center gap-2">
          {parseBoldText(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={index} className="text-lg font-semibold mt-5 mb-2">
          {parseBoldText(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith("- ")) {
      elements.push(
        <li key={index} className="ml-4 mb-2 list-disc">
          {parseBoldText(line.slice(2))}
        </li>
      );
    } else if (line.trim() === "") {
      // Skip empty lines but allow spacing
    } else {
      elements.push(
        <p key={index} className="mb-3 leading-relaxed text-foreground/90">
          {parseBoldText(line)}
        </p>
      );
    }
  });

  return <div className="prose max-w-none">{elements}</div>;
}

function IndexCard({ idx }: { idx: { name: string; change?: number | null; changePercent?: number | null; value?: number | null } }) {
  const change = idx.change ?? 0;
  const pct = idx.changePercent ?? 0;
  const value = idx.value ?? 0;
  const isUp = change >= 0;

  return (
    <div className={`p-3 rounded-xl border ${isUp ? "border-accent/20 bg-accent-bg" : "border-danger/20 bg-danger-bg"}`}>
      <div className="text-xs text-secondary mb-1">{idx.name}</div>
      <div className="font-bold text-lg tabular-nums">{value.toLocaleString()}</div>
      <div className={`text-xs font-semibold tabular-nums ${isUp ? "text-accent" : "text-danger"}`}>
        {isUp ? "+" : ""}{change.toLocaleString()} ({isUp ? "+" : ""}{pct.toFixed(2)}%)
      </div>
    </div>
  );
}

function MarketIndices({ indices }: { indices: Post["metadata"] }) {
  if (!indices?.indices || indices.indices.length === 0) return null;

  const kr = indices.indices.filter((i) => i.market === "KR");
  const us = indices.indices.filter((i) => i.market === "US");

  return (
    <div className="mb-6 space-y-4">
      {kr.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">KR 한국</div>
          <div className="grid grid-cols-2 gap-2">
            {kr.map((idx) => <IndexCard key={idx.name} idx={idx} />)}
          </div>
        </div>
      )}
      {us.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">US 미국</div>
          <div className="grid grid-cols-3 gap-2">
            {us.map((idx) => <IndexCard key={idx.name} idx={idx} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function NewsList({ metadata }: { metadata: Post["metadata"] }) {
  if (!metadata?.news || metadata.news.length === 0) return null;

  return (
    <div className="mt-8 border-t border-border pt-6">
      <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3">관련 뉴스</h3>
      <div className="space-y-2">
        {metadata.news.slice(0, 5).map((news, index) => (
          <a
            key={index}
            href={news.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-xl bg-muted hover:bg-primary/5 transition-colors group"
          >
            <span className="text-sm group-hover:text-primary transition-colors">{news.title}</span>
            <span className="text-xs text-secondary shrink-0 ml-3">{news.source}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    notFound();
  }

  const typeInfo = POST_TYPE_LABELS[post.post_type];
  const publishedDate = new Date(post.published_at);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-secondary hover:text-primary transition-colors mb-6"
      >
        <span>&#8592;</span> 목록으로
      </Link>

      <article>
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-base">{typeInfo.emoji}</span>
            <span className="text-sm font-semibold">{typeInfo.label} 브리핑</span>
            <span className="text-xs text-secondary">{typeInfo.desc}</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight mb-2 leading-snug">{post.title}</h1>

          <time
            dateTime={post.published_at}
            className="text-xs text-secondary tabular-nums"
          >
            {format(publishedDate, "yyyy년 M월 d일 (EEEE) HH:mm", { locale: ko })}
          </time>

          {post.summary && (
            <p className="mt-4 text-sm text-secondary leading-relaxed bg-muted rounded-xl p-4">
              {post.summary}
            </p>
          )}
        </header>

        <MarketIndices indices={post.metadata} />

        <div className="pt-2">
          <MarkdownContent content={post.content} />
        </div>

        <NewsList metadata={post.metadata} />
      </article>
    </div>
  );
}
