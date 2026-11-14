"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { newId } from "@/lib/db";
import { cols } from "@/lib/models";
import { AGE_GROUPS, CONCERNS, INGREDIENTS, WEIGHT_GROUPS } from "@/lib/shop";
import { addToCart } from "./cart";
import { oneOf, safeNext, sid, str, strList } from "@/lib/validate";

export type PetInput = {
  id?: string | null;
  name: string;
  species: "dog" | "cat";
  breed: string;
  age_group: string;
  weight_group: string;
  concerns: string[];
  current_ingredients: string[];
  meds: string;
};

function clean(p: PetInput) {
  const concernIds = CONCERNS.map((c) => c.id as string);
  return {
    name: str(p?.name, 20) || "우리 아이",
    species: oneOf(p?.species, ["dog", "cat"] as const, "dog"),
    breed: str(p?.breed, 30),
    age_group: oneOf(p?.age_group, AGE_GROUPS, AGE_GROUPS[1]),
    weight_group: oneOf(p?.weight_group, WEIGHT_GROUPS, WEIGHT_GROUPS[0]),
    concerns: [...new Set(strList(p?.concerns).filter((c) => concernIds.includes(c)))].slice(0, 2),
    current_ingredients: [...new Set(strList(p?.current_ingredients).filter((c) => INGREDIENTS.includes(c)))],
    meds: str(p?.meds, 200),
  };
}

/** 반려동물 저장 (없으면 새로 만들기). 저장된 id를 돌려줘요. */
export async function savePet(p: PetInput, next = "/my/pets"): Promise<{ id?: string; error?: string }> {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(safeNext(next))}`);
  const { pets } = await cols();
  const row = clean(p);
  const petId = sid(p?.id);
  if (petId) {
    const r = await pets.updateOne({ _id: petId, user_id: user.id }, { $set: row });
    if (r.matchedCount) {
      revalidatePath("/", "layout");
      return { id: petId };
    }
  }
  const id = newId();
  await pets.insertOne({ _id: id, user_id: user.id, ...row, created_at: new Date() });
  revalidatePath("/", "layout");
  return { id };
}

export async function deletePet(id: string) {
  const user = await getUser();
  if (!user) redirect("/login?next=/my/pets");
  const petId = sid(id);
  if (!petId) return;
  const { pets, logs, cart, subs } = await cols();
  const r = await pets.deleteOne({ _id: petId, user_id: user.id });
  if (r.deletedCount) {
    await logs.deleteMany({ pet_id: petId, user_id: user.id });
    await cart.updateMany({ pet_id: petId, user_id: user.id }, { $set: { pet_id: null } });
    await subs.updateMany({ pet_id: petId, user_id: user.id }, { $set: { pet_id: null } });
  }
  revalidatePath("/", "layout");
}

/** 케어 박스: 반려동물 정보를 저장하고 정기배송으로 장바구니에 담기 */
export async function addCareBox(p: PetInput, plan: string): Promise<{ ok?: string; error?: string }> {
  const saved = await savePet(p, "/box");
  if (!saved.id) return { error: saved.error ?? "저장하지 못했어요." };
  return addToCart({ productId: "carebox", mode: "sub", cycle: 4, qty: 1, plan, petId: saved.id, next: "/box" });
}
