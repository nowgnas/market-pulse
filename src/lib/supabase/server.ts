import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function createSupabaseAdminClient(): SupabaseClient<Database> {
  if (!supabaseUrl || !supabaseServiceKey) {
    // 빌드 시 또는 환경변수 미설정 시 더미 클라이언트 반환
    return {
      from: () => ({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: { message: "Not configured" } }),
          }),
        }),
      }),
    } as unknown as SupabaseClient<Database>;
  }
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export const supabaseAdmin = createSupabaseAdminClient();
