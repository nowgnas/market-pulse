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

function PostCard({ post }: { post: Post }) {
  const typeInfo = POST_TYPE_LABELS[post.post_type];
  const publishedDate = new Date(post.published_at);

  return (
    <Link href={`/posts/${post.id}`}>
      <article className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
        <div className="flex items-center gap-2 text-sm text-secondary mb-2">
          <span>{typeInfo.emoji}</span>
          <span>{typeInfo.label} 브리핑</span>
          <span className="text-border">•</span>
          <time dateTime={post.published_at}>
            {format(publishedDate, "yyyy년 M월 d일 (EEEE)", { locale: ko })}
          </time>
        </div>

        <h2 className="text-lg font-semibold mb-2 text-foreground hover:text-primary transition-colors">
          {post.title}
        </h2>

        <p className="text-secondary text-sm line-clamp-2">{post.summary}</p>

        {post.metadata?.indices && post.metadata.indices.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            {post.metadata.indices.map((index) => {
              const change = index.change ?? 0;
              const changePercent = index.changePercent ?? 0;
              return (
                <div key={index.name} className="flex items-center gap-1">
                  <span className="text-secondary text-xs">
                    {index.market === "US" ? "🇺🇸" : "🇰🇷"}
                  </span>
                  <span className="font-medium">{index.name}</span>
                  <span
                    className={
                      change >= 0 ? "text-accent" : "text-danger"
                    }
                  >
                    {change >= 0 ? "+" : ""}
                    {changePercent.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </article>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-4">📊</div>
      <h2 className="text-xl font-semibold mb-2">아직 포스트가 없습니다</h2>
      <p className="text-secondary">
        첫 번째 증시 브리핑이 곧 업로드됩니다.
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <section className="mb-8">
        <h1 className="text-2xl font-bold mb-2">오늘의 증시 브리핑</h1>
        <p className="text-secondary">
          매일 아침, 점심, 저녁 증시와 경제 뉴스를 AI가 요약해드립니다.
        </p>
      </section>

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
