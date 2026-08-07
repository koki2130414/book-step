// サーバーコンポーネント/Route Handlerから使用するSupabaseクライアント
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Server ComponentからのCookie設定はmiddlewareで処理されるため無視してよい
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // 同上
          }
        },
      },
    },
  );
}

// 管理者専用の操作(RLSをバイパスする必要がある処理)でのみ使用する
// 例: 管理画面からのユーザー利用停止など。絶対にクライアントへ露出させない
export function createServiceRoleClient() {
  const { createClient: createSupabaseClient } = require("@supabase/supabase-js");
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
