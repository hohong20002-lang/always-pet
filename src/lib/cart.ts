import "server-only";
import { cols } from "@/lib/models";
import { modeNote, PLANS, shippingFee, unitPrice, type Mode, type PlanKey } from "@/lib/shop";

export type CartLine = {
  id: string;
  product_id: string;
  name: string;
  image: string;
  mode: Mode;
  cycle_weeks: number;
  plan: string;
  pet_id: string | null;
  qty: number;
  unit: number;
  note: string;
  stock: number;
};

/** 장바구니와 금액을 DB 가격 기준으로 계산해요 (화면·주문 생성 모두 이 함수 사용) */
export async function loadCart(userId: string) {
  const { cart, products } = await cols();
  const rows = await cart.find({ user_id: userId }).sort({ created_at: 1 }).toArray();
  const prods = await products.find({ _id: { $in: [...new Set(rows.map((r) => r.product_id))] } }).toArray();
  const byId = new Map(prods.map((p) => [p._id, p]));

  const lines: CartLine[] = [];
  for (const r of rows) {
    const p = byId.get(r.product_id);
    if (!p || !p.active) continue;
    lines.push({
      id: r._id,
      product_id: p._id,
      name: p._id === "carebox" ? `${p.name} · ${PLANS[(r.plan as PlanKey) || "basic"]?.label ?? "기본"}` : p.name,
      image: p.image,
      mode: r.mode,
      cycle_weeks: r.cycle_weeks,
      plan: r.plan,
      pet_id: r.pet_id,
      qty: r.qty,
      unit: unitPrice({ id: p._id, price: p.price, trial_price: p.trial_price }, r.mode, r.plan),
      note: modeNote(r.mode, r.cycle_weeks, r.plan),
      stock: p.stock,
    });
  }
  const itemsTotal = lines.reduce((a, l) => a + l.unit * l.qty, 0);
  const ship = shippingFee(itemsTotal);
  return { lines, itemsTotal, ship, total: itemsTotal + ship, hasSub: lines.some((l) => l.mode === "sub") };
}
