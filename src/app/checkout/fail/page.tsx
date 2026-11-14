import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "결제 실패" };

export default async function FailPage({ searchParams }: PageProps<"/checkout/fail">) {
  const sp = await searchParams;
  // 주소창 문구를 그대로 길게 보여 주면 가짜 안내문에 악용될 수 있어 짧게 자르고 "사유"로만 표시
  const raw = typeof sp.message === "string" ? sp.message.replace(/[\u0000-\u001f<>]/g, "").slice(0, 80) : "";
  const message = raw ? `사유: ${raw}` : "결제가 완료되지 않았어요.";
  return (
    <section className="view">
      <div className="panel stack" style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
        <h1 className="h2">결제가 완료되지 않았어요</h1>
        <p className="lead" style={{ margin: "0 auto" }}>{message}</p>
        <p className="disclaim">장바구니는 그대로 남아 있어요. 다시 시도해 주세요.</p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link className="btn" href="/checkout">다시 결제하기</Link>
          <Link className="btn ghost" href="/cart">장바구니</Link>
        </div>
      </div>
    </section>
  );
}
