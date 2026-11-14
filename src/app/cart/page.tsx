import Link from "next/link";
import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import { loadCart } from "@/lib/cart";
import { FREE_SHIP, won } from "@/lib/shop";
import { CartQty } from "./CartQty";
import RecommendBanner from "@/components/RecommendBanner";
import { recommend } from "@/lib/recommend";

export const metadata: Metadata = { title: "장바구니" };

export default async function CartPage() {
  const user = await getUser();
  if (!user)
    return (
      <section className="view">
        <div className="empty">
          <h1 className="h2">로그인하면 장바구니를 쓸 수 있어요</h1>
          <p style={{ margin: "10px 0 18px" }}>담은 상품은 계정에 저장돼서 다른 기기에서도 볼 수 있어요.</p>
          <Link className="btn" href="/login?next=/cart">로그인</Link>
        </div>
      </section>
    );

  const cart = await loadCart(user.id);
  if (!cart.lines.length)
    return (
      <section className="view">
        <div className="empty">
          <h1 className="h2">장바구니가 비어 있어요</h1>
          <p style={{ margin: "10px 0 18px" }}>아이의 변화로 필요한 상품을 찾아보세요.</p>
          <Link className="btn" href="/shop">상품 보러 가기</Link>
        </div>
      </section>
    );

  const soldOut = cart.lines.some((l) => l.stock < l.qty);
  const recs = await recommend({ context: cart.lines.map((l) => l.product_id), userId: user.id });
  return (
    <section className="view">
      <h1 className="h2" style={{ fontSize: 28, marginBottom: 12 }}>장바구니</h1>
      <div className="cart">
        <div>
          {cart.lines.map((l) => (
            <div key={l.id} className="line">
              <img src={`/img/${l.image}`} alt="" />
              <div className="meta">
                <b>{l.name}</b>
                <small>{l.note}</small>
                {l.stock < l.qty && <small style={{ color: "var(--danger)" }}>재고가 {l.stock}개 남았어요</small>}
                <CartQty id={l.id} qty={l.qty} />
              </div>
              <div style={{ textAlign: "right" }}>
                <b className="num">{won(l.unit * l.qty)}</b>
              </div>
            </div>
          ))}
        </div>
        <aside className="panel sum">
          <div className="r"><span>상품 금액</span><span className="num">{won(cart.itemsTotal)}</span></div>
          <div className="r"><span>배송비</span><span className="num">{cart.ship ? won(cart.ship) : "무료"}</span></div>
          {cart.ship > 0 && <small style={{ color: "var(--muted)" }}>{won(FREE_SHIP - cart.itemsTotal)} 더 담으면 무료 배송</small>}
          <div className="r tot"><span>결제 예정</span><span className="num">{won(cart.total)}</span></div>
          {cart.hasSub && (
            <p className="disclaim">정기배송 상품은 첫 회차를 지금 결제하고, 다음 배송일은 마이페이지에서 바꾸거나 건너뛸 수 있어요. 위약금 없이 언제든 해지할 수 있어요.</p>
          )}
          {soldOut ? (
            <button className="btn" disabled>재고를 확인해 주세요</button>
          ) : (
            <Link className="btn" href="/checkout">주문하기</Link>
          )}
        </aside>
      </div>
      <RecommendBanner items={recs} title="장바구니와 함께 사면 좋아요" spot="cart" />
    </section>
  );
}
