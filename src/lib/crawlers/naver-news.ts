import axios from "axios";
import * as cheerio from "cheerio";
import * as iconv from "iconv-lite";
import { NewsData } from "@/types/database";

const NAVER_NEWS_URL = "https://news.naver.com/main/main.naver";
const NAVER_FINANCE_NEWS_URL = "https://finance.naver.com/news/mainnews.naver";

const MAX_ARTICLES = 7;
const MAX_SENTENCES_PER_ARTICLE = 4;
const MAX_BODY_CHARS = 300;
const CONCURRENCY = 3;

function detectEncoding(url: string, contentType: string, rawBytes: Buffer): string {
  const ct = contentType.toLowerCase();
  if (ct.includes("euc-kr") || ct.includes("euckr")) return "EUC-KR";
  if (ct.includes("utf-8") || ct.includes("utf8")) return "UTF-8";

  if (url.includes("finance.naver.com")) return "EUC-KR";

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

async function fetchWithEncoding(url: string, params?: Record<string, string>): Promise<string> {
  const response = await axios.get(url, {
    params,
    responseType: "arraybuffer",
    timeout: 10000,
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

function extractKeySentences(fullText: string): string {
  const cleaned = fullText
    .replace(/\[.*?\]/g, "")
    .replace(/\(.*?기자\)/g, "")
    .replace(/[\t\r]+/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();

  const sentences = cleaned
    .split(/(?<=[.다요함음됨])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 15 && s.length <= 200);

  const selected = sentences.slice(0, MAX_SENTENCES_PER_ARTICLE);
  const result = selected.join(" ");

  if (result.length > MAX_BODY_CHARS) {
    return result.slice(0, MAX_BODY_CHARS) + "…";
  }
  return result;
}

async function fetchArticleBody(articleUrl: string): Promise<string> {
  try {
    const html = await fetchWithEncoding(articleUrl);
    const $ = cheerio.load(html);

    $("script, style, .byline, .reporter_area, .copyright, .article_footer").remove();

    const selectors = [
      "#dic_area",
      "#newsct_article",
      "#articleBodyContents",
      "#content .article_body",
      ".news_end",
      "#article-body",
    ];

    let bodyText = "";
    for (const sel of selectors) {
      const el = $(sel);
      if (el.length) {
        bodyText = el.text().trim();
        break;
      }
    }

    if (!bodyText) return "";
    return extractKeySentences(bodyText);
  } catch {
    return "";
  }
}

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
  return results;
}

async function enrichNewsWithBody(newsList: NewsData[]): Promise<NewsData[]> {
  const limited = newsList.slice(0, MAX_ARTICLES);

  const tasks = limited.map((news) => async () => {
    const body = await fetchArticleBody(news.url);
    return { ...news, body: body || undefined };
  });

  return runWithConcurrency(tasks, CONCURRENCY);
}

export async function fetchNaverMainNews(): Promise<NewsData[]> {
  try {
    const html = await fetchWithEncoding(NAVER_NEWS_URL, { sid1: "101" });
    const $ = cheerio.load(html);
    const news: NewsData[] = [];

    $(".sh_text_headline, .cluster_text_headline").each((_, element) => {
      const $el = $(element);
      const title = $el.text().trim();
      const url = $el.attr("href") || "";

      if (title && url && title.length > 5) {
        news.push({
          title,
          summary: "",
          source: "네이버뉴스",
          url: url.startsWith("http") ? url : `https://news.naver.com${url}`,
          publishedAt: new Date().toISOString(),
        });
      }
    });

    $(".cluster_text a, .rankingnews_name").each((_, element) => {
      const $el = $(element);
      const title = $el.text().trim();
      const url = $el.attr("href") || "";

      if (title && url && title.length > 10 && !news.some((n) => n.title === title)) {
        news.push({
          title,
          summary: "",
          source: "네이버뉴스",
          url: url.startsWith("http") ? url : `https://news.naver.com${url}`,
          publishedAt: new Date().toISOString(),
        });
      }
    });

    return news.slice(0, MAX_ARTICLES);
  } catch (error) {
    console.error("Error fetching Naver main news:", error);
    return [];
  }
}

export async function fetchNaverFinanceNews(): Promise<NewsData[]> {
  try {
    const html = await fetchWithEncoding(NAVER_FINANCE_NEWS_URL);
    const $ = cheerio.load(html);
    const news: NewsData[] = [];

    $(".articleSubject a").each((_, element) => {
      const $el = $(element);
      const title = $el.attr("title") || $el.text().trim();
      const url = $el.attr("href") || "";

      if (title && url && title.length > 5) {
        news.push({
          title,
          summary: "",
          source: "네이버증권",
          url: url.startsWith("http") ? url : `https://finance.naver.com${url}`,
          publishedAt: new Date().toISOString(),
        });
      }
    });

    $(".block1 dt a, .news_list li a").each((_, element) => {
      const $el = $(element);
      const title = $el.attr("title") || $el.text().trim();
      const url = $el.attr("href") || "";

      if (title && url && title.length > 10 && !news.some((n) => n.title === title)) {
        news.push({
          title,
          summary: "",
          source: "네이버증권",
          url: url.startsWith("http") ? url : `https://finance.naver.com${url}`,
          publishedAt: new Date().toISOString(),
        });
      }
    });

    return news.slice(0, MAX_ARTICLES);
  } catch (error) {
    console.error("Error fetching Naver finance news:", error);
    return [];
  }
}

export async function fetchAllNews(): Promise<NewsData[]> {
  const [mainNews, financeNews] = await Promise.all([
    fetchNaverMainNews(),
    fetchNaverFinanceNews(),
  ]);

  const combined = [...mainNews, ...financeNews].slice(0, MAX_ARTICLES);
  return enrichNewsWithBody(combined);
}
