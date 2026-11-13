import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import { cols } from "@/lib/models";
import { fmtDateTime, ORDER_STATUS, won } from "@/lib/shop";
import { logout } from "@/app/actions/auth";
import SubCard, { type Sub } from "./SubCard";
import MyTabs from "./MyTabs";

export const metadata: Metadata = { title: "구독·주문" };

export default async function MyPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/my");
  const c = await cols();
  const [subDocs, orders, pets] = await Promise.all([
    c.subs.find({ user_id: user.id }).sort({ created_at: -1 }).toArray(),
    c.orders.find({ user_id: user.id, status: { $ne: "pending" } }).sort({ created_at: -1 }).limit(20).toArray(),
    c.pets.find({ user_id: user.id }, { projection: { name: 1 } }).toArray(),
  ]);
  const petName = new Map(pets.map((p) => [p._id, p.name]));
  const subs: Sub[] = subDocs.map((s) => ({
    id: s._id,
    name: s.name,
    image: s.image,
    price: s.price,
    qty: s.qty,
    cycle_weeks: s.cycle_weeks,
    next_date: s.next_date,
    remain: s.remain,
    status: s.status,
    paused_until: s.paused_until,
    pet_name: s.pet_id ? petName.get(s.pet_id) ?? null : null,
  }));
  const profile = user;
  const active = subs.filter((s) => s.status === "active" || s.status === "paused");
  const ended = subs.filter((s) => s.status === "cancelled" || s.status === "farewell");

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
