import axios from "axios";
import * as cheerio from "cheerio";
import * as iconv from "iconv-lite";
import { StockData, IndexData } from "@/types/database";

const NAVER_STOCK_URL = "https://finance.naver.com";
const NAVER_MOBILE_API = "https://m.stock.naver.com/api";

interface NaverIndexResponse {
  closePrice: string;
  compareToPreviousClosePrice: string;
  fluctuationsRatio: string;
}

async function fetchNaverIndexAPI(indexCode: string): Promise<NaverIndexResponse | null> {
  try {
    const response = await axios.get(`${NAVER_MOBILE_API}/index/${indexCode}/basic`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
      },
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch ${indexCode} from API:`, error);
    return null;
  }
}

function detectEncoding(url: string, contentType: string, rawBytes: Buffer): string {
  const ct = contentType.toLowerCase();
  if (ct.includes("euc-kr") || ct.includes("euckr")) {
    return "EUC-KR";
  }
  if (ct.includes("utf-8") || ct.includes("utf8")) {
    return "UTF-8";
  }

  if (url.includes("finance.naver.com")) {
    return "EUC-KR";
  }

  const head = rawBytes.subarray(0, Math.min(rawBytes.length, 4096)).toString("ascii");
  const metaMatch = head.match(/charset\s*=\s*["']?\s*([\w-]+)/i);
  if (metaMatch) {
    const charset = metaMatch[1].toLowerCase();
    if (charset.includes("euc") || charset.includes("kr")) return "EUC-KR";
    if (charset.includes("utf")) return "UTF-8";
  }

  const eucKrText = iconv.decode(rawBytes, "EUC-KR");
  const utf8Text = iconv.decode(rawBytes, "UTF-8");
  const koreanRange = /[\uAC00-\uD7AF]/g;
  const eucKrKorean = (eucKrText.match(koreanRange) || []).length;
  const utf8Korean = (utf8Text.match(koreanRange) || []).length;

  return eucKrKorean > utf8Korean ? "EUC-KR" : "UTF-8";
}

async function fetchWithEncoding(url: string): Promise<string> {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  const rawBytes = Buffer.from(response.data);
  const contentType = response.headers["content-type"] || "";
  const encoding = detectEncoding(url, contentType, rawBytes);
  return iconv.decode(rawBytes, encoding);
}

function parseNumber(text: string): number {
  return parseFloat(text.replace(/,/g, "").replace(/[^0-9.-]/g, "")) || 0;
}

export async function fetchKoreanMarketIndices(): Promise<IndexData[]> {
  const indices: IndexData[] = [];

  // 네이버 모바일 API 사용 (더 안정적)
  const indexCodes = [
    { code: "KOSPI", name: "KOSPI" },
    { code: "KOSDAQ", name: "KOSDAQ" },
  ];

  const results = await Promise.allSettled(
    indexCodes.map((idx) => fetchNaverIndexAPI(idx.code))
  );

  results.forEach((result, i) => {
    if (result.status === "fulfilled" && result.value) {
      const data = result.value;
      const value = parseNumber(data.closePrice);
      const change = parseNumber(data.compareToPreviousClosePrice);
      const changePercent = parseNumber(data.fluctuationsRatio);

      if (value > 0) {
        indices.push({
          name: indexCodes[i].name,
          value,
          change,
          changePercent,
          market: "KR",
        });
      }
    }
  });

  // API 실패 시 웹 스크래핑 폴백
  if (indices.length === 0) {
    console.log("API failed, trying web scraping fallback...");
    try {
      const html = await fetchWithEncoding(`${NAVER_STOCK_URL}/sise/`);
      const $ = cheerio.load(html);

      // KOSPI - 다양한 셀렉터 시도
      const kospiSelectors = ["#KOSPI_now", ".kospi_now", "[data-cd='KOSPI']"];
      for (const selector of kospiSelectors) {
        const kospiArea = $(selector);
        if (kospiArea.length) {
          const value = parseNumber(kospiArea.text());
          if (value > 0) {
            const changeArea = kospiArea.closest("div").find(".change, .rate_change");
            const change = parseNumber(changeArea.text());
            const percentArea = kospiArea.closest("div").find(".rate, .per");
            const changePercent = parseNumber(percentArea.text()) ||
              (value > 0 ? Math.round((change / (value - change)) * 10000) / 100 : 0);

            indices.push({
              name: "KOSPI",
              value,
              change,
              changePercent,
              market: "KR",
            });
            break;
          }
        }
      }

      // KOSDAQ - 다양한 셀렉터 시도
      const kosdaqSelectors = ["#KOSDAQ_now", ".kosdaq_now", "[data-cd='KOSDAQ']"];
      for (const selector of kosdaqSelectors) {
        const kosdaqArea = $(selector);
        if (kosdaqArea.length) {
          const value = parseNumber(kosdaqArea.text());
          if (value > 0) {
            const changeArea = kosdaqArea.closest("div").find(".change, .rate_change");
            const change = parseNumber(changeArea.text());
            const percentArea = kosdaqArea.closest("div").find(".rate, .per");
            const changePercent = parseNumber(percentArea.text()) ||
              (value > 0 ? Math.round((change / (value - change)) * 10000) / 100 : 0);

            indices.push({
              name: "KOSDAQ",
              value,
              change,
              changePercent,
              market: "KR",
            });
            break;
          }
        }
      }
    } catch (error) {
      console.error("Web scraping fallback also failed:", error);
    }
  }

  // 최종 폴백 - 데이터 없음 표시용
  if (indices.length === 0) {
    console.warn("All methods failed to fetch Korean market indices");
    // 0 값 대신 빈 배열 반환 (UI에서 처리)
    return [];
  }

  return indices;
}

export async function fetchKoreanTopStocks(): Promise<StockData[]> {
  try {
    const html = await fetchWithEncoding(`${NAVER_STOCK_URL}/sise/lastsearch2.naver`);
    const $ = cheerio.load(html);
    const stocks: StockData[] = [];

    $("table.type_5 tbody tr").each((index, element) => {
      if (index >= 10) return;

      const $row = $(element);
      const $nameLink = $row.find("td:nth-child(2) a");
      const name = $nameLink.text().trim();
      const href = $nameLink.attr("href") || "";
      const code = href.match(/code=(\d+)/)?.[1] || "";

      const priceText = $row.find("td:nth-child(3)").text().trim();
      const changeText = $row.find("td:nth-child(4)").text().trim();
      const changePercentText = $row.find("td:nth-child(5)").text().trim();

      if (name && code) {
        stocks.push({
          name,
          code,
          price: parseNumber(priceText),
          change: parseNumber(changeText),
          changePercent: parseNumber(changePercentText),
          market: "KR",
        });
      }
    });

    return stocks;
  } catch (error) {
    console.error("Error fetching Korean top stocks:", error);
    return [];
  }
}

export async function fetchKoreanMarketData(): Promise<{
  indices: IndexData[];
  stocks: StockData[];
}> {
  const [indices, stocks] = await Promise.all([
    fetchKoreanMarketIndices(),
    fetchKoreanTopStocks(),
  ]);

  return { indices, stocks };
}

export { fetchKoreanMarketData as fetchMarketData };
