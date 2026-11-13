"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { addDays, todayKST } from "@/lib/shop";

async function load(id: string) {
  const user = await getUser();
  if (!user) redirect("/login?next=/my");
  const supabase = await createClient();
  const { data } = await supabase.from("subscriptions").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  return { supabase, sub: data, user };
}

/** 다음 배송일 당기기·미루기·건너뛰기 */
export async function shiftNext(id: string, days: number) {
  const { supabase, sub } = await load(id);
  if (!sub || sub.status !== "active") return { error: "이용 중인 구독이 아니에요." };
  const tomorrow = addDays(todayKST(), 1);
  let next = addDays(sub.next_date, Math.max(-28, Math.min(56, days)));
  if (next < tomorrow) next = tomorrow;
  // 남은 양을 반영해 배송일을 바꿨으면 잔여량을 초기화
  await supabase.from("subscriptions").update({ next_date: next, remain: days === sub.cycle_weeks * 7 ? sub.remain : 40 }).eq("id", id);
  revalidatePath("/my");
  return { ok: `다음 배송일을 ${next}로 바꿨어요` };
}

export async function setRemain(id: string, remain: number) {
  const { supabase, sub } = await load(id);
  if (!sub) return;
  await supabase.from("subscriptions").update({ remain: Math.max(0, Math.min(100, Math.round(remain / 10) * 10)) }).eq("id", id);
  revalidatePath("/my");
}

export async function setCycle(id: string, weeks: number) {
  const { supabase, sub } = await load(id);
  if (!sub || ![2, 4, 6].includes(weeks)) return;
  await supabase.from("subscriptions").update({ cycle_weeks: weeks }).eq("id", id);
  revalidatePath("/my");
}

/** 잠시 쉬기 / 해지 / 이별 */
export async function endSubscription(id: string, kind: "pause" | "cancel" | "farewell") {
  const { supabase, sub, user } = await load(id);
  if (!sub) return { error: "구독을 찾을 수 없어요." };
  if (kind === "pause") {
    const until = addDays(sub.next_date, 30);
    await supabase.from("subscriptions").update({ status: "paused", paused_until: until, next_date: until }).eq("id", id);
  } else if (kind === "cancel") {
    await supabase.from("subscriptions").update({ status: "cancelled" }).eq("id", id);
  } else {
    // 이별: 해당 아이의 모든 구독을 정리하고 마케팅 알림 끄기
    const q = supabase.from("subscriptions").update({ status: "farewell" }).eq("user_id", user.id).in("status", ["active", "paused"]);
    await (sub.pet_id ? q.eq("pet_id", sub.pet_id) : q.eq("id", id));
    await supabase.from("profiles").update({ marketing_opt_in: false }).eq("id", user.id);
  }
  revalidatePath("/my");
  return { ok: kind };
}

export async function resumeSubscription(id: string) {
  const { supabase, sub } = await load(id);
  if (!sub || sub.status === "active") return;
  const tomorrow = addDays(todayKST(), 1);
  await supabase
    .from("subscriptions")
    .update({ status: "active", paused_until: null, next_date: sub.next_date < tomorrow ? addDays(todayKST(), 3) : sub.next_date })
    .eq("id", id);
  revalidatePath("/my");
}
