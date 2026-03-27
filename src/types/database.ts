export type PostType = "morning" | "noon" | "evening" | "weekly_review" | "week_ahead";
export type PostCategory = "news" | "stock" | "mixed";

export interface Post {
  id: string;
  title: string;
  content: string;
  summary: string;
  post_type: PostType;
  category: PostCategory;
  published_at: string;
  created_at: string;
  updated_at: string;
  metadata: PostMetadata | null;
}

export interface MarketStatus {
  isHoliday: boolean;
  holidayName?: string;
}

export interface PostMetadata {
  stocks?: StockData[];
  news?: NewsData[];
  indices?: IndexData[];
  marketStatus?: {
    kr: MarketStatus;
    us: MarketStatus;
  };
}

export type MarketRegion = "KR" | "US";

export interface StockData {
  name: string;
  code: string;
  price: number;
  change: number;
  changePercent: number;
  market: MarketRegion;
}

export interface NewsData {
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  body?: string;
}

export interface IndexData {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  market: MarketRegion;
}

export type PostInsert = Omit<Post, "id" | "created_at" | "updated_at">;
export type PostUpdate = Partial<Omit<Post, "id" | "created_at">>;

export interface Database {
  public: {
    Tables: {
      posts: {
        Row: Post;
        Insert: PostInsert;
        Update: PostUpdate;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
