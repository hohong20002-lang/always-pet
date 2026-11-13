import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient, getUser } from "@/lib/supabase/server";
import { fmtDateTime, ORDER_STATUS, won } from "@/lib/shop";
import { logout } from "@/app/actions/auth";
import SubCard, { type Sub } from "./SubCard";
import MyTabs from "./MyTabs";

export const metadata: Metadata = { title: "구독·주문" };

export default async function MyPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/my");
  const supabase = await createClient();
  const [{ data: subs }, { data: orders }, { data: profile }] = await Promise.all([
    supabase.from("subscriptions").select("*, pets(name)").order("created_at", { ascending: false }),
    supabase.from("orders").select("order_no, order_name, total, status, created_at").neq("status", "pending").order("created_at", { ascending: false }).limit(20),
    supabase.from("profiles").select("name").eq("id", user.id).maybeSingle(),
  ]);
  const active = ((subs ?? []) as Sub[]).filter((s) => s.status === "active" || s.status === "paused");
  const ended = ((subs ?? []) as Sub[]).filter((s) => s.status === "cancelled" || s.status === "farewell");

  return (
    <section className="view">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <div>
          <span className="eyebrow">마이페이지</span>
          <h1 className="h2" style={{ fontSize: 28 }}>{profile?.name || "회원"}님, 안녕하세요</h1>
        </div>
        <form action={logout}>
          <button className="btn small quiet">로그아웃</button>
        </form>
      </div>
      <MyTabs />

      <h2 className="h2" style={{ fontSize: 20, margin: "8px 0 12px" }}>정기배송</h2>
      {active.length ? (
        <div className="list">{active.map((s) => <SubCard key={s.id} sub={s} />)}</div>
      ) : (
        <div className="panel stack">
          <p>이용 중인 정기배송이 없어요.</p>
          <div><Link className="btn small" href="/box">케어 박스 구성하기</Link></div>
        </div>
      )}
      {ended.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: "pointer", color: "var(--muted)" }}>종료된 정기배송 {ended.length}건</summary>
          <div className="list" style={{ marginTop: 10 }}>{ended.map((s) => <SubCard key={s.id} sub={s} />)}</div>
        </details>
      )}

      <h2 className="h2" style={{ fontSize: 20, margin: "28px 0 12px" }}>주문 내역</h2>
      {orders?.length ? (
        <div className="list">
          {orders.map((o) => (
            <Link key={o.order_no} href={`/my/orders/${o.order_no}`} className="panel orderrow">
              <div className="meta">
                <b>{o.order_name}</b>
                <small className="num">{fmtDateTime(o.created_at)} · {o.order_no}</small>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className={`status ${o.status}`}>{ORDER_STATUS[o.status]}</span>
                <div className="num" style={{ fontWeight: 700 }}>{won(o.total)}</div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="panel"><p style={{ color: "var(--muted)" }}>아직 주문한 상품이 없어요.</p></div>
      )}
    </section>
  );
}
