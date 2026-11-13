import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export function isConfigured() {
  return URL.startsWith("https://") && !URL.includes("xxxxxxxx") && KEY.length > 20 && !KEY.endsWith("_xxx");
}

/** 로그인한 사용자 권한으로 동작하는 클라이언트 (RLS 적용) */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(URL, KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없어요. proxy가 세션을 갱신합니다.
        }
      },
    },
  });
}

/** 서버 전용 관리자 클라이언트 (RLS 우회). 결제 확정·환불·구독 생성에만 사용 */
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY ?? "";
  if (!secret || secret.endsWith("_xxx")) throw new Error("SUPABASE_SECRET_KEY가 설정되지 않았어요.");
  return createPlainClient(URL, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function getUser() {
  await cookies(); // 로그인 상태에 따라 달라지는 페이지임을 Next.js에 알려 정적 빌드되지 않게 해요
  if (!isConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
