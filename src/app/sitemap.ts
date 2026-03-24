import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase/client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://market-pulse.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data } = await supabase
    .from("posts")
    .select("id, published_at, updated_at")
    .order("published_at", { ascending: false })
    .limit(200);

  const posts = (data || []) as Array<{ id: string; published_at: string; updated_at: string }>;

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/posts/${post.id}`,
    lastModified: new Date(post.updated_at || post.published_at),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    ...postEntries,
  ];
}
