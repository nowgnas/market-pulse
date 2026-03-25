import axios from "axios";
import * as cheerio from "cheerio";
import * as iconv from "iconv-lite";
import { StockData, IndexData } from "@/types/database";

const NAVER_STOCK_URL = "https://finance.naver.com";

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
  try {
    const html = await fetchWithEncoding(`${NAVER_STOCK_URL}/sise/`);
    const $ = cheerio.load(html);
    const indices: IndexData[] = [];

    // KOSPI
    const kospiArea = $("#KOSPI_now");
    if (kospiArea.length) {
      const value = parseNumber(kospiArea.text());
      const changeArea = kospiArea.closest("div").find(".change");
      const change = parseNumber(changeArea.text());
      const isUp = changeArea.hasClass("up") || changeArea.find(".ico_up").length > 0;
      const signedChange = isUp ? Math.abs(change) : -Math.abs(change);
      const prevValue = value - signedChange;
      const changePercent = prevValue !== 0
        ? Math.round((signedChange / prevValue) * 10000) / 100
        : 0;

      indices.push({
        name: "KOSPI",
        value: value || 2500,
        change: signedChange,
        changePercent,
        market: "KR",
      });
    }

    // KOSDAQ
    const kosdaqArea = $("#KOSDAQ_now");
    if (kosdaqArea.length) {
      const value = parseNumber(kosdaqArea.text());
      const changeArea = kosdaqArea.closest("div").find(".change");
      const change = parseNumber(changeArea.text());
      const isUp = changeArea.hasClass("up") || changeArea.find(".ico_up").length > 0;
      const signedChange = isUp ? Math.abs(change) : -Math.abs(change);
      const prevValue = value - signedChange;
      const changePercent = prevValue !== 0
        ? Math.round((signedChange / prevValue) * 10000) / 100
        : 0;

      indices.push({
        name: "KOSDAQ",
        value: value || 800,
        change: signedChange,
        changePercent,
        market: "KR",
      });
    }

    // 기본값 보장
    if (indices.length === 0) {
      indices.push(
        { name: "KOSPI", value: 2500, change: 0, changePercent: 0, market: "KR" },
        { name: "KOSDAQ", value: 800, change: 0, changePercent: 0, market: "KR" }
      );
    }

    return indices;
  } catch (error) {
    console.error("Error fetching Korean market indices:", error);
    return [
      { name: "KOSPI", value: 0, change: 0, changePercent: 0, market: "KR" },
      { name: "KOSDAQ", value: 0, change: 0, changePercent: 0, market: "KR" },
    ];
  }
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
