"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, isConfigured } from "@/lib/supabase/server";

export type AuthState = { error?: string; info?: string } | null;

const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
};

export async function login(_: AuthState, fd: FormData): Promise<AuthState> {
  if (!isConfigured()) return { error: "데이터베이스가 아직 연결되지 않았어요." };
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (/confirm/i.test(error.message)) return { error: "이메일 인증이 아직 안 됐어요. 받은 메일의 링크를 눌러 주세요." };
    return { error: "이메일 또는 비밀번호가 맞지 않아요." };
  }
  revalidatePath("/", "layout");
  redirect(safeNext(fd.get("next")));
}

export async function signup(_: AuthState, fd: FormData): Promise<AuthState> {
  if (!isConfigured()) return { error: "데이터베이스가 아직 연결되지 않았어요." };
  const name = String(fd.get("name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (!name) return { error: "이름을 입력해 주세요." };
  if (password.length < 8) return { error: "비밀번호는 8자 이상으로 정해 주세요." };
  if (!fd.get("agree")) return { error: "이용약관과 개인정보 수집·이용에 동의해 주세요." };

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const next = safeNext(fd.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) {
    if (/registered|exists/i.test(error.message)) return { error: "이미 가입된 이메일이에요. 로그인해 주세요." };
    return { error: "가입하지 못했어요: " + error.message };
  }
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(next);
  }
  return { info: `${email}로 인증 메일을 보냈어요. 메일의 링크를 누르면 가입이 끝나요.` };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
