"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { newId } from "@/lib/db";
import { cols } from "@/lib/models";
import type { Mode } from "@/lib/shop";

export type ActionResult = { ok?: string; error?: string };

async function requireUser(next: string) {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function addToCart(input: { productId: string; mode: Mode; cycle: number; qty: number; plan?: string; petId?: string | null; next: string }): Promise<ActionResult> {
  const user = await requireUser(input.next);
  const { products, cart, pets } = await cols();

  const p = await products.findOne({ _id: String(input.productId) });
  if (!p || !p.active) return { error: "판매하지 않는 상품이에요." };
  if (p.stock <= 0) return { error: "품절된 상품이에요." };
  const mode: Mode = ["once", "trial", "sub"].includes(input.mode) ? input.mode : "once";
  if (mode === "sub" && !p.subscribable) return { error: "정기배송이 되지 않는 상품이에요." };
  if (mode === "trial" && !p.trial_price) return { error: "체험팩이 없는 상품이에요." };

  const qty = Math.max(1, Math.min(9, Math.floor(input.qty) || 1));
  const cycle = mode === "sub" ? ([2, 4, 6].includes(input.cycle) ? input.cycle : 4) : 0;
  const plan = p._id === "carebox" ? (input.plan === "premium" ? "premium" : "basic") : "";
  // 남의 반려동물 id가 들어오지 않게 확인
  const petId = input.petId && (await pets.findOne({ _id: input.petId, user_id: user.id })) ? input.petId : null;

  const key = { user_id: user.id, product_id: p._id, mode, cycle_weeks: cycle, plan };
  const ex = await cart.findOne(key);
  if (ex) await cart.updateOne({ _id: ex._id }, { $set: { qty: Math.min(99, ex.qty + qty), pet_id: petId } });
  else await cart.insertOne({ _id: newId(), ...key, pet_id: petId, qty, created_at: new Date() });

  revalidatePath("/", "layout");
  return { ok: "장바구니에 담았어요" };
}

export async function updateCartQty(id: string, qty: number) {
  const user = await requireUser("/cart");
  const { cart } = await cols();
  if (qty <= 0) await cart.deleteOne({ _id: id, user_id: user.id });
  else await cart.updateOne({ _id: id, user_id: user.id }, { $set: { qty: Math.min(99, Math.floor(qty)) } });
  revalidatePath("/", "layout");
}

export async function removeCartItem(id: string) {
  const user = await requireUser("/cart");
  const { cart } = await cols();
  await cart.deleteOne({ _id: id, user_id: user.id });
  revalidatePath("/", "layout");
}
