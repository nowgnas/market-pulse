import { NewsData, StockData, IndexData, PostType } from "@/types/database";
import { aiProviders, getAvailableProviders } from "./ai-providers";
import { MarketHolidayStatus } from "./holidays";

interface SummarizeInput {
  news: NewsData[];
  stocks: StockData[];
  indices: IndexData[];
  postType: PostType;
  marketStatus?: MarketHolidayStatus;
}

interface SummarizeOutput {
  title: string;
  content: string;
  summary: string;
  provider?: string;
  isFallback?: boolean;
  failureReasons?: string[];
}

function normalizeGeneratedText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function formatProviderError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === "string" ? error : "Unknown error";
}

function parseAiResponse(response: string): {
  title: string;
  summary: string;
  content: string;
} {
  const parsed = JSON.parse(response) as {
    title?: unknown;
    summary?: unknown;
    content?: unknown;
  };

  const title = normalizeGeneratedText(parsed.title);
  const summary = normalizeGeneratedText(parsed.summary);
  const content = normalizeGeneratedText(parsed.content);

  if (!summary) {
    throw new Error("Missing summary in AI response");
  }

  if (!content) {
    throw new Error("Missing content in AI response");
  }

  return { title, summary, content };
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
  weekly_review: {
    label: "주간 리뷰",
    emoji: "📊",
    focus: "이번 주 시장 흐름 총정리",
  },
  week_ahead: {
    label: "주간 전망",
    emoji: "🔮",
    focus: "다음 주 주요 이벤트와 시장 전망",
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

function formatMarketStatusForPrompt(status?: MarketHolidayStatus): string {
  if (!status) return "";

  const lines: string[] = [];

  if (status.kr.isHoliday) {
    lines.push(`🇰🇷 한국: 휴장${status.kr.holidayName ? ` (${status.kr.holidayName})` : ""}`);
  } else {
    lines.push("🇰🇷 한국: 정상 개장");
  }

  if (status.us.isHoliday) {
    lines.push(`🇺🇸 미국: 휴장${status.us.holidayName ? ` (${status.us.holidayName})` : ""}`);
  } else {
    lines.push("🇺🇸 미국: 정상 개장");
  }

  return lines.join("\n");
}

function buildPrompt(input: SummarizeInput): string {
  const { news, indices, postType, marketStatus } = input;
  const config = POST_TYPE_CONFIG[postType];

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const marketData = formatMarketData(indices);
  const newsData = formatNewsForPrompt(news);
  const marketStatusText = formatMarketStatusForPrompt(marketStatus);

  return `바쁜 직장인을 위한 ${today} ${config.label} 마켓 브리핑을 작성해주세요.
이번 브리핑 초점: ${config.focus}

=== 시장 개장 상태 ===
${marketStatusText || "정보 없음"}

=== 시장 데이터 ===
${marketData || "데이터 없음"}

=== 뉴스 ===
${newsData || "뉴스 없음"}

=== 작성 목표 ===
- 타겟: 바쁜 직장인 (출퇴근길 3-5분 읽기)
- 목표: 단순 뉴스 요약이 아니라, 오늘 시장을 읽는 데 필요한 핵심 맥락을 짧고 명확하게 제공
- 톤: 친근하지만 분석적, 과장 없이 단정적으로 설명
- 한국/미국 시장을 연결해서 설명
- 휴장인 시장이 있으면 본문 앞부분에서 휴장 사실과 이유를 자연스럽게 언급

=== 반드시 지킬 규칙 ===
- 기사 제목을 거의 그대로 반복하지 말 것
- 일반론, 상투적 표현, 투자 권유성 문장 금지
- 뉴스 나열보다 "왜 중요한지", "어제와 무엇이 달라졌는지", "오늘 무엇을 봐야 하는지"를 우선 설명
- 본문에는 최소 2개 이상의 인과관계 표현 포함 (예: ~때문에, ~영향으로, ~조짐)
- 동일한 문장 구조 반복 금지
- summary와 content 모두 비어 있지 않게 작성

=== 출력 형식 (JSON) ===
{"title": "제목", "summary": "요약", "content": "본문"}

- title: 핵심 이슈와 시장 방향이 드러나는 제목 (18-32자)
- summary: 기사형 리드 문장 1-2문장. 단순 요약이 아니라 시장 전체 흐름과 핵심 테마를 압축
- content: 아래 마크다운 형식의 본문

=== content 본문 구조 ===

## ${config.emoji} 오늘 시장 요약

- 한국과 미국 시장 흐름을 3-4문장으로 요약
- 숫자만 나열하지 말고, 상승/하락 배경과 오늘의 해석을 함께 설명
- "오늘 시장의 핵심 한 문장"이 느껴지게 작성

## 📊 어제와 달라진 점

- 전일 대비 달라진 흐름이나 심리 변화 2-3가지를 설명
- 단순 사실이 아니라 시장 해석을 포함

## 🔍 오늘 중요하게 볼 포인트

- 투자자가 장중 체크해야 할 변수 3개를 bullet point로 작성
- 각 bullet은 무엇을 봐야 하는지 + 왜 중요한지까지 포함

## 🏭 섹터별 해석

- 오늘 특히 의미 있는 섹터/테마 2-3개를 골라 설명
- 형식:
- **섹터/테마명**: 현재 주목받는 이유와 시장 영향

## 📰 뉴스가 시장에 주는 의미

- 뉴스는 3-4개만 엄선
- 기사 제목을 복붙하지 말고, 핵심 내용을 재구성해서 써야 함
- 형식:
- **[한국/미국]** 핵심 내용 요약 → 시장 영향 또는 해석

## ✅ 오늘 체크리스트

- 오늘 장에서 확인할 체크포인트 3-4개를 bullet point로 작성
- 실제로 볼 만한 수급, 업종, 심리, 이벤트 중심으로 작성`;
}

function buildWeekendPrompt(input: SummarizeInput): string {
  const { news, indices, postType, marketStatus } = input;
  const isWeeklyReview = postType === "weekly_review";

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const marketData = formatMarketData(indices);
  const newsData = formatNewsForPrompt(news);
  const marketStatusText = formatMarketStatusForPrompt(marketStatus);

  if (isWeeklyReview) {
    return `${today} 주간 시장 리뷰를 작성해주세요.

=== 시장 개장 상태 ===
${marketStatusText || "정보 없음"}

=== 최근 시장 데이터 ===
${marketData || "데이터 없음"}

=== 이번 주 주요 뉴스 ===
${newsData || "뉴스 없음"}

=== 작성 목표 ===
- 타겟: 바쁜 직장인 (주말 여유롭게 5-7분 읽기)
- 목표: 이번 주 시장이 어떻게 흘렀고, 무엇이 다음 흐름을 결정할지 한 번에 이해시키기
- 톤: 친근하고 분석적, 주간 리포트처럼 정리

=== 반드시 지킬 규칙 ===
- 기사 제목 복붙 금지
- 주간 흐름, 섹터 변화, 수급/심리 변화를 연결해서 설명
- 단순 사건 나열보다 이번 주 시장의 의미를 해석
- 다음 주로 이어질 수 있는 관점 1개 이상 포함

=== 출력 형식 (JSON) ===
{"title": "제목", "summary": "요약", "content": "본문"}

- title: 이번 주 핵심을 담은 제목
- summary: 한 주 흐름과 핵심 테마를 압축한 1-2문장
- content: 아래 마크다운 형식의 본문

=== content 본문 구조 ===

## 📊 이번 주 시장 총정리

- 한국과 미국 시장의 주간 흐름을 4-5문장으로 설명
- 단순 상승/하락이 아니라 그 배경과 의미를 포함

## 🔄 이번 주에 달라진 흐름

- 전주와 비교해 달라진 시장 분위기, 수급, 주도 섹터 변화를 2-3가지 설명

## 🎯 이번 주 핵심 테마

- 이번 주 시장을 움직인 2-3개 테마를 해석
- 형식:
- **테마명**: 왜 중요했는지 + 어떤 업종/종목에 영향을 줬는지

## 📰 놓치면 안 될 뉴스

- 뉴스는 4개 이내로 엄선
- 형식:
- **[한국/미국]** 핵심 내용 요약 → 시장 영향

## 💭 다음 주로 이어질 포인트

- 다음 주에도 이어서 봐야 할 관점 2-3개를 bullet point로 제시`;
  } else {
    // week_ahead
    return `${today} 다음 주 시장 전망을 작성해주세요.

=== 시장 개장 상태 ===
${marketStatusText || "정보 없음"}

=== 현재 시장 상황 ===
${marketData || "데이터 없음"}

=== 최근 뉴스 ===
${newsData || "뉴스 없음"}

=== 작성 목표 ===
- 타겟: 바쁜 직장인 (일요일 저녁 5-7분 읽기)
- 목표: 다음 주 시장을 움직일 핵심 변수와 체크포인트를 미리 정리
- 톤: 친근하지만 전망의 근거가 느껴지게 작성

=== 반드시 지킬 규칙 ===
- 막연한 낙관/비관 금지
- 다음 주 변수의 중요도를 설명
- 일정 나열보다 왜 중요한 일정인지 해석 포함
- 주목할 섹터/종목은 이유가 분명해야 함

=== 출력 형식 (JSON) ===
{"title": "제목", "summary": "요약", "content": "본문"}

- title: 다음 주 핵심 전망이 드러나는 제목
- summary: 다음 주 핵심 변수와 방향을 압축한 1-2문장
- content: 아래 마크다운 형식의 본문

=== content 본문 구조 ===

## 🔮 다음 주 시장 전망

- 다음 주 예상되는 시장 흐름을 4-5문장으로 전망
- 어떤 변수 때문에 변동성이 커질 수 있는지 또는 완화될 수 있는지 설명

## 📅 다음 주 주요 일정

- 중요한 경제지표, 기업 실적, 정책 이벤트를 정리
- 형식:
- **요일/이벤트**: 무엇을 봐야 하는지 + 왜 중요한지

## 🎯 주목할 섹터 & 종목

- 관심 가져야 할 섹터/종목 2-3개를 제시
- 형식:
- **섹터/종목명**: 주목 이유와 확인할 포인트

## ⚠️ 리스크와 기회

- 다음 주 시장에서 동시에 봐야 할 리스크와 기회를 각각 설명

## ✅ 다음 주 체크리스트

- 다음 주 투자자가 확인할 포인트 3-4개를 bullet point로 정리`;
  }
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

  const failureReasons: string[] = [];

  // Provider 순서대로 시도 (Gemini -> OpenAI -> Claude)
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

      const parsed = parseAiResponse(response);
      console.log(`Success with ${provider.name}`);

      return {
        title: parsed.title || `${config.emoji} ${today} ${config.label} 마켓 브리핑`,
        summary: parsed.summary,
        content: parsed.content,
        provider: provider.name,
        isFallback: false,
      };
    } catch (error) {
      console.error(`${provider.name} failed:`, error);
      failureReasons.push(`${provider.name}: ${formatProviderError(error)}`);
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
    isFallback: true,
    failureReasons,
  };
}

export async function summarizeWeekendContent(
  input: SummarizeInput
): Promise<SummarizeOutput> {
  const { postType } = input;
  const config = POST_TYPE_CONFIG[postType];

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const prompt = buildWeekendPrompt(input);
  const availableProviders = getAvailableProviders();

  console.log(
    `Available AI providers for weekend content: ${availableProviders.map((p) => p.name).join(", ") || "None"}`
  );

  const failureReasons: string[] = [];

  // Provider 순서대로 시도 (Gemini -> OpenAI -> Claude)
  for (const provider of aiProviders) {
    if (!provider.isAvailable()) {
      console.log(`Skipping ${provider.name}: API key not configured`);
      continue;
    }

    try {
      console.log(`Trying ${provider.name} for weekend content...`);
      const response = await provider.summarize(prompt);

      if (!response) {
        throw new Error("Empty response");
      }

      const parsed = parseAiResponse(response);
      console.log(`Success with ${provider.name}`);

      return {
        title: parsed.title || `${config.emoji} ${today} ${config.label}`,
        summary: parsed.summary,
        content: parsed.content,
        provider: provider.name,
        isFallback: false,
      };
    } catch (error) {
      console.error(`${provider.name} failed:`, error);
      failureReasons.push(`${provider.name}: ${formatProviderError(error)}`);
      continue;
    }
  }

  // 모든 AI provider 실패 시 fallback
  console.log("All AI providers failed, using weekend fallback content");
  return {
    title: `${config.emoji} ${today} ${config.label}`,
    summary: `${config.label} 콘텐츠입니다.`,
    content: generateWeekendFallbackContent(input),
    provider: "Fallback",
    isFallback: true,
    failureReasons,
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

function generateWeekendFallbackContent(input: SummarizeInput): string {
  const { news, indices, postType } = input;
  const isWeeklyReview = postType === "weekly_review";
  const kr = indices.filter((i) => i.market === "KR");
  const us = indices.filter((i) => i.market === "US");

  let content = "";

  if (isWeeklyReview) {
    content += "## 📊 이번 주 시장 총정리\n\n";
    content += "이번 주 시장은 다양한 요인들로 등락을 반복했습니다.\n\n";
  } else {
    content += "## 🔮 다음 주 시장 전망\n\n";
    content += "다음 주에도 글로벌 경제 지표와 기업 실적에 주목해야 합니다.\n\n";
  }

  if (kr.length > 0 || us.length > 0) {
    content += "### 현재 시장 상황\n\n";
    if (kr.length > 0) {
      content += "**한국** 🇰🇷\n";
      kr.forEach((idx) => {
        const sign = idx.change >= 0 ? "+" : "";
        content += `- ${idx.name}: ${idx.value.toLocaleString()} (${sign}${idx.changePercent.toFixed(2)}%)\n`;
      });
      content += "\n";
    }
    if (us.length > 0) {
      content += "**미국** 🇺🇸\n";
      us.forEach((idx) => {
        const sign = idx.change >= 0 ? "+" : "";
        content += `- ${idx.name}: ${idx.value.toLocaleString()} (${sign}${idx.changePercent.toFixed(2)}%)\n`;
      });
      content += "\n";
    }
  }

  if (news.length > 0) {
    content += isWeeklyReview
      ? "## 📰 이번 주 주요 뉴스\n\n"
      : "## 📰 관련 뉴스\n\n";
    news.slice(0, 5).forEach((n) => {
      const tag = n.source.includes("네이버") ? "한국" : "글로벌";
      content += `- **[${tag}]** ${n.title}\n`;
    });
    content += "\n";
  }

  if (isWeeklyReview) {
    content += "## 💭 투자자 생각거리\n\n";
    content += "- 이번 주 시장 흐름을 복기하며 포트폴리오를 점검해보세요.\n";
    content += "- 다음 주 주요 경제 일정을 미리 확인하세요.\n";
    content += "- 장기적 관점에서 투자 전략을 재검토해보세요.\n";
  } else {
    content += "## 💡 투자 체크리스트\n\n";
    content += "- 다음 주 주요 경제 지표 발표 일정을 확인하세요.\n";
    content += "- 포트폴리오 리밸런싱이 필요한지 검토하세요.\n";
    content += "- 글로벌 이슈의 영향을 모니터링하세요.\n";
  }

  return content;
}
