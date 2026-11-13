"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup } from "@/app/actions/auth";

export default function AuthForm({ mode, next, error }: { mode: "login" | "signup"; next: string; error?: string }) {
  const [state, action, pending] = useActionState(mode === "signup" ? signup : login, null);
  const q = `next=${encodeURIComponent(next)}`;

  return (
    <>
      <div className="tabs" role="tablist">
        <Link href={`/login?${q}`} aria-current={mode === "login" ? "page" : undefined}>로그인</Link>
        <Link href={`/login?mode=signup&${q}`} aria-current={mode === "signup" ? "page" : undefined}>회원가입</Link>
      </div>
      {state?.info ? (
        <p className="ok-msg">{state.info}</p>
      ) : (
        <form action={action} className="form">
          <input type="hidden" name="next" value={next} />
          {mode === "signup" && (
            <label>
              이름
              <input type="text" name="name" autoComplete="name" required />
            </label>
          )}
          <label>
            이메일
            <input type="email" name="email" autoComplete="email" required />
          </label>
          <label>
            비밀번호 {mode === "signup" && <small>8자 이상</small>}
            <input type="password" name="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={mode === "signup" ? 8 : undefined} required />
          </label>
          {mode === "signup" && (
            <label style={{ flexDirection: "row", alignItems: "flex-start", fontWeight: 400, gap: 8 }}>
              <input type="checkbox" name="agree" style={{ marginTop: 5 }} />
              <span>
                <Link href="/terms" target="_blank">이용약관</Link>과 <Link href="/privacy" target="_blank">개인정보 수집·이용</Link>에 동의해요 (필수)
              </span>
            </label>
          )}
          {(state?.error || error) && <p className="err">{state?.error || error}</p>}
          <button className="btn" disabled={pending}>{pending ? "처리 중…" : mode === "signup" ? "가입하기" : "로그인"}</button>
        </form>
      )}
    </>
  );
}
