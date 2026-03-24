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

const POST_TYPE_LABELS: Record<PostType, string> = {
  morning: "아침",
  noon: "점심",
  evening: "저녁",
};

function buildCompactData(input: SummarizeInput): string {
  const { stocks, indices } = input;
  const krIndices = indices.filter((idx) => idx.market === "KR");
  const usIndices = indices.filter((idx) => idx.market === "US");
  const krStocks = stocks.filter((s) => s.market === "KR").slice(0, 5);
  const usStocks = stocks.filter((s) => s.market === "US").slice(0, 5);

  const fmtIdx = (idx: IndexData) =>
    `${idx.name} ${idx.value.toLocaleString()}(${idx.change >= 0 ? "+" : ""}${idx.changePercent}%)`;
  const fmtStock = (s: StockData) => {
    const cur = s.market === "KR" ? "원" : "$";
    return `${s.name} ${s.price.toLocaleString()}${cur}(${s.change >= 0 ? "+" : ""}${s.changePercent}%)`;
  };

  const parts: string[] = [];

  if (krIndices.length > 0) parts.push(`[KR지수] ${krIndices.map(fmtIdx).join(", ")}`);
  if (usIndices.length > 0) parts.push(`[US지수] ${usIndices.map(fmtIdx).join(", ")}`);
  if (krStocks.length > 0) parts.push(`[KR종목] ${krStocks.map(fmtStock).join(", ")}`);
  if (usStocks.length > 0) parts.push(`[US종목] ${usStocks.map(fmtStock).join(", ")}`);

  return parts.join("\n");
}

function buildNewsSection(news: NewsData[]): string {
  return news
    .map((n, i) => {
      const header = `${i + 1}. [${n.source}] ${n.title}`;
      if (n.body) return `${header}\n   ${n.body}`;
      return header;
    })
    .join("\n");
}

function buildPrompt(input: SummarizeInput): string {
  const { news, postType } = input;
  const timeLabel = POST_TYPE_LABELS[postType];
  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const marketData = buildCompactData(input);
  const newsSection = buildNewsSection(news);

  return `${today} ${timeLabel} 증시/경제 브리핑 포스팅을 작성해주세요.

=== 시장 데이터 ===
${marketData || "데이터 없음"}

=== 뉴스 기사 (제목 + 핵심 본문 발췌) ===
${newsSection || "데이터 없음"}

=== 작성 지침 ===
- 블로그 포스팅처럼 독자가 읽기 편한 줄글 형태로 작성해주세요.
- 각 섹션은 최소 3~5문단 이상의 충분한 분량으로 서술해주세요.
- 뉴스 기사 본문 내용을 근거로, 사실 기반의 분석과 해석을 덧붙여 작성해주세요.
- 단순 나열이 아닌, 뉴스 간의 맥락과 연관성을 연결하여 하나의 흐름으로 서술해주세요.
- 한국 증시와 미국 증시를 균형 있게 다뤄주세요.
- 투자자 관점에서 어떤 의미가 있는지 해석을 포함해주세요.

=== 출력 형식 ===
반드시 아래 JSON 형식으로만 응답해주세요:
{"title": "제목", "summary": "요약", "content": "본문"}

- title: 오늘의 핵심을 담은 20자 내외 제목
- summary: 핵심 요약 (2~3문장)
- content: 아래 구조의 마크다운 본문 (전체 1500자 이상)

=== content 본문 구조 ===

## 글로벌 시장 동향
오늘 한국과 미국 증시가 어떻게 움직였는지 전체적인 흐름을 서술해주세요. KOSPI, KOSDAQ, 다우, S&P500, 나스닥 등 주요 지수의 등락과 그 배경을 3~4문단으로 자세히 설명해주세요.

## 주요 뉴스 심층 분석
위에 제공된 뉴스 기사 본문 내용을 바탕으로, 오늘의 핵심 이슈 3~5개를 선별하여 각각 소제목(### )과 함께 2~3문단으로 깊이 있게 분석해주세요. 각 뉴스가 시장에 어떤 영향을 미치는지, 관련 산업과 종목에 대한 시사점을 포함해주세요.

## 주목할 종목
시장 데이터와 뉴스 내용을 교차 분석하여, 오늘 주목할 만한 한국/미국 종목 3~5개를 선별하고 각각 왜 주목해야 하는지 이유를 2~3문장으로 설명해주세요.

## 투자 포인트 및 전망
오늘의 시장 흐름과 뉴스를 종합하여, 단기적으로 투자자가 주의해야 할 점과 향후 시장 전망을 3~4문장으로 정리해주세요.`;
}

