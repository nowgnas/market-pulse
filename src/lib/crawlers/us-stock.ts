import axios from "axios";
import { StockData, IndexData } from "@/types/database";

const YAHOO_FINANCE_API = "https://query1.finance.yahoo.com/v8/finance/chart";

interface YahooChartResult {
  meta: {
    regularMarketPrice: number;
    previousClose: number;
    shortName?: string;
    symbol: string;
  };
}

async function fetchYahooQuote(symbol: string): Promise<YahooChartResult | null> {
  try {
    const response = await axios.get(`${YAHOO_FINANCE_API}/${symbol}`, {
      params: { interval: "1d", range: "1d" },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000,
    });
    return response.data?.chart?.result?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function fetchUSMarketIndices(): Promise<IndexData[]> {
  const symbols = [
    { symbol: "^DJI", name: "다우존스" },
    { symbol: "^GSPC", name: "S&P 500" },
    { symbol: "^IXIC", name: "나스닥" },
  ];

  const results = await Promise.allSettled(
    symbols.map((s) => fetchYahooQuote(s.symbol))
  );

  const indices: IndexData[] = [];

  results.forEach((result, i) => {
    if (result.status === "fulfilled" && result.value) {
      const meta = result.value.meta;
      const change = meta.regularMarketPrice - meta.previousClose;
      const changePercent = (change / meta.previousClose) * 100;

      indices.push({
        name: symbols[i].name,
        value: Math.round(meta.regularMarketPrice * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        market: "US",
      });
    }
  });

  if (indices.length === 0) {
    indices.push(
      { name: "다우존스", value: 0, change: 0, changePercent: 0, market: "US" },
      { name: "S&P 500", value: 0, change: 0, changePercent: 0, market: "US" },
      { name: "나스닥", value: 0, change: 0, changePercent: 0, market: "US" }
    );
  }

  return indices;
}

export async function fetchUSTopStocks(): Promise<StockData[]> {
  const symbols = [
    { symbol: "AAPL", name: "애플" },
    { symbol: "MSFT", name: "마이크로소프트" },
    { symbol: "GOOGL", name: "알파벳(구글)" },
    { symbol: "AMZN", name: "아마존" },
    { symbol: "NVDA", name: "엔비디아" },
    { symbol: "TSLA", name: "테슬라" },
    { symbol: "META", name: "메타" },
  ];

  const results = await Promise.allSettled(
    symbols.map((s) => fetchYahooQuote(s.symbol))
  );

  const stocks: StockData[] = [];

  results.forEach((result, i) => {
    if (result.status === "fulfilled" && result.value) {
      const meta = result.value.meta;
      const change = meta.regularMarketPrice - meta.previousClose;
      const changePercent = (change / meta.previousClose) * 100;

      stocks.push({
        name: symbols[i].name,
        code: symbols[i].symbol,
        price: Math.round(meta.regularMarketPrice * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        market: "US",
      });
    }
  });

  return stocks;
}

export async function fetchUSMarketData(): Promise<{
  indices: IndexData[];
  stocks: StockData[];
}> {
  const [indices, stocks] = await Promise.all([
    fetchUSMarketIndices(),
    fetchUSTopStocks(),
  ]);

  return { indices, stocks };
}
