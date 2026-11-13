"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import type { Mode } from "@/lib/shop";

export type ActionResult = { ok?: string; error?: string } | null;

async function requireUser(next: string) {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function addToCart(input: { productId: string; mode: Mode; cycle: number; qty: number; plan?: string; petId?: string | null; next: string }): Promise<ActionResult> {
  const user = await requireUser(input.next);
  const supabase = await createClient();

  const { data: p } = await supabase.from("products").select("id, subscribable, trial_price, stock, active").eq("id", input.productId).maybeSingle();
  if (!p || !p.active) return { error: "판매하지 않는 상품이에요." };
  if (p.stock <= 0) return { error: "품절된 상품이에요." };
  if (input.mode === "sub" && !p.subscribable) return { error: "정기배송이 되지 않는 상품이에요." };
  if (input.mode === "trial" && !p.trial_price) return { error: "체험팩이 없는 상품이에요." };

  const qty = Math.max(1, Math.min(9, Math.floor(input.qty) || 1));
  const cycle = input.mode === "sub" ? ([2, 4, 6].includes(input.cycle) ? input.cycle : 4) : 0;
  const plan = p.id === "carebox" ? (input.plan === "premium" ? "premium" : "basic") : "";

  const { data: ex } = await supabase
    .from("cart_items")
    .select("id, qty")
    .eq("user_id", user.id)
    .eq("product_id", p.id)
    .eq("mode", input.mode)
    .eq("cycle_weeks", cycle)
    .eq("plan", plan)
    .maybeSingle();

  const { error } = ex
    ? await supabase.from("cart_items").update({ qty: Math.min(99, ex.qty + qty), pet_id: input.petId ?? null }).eq("id", ex.id)
    : await supabase.from("cart_items").insert({ user_id: user.id, product_id: p.id, mode: input.mode, cycle_weeks: cycle, plan, qty, pet_id: input.petId ?? null });
  if (error) return { error: "장바구니에 담지 못했어요. 잠시 후 다시 시도해 주세요." };

  revalidatePath("/", "layout");
  return { ok: "장바구니에 담았어요" };
}

export async function updateCartQty(id: string, qty: number) {
  await requireUser("/cart");
  const supabase = await createClient();
  if (qty <= 0) await supabase.from("cart_items").delete().eq("id", id);
  else await supabase.from("cart_items").update({ qty: Math.min(99, qty) }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function removeCartItem(id: string) {
  await requireUser("/cart");
  const supabase = await createClient();
  await supabase.from("cart_items").delete().eq("id", id);
  revalidatePath("/", "layout");
}
