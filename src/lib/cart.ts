import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
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

type Row = {
  id: string;
  qty: number;
  mode: Mode;
  cycle_weeks: number;
  plan: string;
  pet_id: string | null;
  products: { id: string; name: string; image: string; price: number; trial_price: number | null; stock: number; active: boolean } | null;
};

/** 장바구니와 금액을 DB 가격 기준으로 계산해요 (화면·주문 생성 모두 이 함수 사용) */
export async function loadCart(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("cart_items")
    .select("id, qty, mode, cycle_weeks, plan, pet_id, products(id, name, image, price, trial_price, stock, active)")
    .order("created_at");
  const lines: CartLine[] = ((data ?? []) as unknown as Row[])
    .filter((r) => r.products && r.products.active)
    .map((r) => {
      const p = r.products!;
      const name = p.id === "carebox" ? `${p.name} · ${PLANS[(r.plan as PlanKey) || "basic"]?.label ?? "기본"}` : p.name;
      return {
        id: r.id,
        product_id: p.id,
        name,
        image: p.image,
        mode: r.mode,
        cycle_weeks: r.cycle_weeks,
        plan: r.plan,
        pet_id: r.pet_id,
        qty: r.qty,
        unit: unitPrice(p, r.mode, r.plan),
        note: modeNote(r.mode, r.cycle_weeks, r.plan),
        stock: p.stock,
      };
    });
  const itemsTotal = lines.reduce((a, l) => a + l.unit * l.qty, 0);
  const ship = shippingFee(itemsTotal);
  return { lines, itemsTotal, ship, total: itemsTotal + ship, hasSub: lines.some((l) => l.mode === "sub") };
}
