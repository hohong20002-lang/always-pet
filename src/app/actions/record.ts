"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { newId } from "@/lib/db";
import { cols } from "@/lib/models";
import { todayKST } from "@/lib/shop";
import { num, oneOf, sid, str } from "@/lib/validate";

const WALK = ["평소", "줄었음", "많이 줄었음"] as const;
const POOP = ["정상", "무름", "변비", "횟수 적음"] as const;
const WATER = ["평소", "많음", "적음"] as const;

export async function saveLog(input: { petId: string; date?: string; meal: number; walk: string; poop: string; water: string | null; memo: string }) {
  const user = await getUser();
  if (!user) redirect("/login?next=/record");
  const petId = sid(input?.petId);
  const rawDate = str(input?.date, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) && rawDate <= todayKST() ? rawDate : todayKST();
  const meal = num(input?.meal, -1, 2, -1);
  const walk = oneOf(input?.walk, [...WALK, ""] as const, "");
  const poop = oneOf(input?.poop, [...POOP, ""] as const, "");
  const water = oneOf(input?.water, [...WATER, ""] as const, "") || null;
  if (meal < 0 || !walk || !poop) return { error: "식사·활동·배변을 골라 주세요." };

  const { pets, logs } = await cols();
  if (!petId || !(await pets.findOne({ _id: petId, user_id: user.id }))) return { error: "반려동물을 찾을 수 없어요." };
  // 찾는 조건에도 user_id를 넣어 다른 회원의 기록은 절대 건드리지 않게
  await logs.updateOne(
    { pet_id: petId, log_date: date, user_id: user.id },
    {
      $set: { meal, walk, poop, water, memo: str(input?.memo, 300) },
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
  const logId = sid(id);
  if (!logId) return;
  const { logs } = await cols();
  await logs.deleteOne({ _id: logId, user_id: user.id });
  revalidatePath("/record");
}
