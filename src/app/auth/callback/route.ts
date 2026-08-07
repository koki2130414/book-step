import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth(Google)ログイン・パスワード再設定メールのコールバック処理
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
