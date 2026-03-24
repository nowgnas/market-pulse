import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function createSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseUrl || !supabaseAnonKey) {
    // 빌드 시 또는 환경변수 미설정 시 더미 클라이언트 반환
    return {
      from: () => ({
        select: () => ({
          order: () => ({
            limit: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
            range: () => Promise.resolve({ data: [], error: null, count: 0 }),
          }),
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: { code: "PGRST116" } }),
          }),
        }),
      }),
    } as unknown as SupabaseClient<Database>;
  }
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

export const supabase = createSupabaseClient();
