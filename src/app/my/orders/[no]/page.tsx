import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import { cols } from "@/lib/models";
import { fmtDateTime, modeNote, ORDER_STATUS, won } from "@/lib/shop";
import CancelOrder from "./CancelOrder";

export const metadata: Metadata = { title: "주문 상세" };

export default async function OrderPage({ params, searchParams }: PageProps<"/my/orders/[no]">) {
  const { no } = await params;
  const sp = await searchParams;
  const user = await getUser();
  if (!user) redirect(`/login?next=/my/orders/${no}`);
  const { orders } = await cols();
  const o = await orders.findOne({ order_no: no, ...(user.is_admin ? {} : { user_id: user.id }) });
  if (!o) notFound();
  const items = o.items.map((it, i) => ({ ...it, id: String(i) }));
  const hasSub = items.some((i) => i.mode === "sub");

  return (
    <section className="view">
      <Link className="back" href="/my">← 구독·주문</Link>
      {sp.paid === "1" && (
        <div className="panel stack" style={{ textAlign: "center", marginBottom: 18 }}>
          <img src="/img/logo.jpg" alt="" style={{ width: 64, height: 64, borderRadius: 14, margin: "0 auto" }} />
          <h1 className="h2">결제가 완료됐어요</h1>
          <p className="lead" style={{ margin: "0 auto" }}>주문번호 <b className="num">{o.order_no}</b></p>
          {hasSub && <p className="disclaim">정기배송은 마이페이지에서 배송일 변경·건너뛰기·해지를 할 수 있어요.</p>}
          <div className="row" style={{ justifyContent: "center" }}>
            <Link className="btn" href="/record">첫 기록 남기기</Link>
            <Link className="btn ghost" href="/my">정기배송 관리</Link>
          </div>
        </div>
      )}
      <div className="cart">
        <div className="stack">
          <div className="panel">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <h2 className="h2" style={{ fontSize: 20 }}>주문 상품</h2>
              <span className={`status ${o.status}`}>{ORDER_STATUS[o.status]}</span>
            </div>
            {items.map((i) => (
              <div key={i.id} className="line">
                <img src={`/img/${i.image}`} alt="" />
                <div className="meta">
                  <b>{i.name}</b>
                  <small>{modeNote(i.mode, i.cycle_weeks, i.plan)} · {i.qty}개</small>
                </div>
                <b className="num">{won(i.unit_price * i.qty)}</b>
              </div>
            ))}
          </div>
          <div className="panel">
            <h2 className="h2" style={{ fontSize: 20, marginBottom: 10 }}>배송 정보</h2>
            <dl className="kv wide">
              <dt>받는 분</dt><dd>{o.recipient}</dd>
              <dt>연락처</dt><dd>{o.phone}</dd>
              <dt>주소</dt><dd>{o.zipcode ? `(${o.zipcode}) ` : ""}{o.address} {o.address_detail}</dd>
              {o.delivery_memo && (<><dt>배송 메모</dt><dd>{o.delivery_memo}</dd></>)}
              {o.tracking_no && (<><dt>송장번호</dt><dd className="num">{o.tracking_no}</dd></>)}
            </dl>
          </div>
        </div>
        <aside className="panel sum">
          <div className="r"><span>주문번호</span><span className="num" style={{ fontSize: 13 }}>{o.order_no}</span></div>
          <div className="r"><span>주문일시</span><span className="num">{fmtDateTime(o.created_at)}</span></div>
          {o.payment_method && <div className="r"><span>결제 수단</span><span>{o.payment_method}</span></div>}
          <div className="r"><span>상품 금액</span><span className="num">{won(o.items_total)}</span></div>
          <div className="r"><span>배송비</span><span className="num">{o.shipping_fee ? won(o.shipping_fee) : "무료"}</span></div>
          <div className="r tot"><span>결제 금액</span><span className="num">{won(o.total)}</span></div>
          {o.receipt_url && <a className="btn small ghost" href={o.receipt_url} target="_blank" rel="noreferrer">영수증 보기</a>}
          {(o.status === "paid" || o.status === "pending") && <CancelOrder orderNo={o.order_no} paid={o.status === "paid"} />}
        </aside>
      </div>
    </section>
  );
}
