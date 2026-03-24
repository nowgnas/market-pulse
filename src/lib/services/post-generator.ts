import { fetchAllNews } from "@/lib/crawlers/naver-news";
import { fetchKoreanMarketData } from "@/lib/crawlers/naver-stock";
import { fetchUSMarketData } from "@/lib/crawlers/us-stock";
import { summarizeMarketData } from "@/lib/services/openai";
import { supabaseAdmin } from "@/lib/supabase/server";
import { PostType, PostCategory, PostMetadata, PostInsert } from "@/types/database";

export function getCurrentPostType(): PostType {
  const hour = new Date().getHours();

  if (hour >= 6 && hour < 11) {
    return "morning";
  } else if (hour >= 11 && hour < 16) {
    return "noon";
  } else {
    return "evening";
  }
}

export async function generateAndSavePost(): Promise<{
  success: boolean;
  postId?: string;
  error?: string;
}> {
  try {
    const [news, krMarket, usMarket] = await Promise.all([
      fetchAllNews(),
      fetchKoreanMarketData(),
      fetchUSMarketData(),
    ]);

    const postType = getCurrentPostType();

    const allStocks = [...krMarket.stocks, ...usMarket.stocks];
    const allIndices = [...krMarket.indices, ...usMarket.indices];

    const { title, content, summary } = await summarizeMarketData({
      news,
      stocks: allStocks,
      indices: allIndices,
      postType,
    });

    const metadata: PostMetadata = {
      news: news.slice(0, 10).map(({ body: _, ...rest }) => rest),
      stocks: allStocks.slice(0, 15),
      indices: allIndices,
    };

    const category: PostCategory = "mixed";

    const postData: PostInsert = {
      title,
      content,
      summary,
      post_type: postType,
      category,
      published_at: new Date().toISOString(),
      metadata,
    };

    const { data, error } = await supabaseAdmin
      .from("posts")
      .insert(postData as never)
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    return { success: true, postId: (data as { id: string }).id };
  } catch (error) {
    console.error("Error generating post:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
