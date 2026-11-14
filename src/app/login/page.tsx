import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import AuthForm from "./AuthForm";
import { safeNext } from "@/lib/validate";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const mode = sp.mode === "signup" ? "signup" : "login";
  if (await getUser()) redirect(next);
  return (
    <section className="view">
      <div className="auth panel stack">
        <div style={{ textAlign: "center" }}>
          <img src="/img/logo.jpg" alt="" style={{ width: 64, height: 64, borderRadius: 14 }} />
          <h1 className="h2" style={{ marginTop: 8 }}>{mode === "signup" ? "올웨이즈 펫 가입하기" : "다시 만나서 반가워요"}</h1>
        </div>
        {/* 주소창의 문구를 그대로 보여 주면 가짜 안내문을 띄우는 데 악용될 수 있어 error 파라미터는 쓰지 않아요 */}
        <AuthForm mode={mode} next={next} />
      </div>
    </section>
  );
}
