import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import { cols } from "@/lib/models";
import { fmtDate, fmtDateTime, ORDER_STATUS, SUB_STATUS, won } from "@/lib/shop";
import { updateOrder, updateProduct } from "@/app/actions/admin";

export const metadata: Metadata = { title: "관리자" };

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const user = await getUser();
  if (!user) redirect("/login?next=/admin");
  if (!user.is_admin) notFound();

  const sp = await searchParams;
  const tab = typeof sp.tab === "string" ? sp.tab : "orders";

  const c = await cols();
  const [orderDocs, subDocs, productDocs, members, pets] = await Promise.all([
    c.orders.find({ status: { $ne: "pending" } }).sort({ created_at: -1 }).limit(200).toArray(),
    c.subs.find({}).sort({ next_date: 1 }).limit(300).toArray(),
    c.products.find({}).sort({ sort: 1 }).toArray(),
    c.users.countDocuments(),
    c.pets.find({}, { projection: { name: 1 } }).toArray(),
  ]);
  const petName = new Map(pets.map((p) => [p._id, p.name]));
  const orders = orderDocs.map((o) => ({ ...o, id: o._id, order_items: o.items }));
  const subs = subDocs.map((s) => ({ ...s, id: s._id, pets: s.pet_id && petName.has(s.pet_id) ? { name: petName.get(s.pet_id)! } : null }));
  const products = productDocs.map((p) => ({ ...p, id: p._id }));

  const paid = (orders ?? []).filter((o) => o.status !== "cancelled");
  const revenue = paid.reduce((a, o) => a + o.total, 0);
  const todo = (orders ?? []).filter((o) => o.status === "paid").length;
  const activeSubs = (subs ?? []).filter((s) => s.status === "active").length;

  const T = (k: string, l: string) => (
    <Link href={`/admin?tab=${k}`} aria-current={tab === k ? "page" : undefined}>{l}</Link>
  );

  return (
    <section className="view">
      <span className="eyebrow">관리자</span>
      <h1 className="h2" style={{ fontSize: 28, marginBottom: 14 }}>운영 현황</h1>
      <div className="stats">
        <div className="panel"><b className="num">{won(revenue)}</b><span>누적 결제 금액 (취소 제외)</span></div>
        <div className="panel"><b className="num">{paid.length}건</b><span>주문</span></div>
        <div className="panel"><b className="num">{todo}건</b><span>처리 대기 (결제 완료)</span></div>
        <div className="panel"><b className="num">{activeSubs}건</b><span>이용 중 정기배송</span></div>
        <div className="panel"><b className="num">{members ?? 0}명</b><span>회원</span></div>
      </div>
      <nav className="tabs">{T("orders", "주문 관리")}{T("subs", "정기배송")}{T("products", "상품·재고")}</nav>

      {tab === "orders" && (
        <div className="tablewrap">
          <table className="t">
            <thead><tr><th>주문일시</th><th>주문번호</th><th>상품</th><th>받는 분</th><th>금액</th><th>상태 · 송장</th></tr></thead>
            <tbody>
              {(orders ?? []).map((o) => (
                <tr key={o.id}>
                  <td className="num">{fmtDateTime(o.created_at)}</td>
                  <td className="num" style={{ fontSize: 12 }}>{o.order_no}</td>
                  <td>{(o.order_items as { name: string; qty: number }[]).map((i) => `${i.name}×${i.qty}`).join(", ")}</td>
                  <td>{o.recipient}<br /><small style={{ color: "var(--muted)" }}>{o.phone} · {o.address} {o.address_detail}{o.delivery_memo ? ` · ${o.delivery_memo}` : ""}</small></td>
                  <td className="num">{won(o.total)}</td>
                  <td>
                    <form action={updateOrder}>
                      <input type="hidden" name="id" value={o.id} />
                      <select name="status" defaultValue={o.status} disabled={o.status === "cancelled"}>
                        {["paid", "preparing", "shipped", "delivered", "cancelled"].map((s) => (
                          <option key={s} value={s}>{s === "cancelled" ? "취소·환불" : ORDER_STATUS[s]}</option>
                        ))}
                      </select>
                      <input type="text" name="tracking_no" defaultValue={o.tracking_no} placeholder="송장번호" />
                      {o.status !== "cancelled" && <button className="btn small">저장</button>}
                    </form>
                  </td>
                </tr>
              ))}
              {!orders?.length && <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted)" }}>아직 주문이 없어요.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "subs" && (
        <div className="tablewrap">
          <table className="t">
            <thead><tr><th>다음 배송</th><th>상품</th><th>아이</th><th>금액</th><th>주기</th><th>남은 양</th><th>상태</th></tr></thead>
            <tbody>
              {(subs ?? []).map((s) => (
                <tr key={s.id}>
                  <td className="num">{fmtDate(s.next_date)}</td>
                  <td>{s.name}{s.qty > 1 ? ` × ${s.qty}` : ""}</td>
                  <td>{(s.pets as { name: string } | null)?.name ?? "-"}</td>
                  <td className="num">{won(s.price * s.qty)}</td>
                  <td>{s.cycle_weeks}주</td>
                  <td className="num">{s.remain}%</td>
                  <td><span className={`status ${s.status === "active" ? "" : "cancelled"}`}>{SUB_STATUS[s.status]}</span></td>
                </tr>
              ))}
              {!subs?.length && <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--muted)" }}>아직 정기배송이 없어요.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "products" && (
        <div className="tablewrap">
          <table className="t">
            <thead><tr><th>상품</th><th>가격 · 재고 · 판매</th></tr></thead>
            <tbody>
              {(products ?? []).map((p) => (
                <tr key={p.id}>
                  <td><b>{p.name}</b><br /><small style={{ color: "var(--muted)" }}>{p.id}{p.id === "carebox" ? " · 케어 박스 가격은 플랜(29,900/39,900원)으로 정해져요" : ""}</small></td>
                  <td>
                    <form action={updateProduct}>
                      <input type="hidden" name="id" value={p.id} />
                      <label style={{ fontSize: 13 }}>가격 <input type="number" name="price" defaultValue={p.price} min={0} step={100} /></label>
                      <label style={{ fontSize: 13 }}>재고 <input type="number" name="stock" defaultValue={p.stock} min={0} /></label>
                      <label style={{ fontSize: 13 }}><input type="checkbox" name="active" defaultChecked={p.active} /> 판매중</label>
                      <button className="btn small">저장</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
