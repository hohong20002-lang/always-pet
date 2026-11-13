import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import AuthForm from "./AuthForm";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";
  const mode = sp.mode === "signup" ? "signup" : "login";
  if (await getUser()) redirect(next.startsWith("/") ? next : "/");
  return (
    <section className="view">
      <div className="auth panel stack">
        <div style={{ textAlign: "center" }}>
          <img src="/img/logo.jpg" alt="" style={{ width: 64, height: 64, borderRadius: 14 }} />
          <h1 className="h2" style={{ marginTop: 8 }}>{mode === "signup" ? "올웨이즈 펫 가입하기" : "다시 만나서 반가워요"}</h1>
        </div>
        <AuthForm mode={mode} next={next} error={typeof sp.error === "string" ? sp.error : undefined} />
      </div>
    </section>
  );
}
