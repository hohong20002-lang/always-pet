import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import { loadCart } from "@/lib/cart";
import { won } from "@/lib/shop";
import CheckoutForm from "./CheckoutForm";

export const metadata: Metadata = { title: "주문·결제" };

export default async function CheckoutPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/checkout");
  const cart = await loadCart(user.id);
  if (!cart.lines.length) redirect("/cart");
  const profile = user;

  return (
    <section className="view">
      <h1 className="h2" style={{ fontSize: 28, marginBottom: 12 }}>주문·결제</h1>
      <div className="cart">
        <CheckoutForm
          amount={cart.total}
          customerKey={user.id}
          profile={{
            name: profile?.name ?? "",
            phone: profile?.phone ?? "",
            zipcode: profile?.zipcode ?? "",
            address: profile?.address ?? "",
            address_detail: profile?.address_detail ?? "",
          }}
        />
        <aside className="panel sum">
          <b>주문 상품</b>
          {cart.lines.map((l) => (
            <div key={l.id} className="r" style={{ fontSize: 14, gap: 10 }}>
              <span>
                {l.name} × {l.qty}
                <br />
                <small style={{ color: "var(--muted)" }}>{l.note}</small>
              </span>
              <span className="num">{won(l.unit * l.qty)}</span>
            </div>
          ))}
          <div className="r"><span>상품 금액</span><span className="num">{won(cart.itemsTotal)}</span></div>
          <div className="r"><span>배송비</span><span className="num">{cart.ship ? won(cart.ship) : "무료"}</span></div>
          <div className="r tot"><span>결제 금액</span><span className="num">{won(cart.total)}</span></div>
          <p className="disclaim">테스트 결제 환경이에요. 카드 정보를 입력해도 실제로 돈이 나가지 않아요.</p>
        </aside>
      </div>
    </section>
  );
}
