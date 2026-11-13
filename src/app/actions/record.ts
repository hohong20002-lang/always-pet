"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { newId } from "@/lib/db";
import { cols } from "@/lib/models";
import { todayKST } from "@/lib/shop";

export async function saveLog(input: { petId: string; date?: string; meal: number; walk: string; poop: string; water: string | null; memo: string }) {
  const user = await getUser();
  if (!user) redirect("/login?next=/record");
  const date = input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date) && input.date <= todayKST() ? input.date : todayKST();
  if (![0, 1, 2].includes(input.meal) || !input.walk || !input.poop) return { error: "식사·활동·배변을 골라 주세요." };
  const { pets, logs } = await cols();
  if (!(await pets.findOne({ _id: input.petId, user_id: user.id }))) return { error: "반려동물을 찾을 수 없어요." };
  await logs.updateOne(
    { pet_id: input.petId, log_date: date },
    {
      $set: {
        user_id: user.id,
        meal: input.meal,
        walk: String(input.walk).slice(0, 20),
        poop: String(input.poop).slice(0, 20),
        water: input.water ? String(input.water).slice(0, 20) : null,
        memo: String(input.memo ?? "").trim().slice(0, 300),
      },
      $setOnInsert: { _id: newId(), created_at: new Date() },
    },
    { upsert: true },
  );
  revalidatePath("/record");
  return { ok: "기록을 저장했어요" };
}

export async function deleteLog(id: string) {
  const user = await getUser();
  if (!user) redirect("/login?next=/record");
  const { logs } = await cols();
  await logs.deleteOne({ _id: id, user_id: user.id });
  revalidatePath("/record");
}
