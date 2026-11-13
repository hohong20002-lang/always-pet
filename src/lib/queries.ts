import "server-only";
import { isConfigured, withId } from "@/lib/db";
import { cols } from "@/lib/models";
import type { Pet, Product } from "@/lib/shop";

export async function getProducts(includeHidden = false): Promise<Product[]> {
  if (!isConfigured()) return [];
  const { products } = await cols();
  const list = await products.find(includeHidden ? {} : { active: true }).sort({ sort: 1 }).toArray();
  return list.map(withId);
}

export async function getProduct(id: string): Promise<Product | null> {
  if (!isConfigured()) return null;
  const { products } = await cols();
  const p = await products.findOne({ _id: id });
  return p ? withId(p) : null;
}

/** 로그인한 회원의 반려동물 (클라이언트로 넘길 수 있게 필요한 필드만) */
export async function getPets(userId: string): Promise<Pet[]> {
  const { pets } = await cols();
  const list = await pets.find({ user_id: userId }).sort({ created_at: 1 }).toArray();
  return list.map((p) => ({
    id: p._id,
    name: p.name,
    species: p.species,
    breed: p.breed,
    age_group: p.age_group,
    weight_group: p.weight_group,
    concerns: p.concerns,
    current_ingredients: p.current_ingredients,
    meds: p.meds,
  }));
}

export async function getCartCount(userId: string) {
  const { cart } = await cols();
  const list = await cart.find({ user_id: userId }, { projection: { qty: 1 } }).toArray();
  return list.reduce((a, c) => a + c.qty, 0);
}