export async function summarizeMarketData(
  input: SummarizeInput
): Promise<SummarizeOutput> {
  const { postType } = input;
  const timeLabel = POST_TYPE_LABELS[postType];
  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const prompt = buildPrompt(input);
  const availableProviders = getAvailableProviders();

  console.log(
    `Available AI providers: ${availableProviders.map((p) => p.name).join(", ") || "None"}`
  );
  console.log(`Prompt length: ${prompt.length} chars`);

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
        title: parsed.title || `${today} ${timeLabel} 증시 브리핑`,
        summary: parsed.summary || "오늘의 증시 요약입니다.",
        content: parsed.content || "내용을 불러오는데 실패했습니다.",
        provider: provider.name,
      };
    } catch (error) {
      console.error(`${provider.name} failed:`, error);
      continue;
    }
  }

  console.log("All AI providers failed, using fallback content");
  return {
    title: `${today} ${timeLabel} 증시 브리핑`,
    summary: "오늘의 증시 요약입니다.",
    content: generateFallbackContent(input, today, timeLabel),
    provider: "Fallback",
  };
}

function generateFallbackContent(
  input: SummarizeInput,
  today: string,
  timeLabel: string
): string {
  const { news, stocks, indices } = input;
  const krIndices = indices.filter((idx) => idx.market === "KR");
  const usIndices = indices.filter((idx) => idx.market === "US");
  const krStocks = stocks.filter((s) => s.market === "KR");
  const usStocks = stocks.filter((s) => s.market === "US");

  let content = `# ${today} ${timeLabel} 증시 브리핑\n\n`;

  if (krIndices.length > 0) {
    content += `## 한국 주요 지수\n\n`;
    krIndices.forEach((idx) => {
      const dir = idx.change >= 0 ? "상승" : "하락";
      content += `- **${idx.name}**: ${idx.value.toLocaleString()} (${dir} ${Math.abs(idx.changePercent)}%)\n`;
    });
    content += "\n";
  }

  if (usIndices.length > 0) {
    content += `## 미국 주요 지수\n\n`;
    usIndices.forEach((idx) => {
      const dir = idx.change >= 0 ? "상승" : "하락";
      content += `- **${idx.name}**: ${idx.value.toLocaleString()} (${dir} ${Math.abs(idx.changePercent)}%)\n`;
    });
    content += "\n";
  }

  if (krStocks.length > 0) {
    content += `## 한국 인기 종목\n\n`;
    krStocks.slice(0, 5).forEach((s) => {
      content += `- **${s.name}**: ${s.price.toLocaleString()}원 (${s.change >= 0 ? "+" : ""}${s.changePercent}%)\n`;
    });
    content += "\n";
  }

  if (usStocks.length > 0) {
    content += `## 미국 주요 종목\n\n`;
    usStocks.slice(0, 5).forEach((s) => {
      content += `- **${s.name}**: $${s.price.toLocaleString("en-US")} (${s.change >= 0 ? "+" : ""}${s.changePercent}%)\n`;
    });
    content += "\n";
  }

  if (news.length > 0) {
    content += `## 주요 뉴스\n\n`;
    news.slice(0, 5).forEach((n) => {
      content += `- **${n.title}**`;
      if (n.body) content += `\n  ${n.body}`;
      content += "\n";
    });
  }

  return content;
}
