import { fetchAllNews } from "@/lib/crawlers/naver-news";
import { fetchKoreanMarketData } from "@/lib/crawlers/naver-stock";
import { fetchUSMarketData } from "@/lib/crawlers/us-stock";
import { summarizeMarketData, summarizeWeekendContent } from "@/lib/services/openai";
import { getMarketHolidayStatus, MarketHolidayStatus } from "@/lib/services/holidays";
import { supabaseAdmin } from "@/lib/supabase/server";
import { PostType, PostCategory, PostMetadata, PostInsert } from "@/types/database";

// 한국 시간 (KST = UTC+9) 가져오기
function getKoreanTime(): Date {
  const now = new Date();
  // UTC 시간에 9시간 추가
  const koreanTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return koreanTime;
}

// 주말인지 확인 (토요일=6, 일요일=0)
function isWeekend(): { isWeekend: boolean; dayOfWeek: number } {
  const koreanTime = getKoreanTime();
  const dayOfWeek = koreanTime.getUTCDay();
  return {
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    dayOfWeek,
  };
}

export function getCurrentPostType(): PostType {
  const koreanTime = getKoreanTime();
  const hour = koreanTime.getUTCHours();
  const { isWeekend: weekend, dayOfWeek } = isWeekend();

  // 주말 처리
  if (weekend) {
    // 토요일: 주간 리뷰 (오전에만)
    if (dayOfWeek === 6) {
      return "weekly_review";
    }
    // 일요일: 다음 주 전망 (오전에만)
    return "week_ahead";
  }

  // 평일 처리
  if (hour >= 6 && hour < 11) {
    return "morning";
  } else if (hour >= 11 && hour < 16) {
    return "noon";
  } else {
    return "evening";
  }
}

// 주말에는 하루에 한 번만 포스팅 (오전 8시)
export function shouldSkipWeekendPost(): boolean {
  const koreanTime = getKoreanTime();
  const hour = koreanTime.getUTCHours();
  const { isWeekend: weekend } = isWeekend();

  // 주말이고, 오전 8시가 아니면 스킵
  if (weekend && hour !== 8) {
    return true;
  }
  return false;
}

export async function generateAndSavePost(): Promise<{
  success: boolean;
  postId?: string;
  error?: string;
  skipped?: boolean;
}> {
  try {
    // 주말 점심/저녁 시간에는 포스팅 스킵
    if (shouldSkipWeekendPost()) {
      console.log("Skipping weekend post (only posting at 8 AM on weekends)");
      return { success: true, skipped: true };
    }

    // 공휴일 상태 확인
    const marketStatus = getMarketHolidayStatus();
    console.log("Market holiday status:", JSON.stringify(marketStatus));

    const [news, krMarket, usMarket] = await Promise.all([
      fetchAllNews(),
      fetchKoreanMarketData(),
      fetchUSMarketData(),
    ]);

    const postType = getCurrentPostType();
    const { isWeekend: weekend } = isWeekend();

    const allStocks = [...krMarket.stocks, ...usMarket.stocks];
    const allIndices = [...krMarket.indices, ...usMarket.indices];

    let title: string;
    let content: string;
    let summary: string;

    if (weekend) {
      // 주말용 콘텐츠 생성
      const result = await summarizeWeekendContent({
        news,
        stocks: allStocks,
        indices: allIndices,
        postType,
        marketStatus,
      });
      title = result.title;
      content = result.content;
      summary = result.summary;
    } else {
      // 평일용 콘텐츠 생성
      const result = await summarizeMarketData({
        news,
        stocks: allStocks,
        indices: allIndices,
        postType,
        marketStatus,
      });
      title = result.title;
      content = result.content;
      summary = result.summary;
    }

    const metadata: PostMetadata = {
      news: news.slice(0, 10).map(({ body: _, ...rest }) => rest),
      stocks: allStocks.slice(0, 15),
      indices: allIndices,
      marketStatus: {
        kr: marketStatus.kr,
        us: marketStatus.us,
      },
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
