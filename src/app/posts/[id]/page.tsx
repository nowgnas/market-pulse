import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Post, PostType } from "@/types/database";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const POST_TYPE_LABELS: Record<PostType, { label: string; emoji: string }> = {
  morning: { label: "아침", emoji: "🌅" },
  noon: { label: "점심", emoji: "☀️" },
  evening: { label: "저녁", emoji: "🌙" },
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
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={index} className="text-2xl font-bold mb-4">
          {parseBoldText(line.slice(2))}
        </h1>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={index} className="text-xl font-semibold mt-6 mb-3">
          {parseBoldText(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={index} className="text-lg font-semibold mt-4 mb-2">
          {parseBoldText(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith("- ")) {
      elements.push(
        <li key={index} className="ml-4 mb-1">
          {parseBoldText(line.slice(2))}
        </li>
      );
    } else if (line.trim() === "") {
      elements.push(<br key={index} />);
    } else {
      elements.push(
        <p key={index} className="mb-3 leading-relaxed">
          {parseBoldText(line)}
        </p>
      );
    }
  });

  return <div className="prose max-w-none">{elements}</div>;
}

function StocksList({ stocks }: { stocks: Post["metadata"] }) {
  if (!stocks?.stocks || stocks.stocks.length === 0) return null;

  const krStocks = stocks.stocks.filter((s) => s.market === "KR");
  const usStocks = stocks.stocks.filter((s) => s.market === "US");

  const renderStockGroup = (title: string, items: typeof stocks.stocks, currency: string) => {
    if (items.length === 0) return null;
    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium text-secondary mb-2">{title}</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.slice(0, 6).map((stock) => (
            <div
              key={stock.code}
              className="text-sm p-2 bg-background rounded"
            >
              <div className="font-medium truncate">{stock.name}</div>
              <div className="flex justify-between text-xs mt-1">
                <span>
                  {currency === "원"
                    ? `${(stock.price ?? 0).toLocaleString()}원`
                    : `$${(stock.price ?? 0).toLocaleString("en-US")}`}
                </span>
                <span
                  className={
                    (stock.change ?? 0) >= 0 ? "text-accent" : "text-danger"
                  }
                >
                  {(stock.change ?? 0) >= 0 ? "+" : ""}
                  {(stock.changePercent ?? 0).toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-8 p-4 bg-card border border-border rounded-lg">
      <h3 className="font-semibold mb-1">주요 종목</h3>
      {renderStockGroup("한국 🇰🇷", krStocks, "원")}
      {renderStockGroup("미국 🇺🇸", usStocks, "$")}
    </div>
  );
}

function NewsList({ metadata }: { metadata: Post["metadata"] }) {
  if (!metadata?.news || metadata.news.length === 0) return null;

  return (
    <div className="mt-6 p-4 bg-card border border-border rounded-lg">
      <h3 className="font-semibold mb-3">관련 뉴스</h3>
      <ul className="space-y-2">
        {metadata.news.slice(0, 5).map((news, index) => (
          <li key={index} className="text-sm">
            <a
              href={news.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {news.title}
            </a>
            <span className="text-secondary ml-2">({news.source})</span>
          </li>
        ))}
      </ul>
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center text-sm text-secondary hover:text-primary mb-6"
      >
        ← 목록으로
      </Link>

      <article>
        <header className="mb-8">
          <div className="flex items-center gap-2 text-sm text-secondary mb-3">
            <span>{typeInfo.emoji}</span>
            <span>{typeInfo.label} 브리핑</span>
            <span className="text-border">•</span>
            <time dateTime={post.published_at}>
              {format(publishedDate, "yyyy년 M월 d일 (EEEE) HH:mm", {
                locale: ko,
              })}
            </time>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold mb-4">{post.title}</h1>

          <p className="text-lg text-secondary bg-card border border-border rounded-lg p-4">
            {post.summary}
          </p>

          {post.metadata?.indices && post.metadata.indices.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-4">
              {post.metadata.indices.map((index) => {
                const change = index.change ?? 0;
                const changePercent = index.changePercent ?? 0;
                const value = index.value ?? 0;
                return (
                  <div
                    key={index.name}
                    className="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2"
                  >
                    <span className="font-semibold">{index.name}</span>
                    <span className="text-lg">
                      {value.toLocaleString()}
                    </span>
                    <span
                      className={`text-sm ${
                        change >= 0 ? "text-accent" : "text-danger"
                      }`}
                    >
                      {change >= 0 ? "▲" : "▼"}{" "}
                      {Math.abs(changePercent).toFixed(2)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </header>

        <div className="border-t border-border pt-8">
          <MarkdownContent content={post.content} />
        </div>

        <StocksList stocks={post.metadata} />
        <NewsList metadata={post.metadata} />
      </article>
    </div>
  );
}
