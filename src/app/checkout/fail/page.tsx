import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "결제 실패" };

export default async function FailPage({ searchParams }: PageProps<"/checkout/fail">) {
  const sp = await searchParams;
  const message = typeof sp.message === "string" ? sp.message : "결제가 완료되지 않았어요.";
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
