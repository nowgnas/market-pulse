import { NewsData, StockData, IndexData, PostType } from "@/types/database";
import { aiProviders, getAvailableProviders } from "./ai-providers";

interface SummarizeInput {
  news: NewsData[];
  stocks: StockData[];
  indices: IndexData[];
  postType: PostType;
}

interface SummarizeOutput {
  title: string;
  content: string;
  summary: string;
  provider?: string;
}

const POST_TYPE_CONFIG: Record<
  PostType,
  { label: string; emoji: string; focus: string }
> = {
  morning: {
    label: "아침",
    emoji: "🌅",
    focus: "전일 미국장 마감 정리 + 오늘 한국장 전망",
  },
  noon: {
    label: "점심",
    emoji: "☀️",
    focus: "오전 한국장 동향 + 실시간 주요 이슈",
  },
  evening: {
    label: "저녁",
    emoji: "🌙",
    focus: "한국장 마감 정리 + 미국장 프리뷰",
  },
};

function formatMarketData(indices: IndexData[]): string {
  const kr = indices.filter((i) => i.market === "KR");
  const us = indices.filter((i) => i.market === "US");

  const format = (idx: IndexData) => {
    const sign = idx.change >= 0 ? "+" : "";
    return `${idx.name} ${idx.value.toLocaleString()} (${sign}${idx.changePercent.toFixed(1)}%)`;
  };

  const lines: string[] = [];
  if (kr.length > 0) lines.push(`🇰🇷 ${kr.map(format).join(" | ")}`);
  if (us.length > 0) lines.push(`🇺🇸 ${us.map(format).join(" | ")}`);

  return lines.join("\n");
}

function formatNewsForPrompt(news: NewsData[]): string {
  return news
    .slice(0, 7)
    .map((n, i) => {
      const source = n.source.includes("네이버") ? "한국" : "글로벌";
      let item = `${i + 1}. [${source}] ${n.title}`;
      if (n.body) item += `\n   본문: ${n.body}`;
      return item;
    })
    .join("\n");
}

function buildPrompt(input: SummarizeInput): string {
  const { news, indices, postType } = input;
  const config = POST_TYPE_CONFIG[postType];

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const marketData = formatMarketData(indices);
  const newsData = formatNewsForPrompt(news);

  return `바쁜 직장인을 위한 ${today} ${config.label} 마켓 브리핑을 작성해주세요.
이번 브리핑 초점: ${config.focus}

=== 시장 데이터 ===
${marketData || "데이터 없음"}

=== 뉴스 ===
${newsData || "뉴스 없음"}

=== 작성 가이드 ===
- 타겟: 바쁜 직장인 (출퇴근길 3-5분 읽기)
- 톤: 친근하고 이해하기 쉽게, 전문용어 최소화
- 한국/미국 시장 균형있게 다루기
- 뉴스와 시장 움직임을 연결해서 설명

=== 출력 형식 (JSON) ===
{"title": "제목", "summary": "요약", "content": "본문"}

- title: 오늘의 핵심을 담은 제목 (15-25자)
- summary: 핵심 요약 1-2문장
- content: 아래 마크다운 형식의 본문

=== content 본문 구조 ===

## ${config.emoji} 시장 한눈에 보기

한국과 미국 주요 지수의 등락을 2-3문장으로 요약해주세요. 왜 올랐는지/내렸는지 간단히 설명.

## 📰 오늘의 핵심 뉴스

뉴스 5개를 선별하여 각각 한 줄로 요약해주세요. 형식:
- **[한국/미국]** 뉴스 제목 요약 → 시장 영향 한마디

## 💡 오늘의 포인트

투자자가 오늘 주목할 포인트 3개를 bullet point로 정리해주세요.`;
}

export async function summarizeMarketData(
  input: SummarizeInput
): Promise<SummarizeOutput> {
  const { postType } = input;
  const config = POST_TYPE_CONFIG[postType];

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const prompt = buildPrompt(input);
  const availableProviders = getAvailableProviders();

  console.log(
    `Available AI providers: ${availableProviders.map((p) => p.name).join(", ") || "None"}`
  );

  // Fallback 순서대로 시도
  for (const provider of aiProviders) {
    if (!provider.isAvailable()) {
      console.log(`Skipping ${provider.name}: API key not configured`);
      continue;
    }

    try {
      console.log(`Trying ${provider.name}...`);
      const response = await provider.summarize(prompt);

      if (!response) {
        throw new Error("Empty response");
      }

      const parsed = JSON.parse(response);
      console.log(`Success with ${provider.name}`);

      return {
        title: parsed.title || `${config.emoji} ${today} ${config.label} 마켓 브리핑`,
        summary: parsed.summary || "오늘의 시장 요약입니다.",
        content: parsed.content || generateFallbackContent(input),
        provider: provider.name,
      };
    } catch (error) {
      console.error(`${provider.name} failed:`, error);
      continue;
    }
  }

  // 모든 AI provider 실패 시 fallback
  console.log("All AI providers failed, using fallback content");
  return {
    title: `${config.emoji} ${today} ${config.label} 마켓 브리핑`,
    summary: "오늘의 시장 요약입니다.",
    content: generateFallbackContent(input),
    provider: "Fallback",
  };
}

function generateFallbackContent(input: SummarizeInput): string {
  const { news, indices } = input;
  const kr = indices.filter((i) => i.market === "KR");
  const us = indices.filter((i) => i.market === "US");

  let content = "## 📊 시장 한눈에 보기\n\n";

  if (kr.length > 0) {
    content += "**한국 증시** 🇰🇷\n";
    kr.forEach((idx) => {
      const sign = idx.change >= 0 ? "+" : "";
      const emoji = idx.change >= 0 ? "📈" : "📉";
      content += `- ${emoji} ${idx.name}: ${idx.value.toLocaleString()} (${sign}${idx.changePercent.toFixed(2)}%)\n`;
    });
    content += "\n";
  }

  if (us.length > 0) {
    content += "**미국 증시** 🇺🇸\n";
    us.forEach((idx) => {
      const sign = idx.change >= 0 ? "+" : "";
      const emoji = idx.change >= 0 ? "📈" : "📉";
      content += `- ${emoji} ${idx.name}: ${idx.value.toLocaleString()} (${sign}${idx.changePercent.toFixed(2)}%)\n`;
    });
    content += "\n";
  }

  if (news.length > 0) {
    content += "## 📰 오늘의 핵심 뉴스\n\n";
    news.slice(0, 5).forEach((n) => {
      const tag = n.source.includes("네이버") ? "한국" : "글로벌";
      content += `- **[${tag}]** ${n.title}\n`;
    });
    content += "\n";
  }

  content += "## 💡 오늘의 포인트\n\n";
  content += "- 시장 동향을 주시하며 신중한 투자 판단이 필요합니다.\n";
  content += "- 주요 경제 지표 발표 일정을 확인하세요.\n";
  content += "- 글로벌 이슈가 국내 시장에 미치는 영향을 살펴보세요.\n";

  return content;
}
