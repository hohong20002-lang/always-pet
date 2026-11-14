"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { cols } from "@/lib/models";
import { addDays, todayKST } from "@/lib/shop";
import { num, sid } from "@/lib/validate";

async function load(id: string) {
  const user = await getUser();
  if (!user) redirect("/login?next=/my");
  const c = await cols();
  const subId = sid(id);
  const sub = subId ? await c.subs.findOne({ _id: subId, user_id: user.id }) : null;
  return { ...c, sub, user };
}

/** 다음 배송일 당기기·미루기·건너뛰기 */
export async function shiftNext(id: string, days: number) {
  const { subs, sub } = await load(id);
  if (!sub || sub.status !== "active") return { error: "이용 중인 정기배송이 아니에요." };
  days = num(days, -28, 56, 0);
  if (!days) return { error: "바꿀 날짜를 다시 골라 주세요." };
  const tomorrow = addDays(todayKST(), 1);
  let next = addDays(sub.next_date, days);
  if (next < tomorrow) next = tomorrow;
  // 건너뛰기가 아닌 날짜 조정이면 남은 양 기준을 초기화
  const remain = days === sub.cycle_weeks * 7 ? sub.remain : 40;
  await subs.updateOne({ _id: sub._id }, { $set: { next_date: next, remain } });
  revalidatePath("/my");
  return { ok: `다음 배송일을 ${next}로 바꿨어요` };
}

export async function setRemain(id: string, remain: number) {
  const { subs, sub } = await load(id);
  const r = num(remain, 0, 100, -1);
  if (!sub || r < 0) return;
  await subs.updateOne({ _id: sub._id }, { $set: { remain: Math.round(r / 10) * 10 } });
  revalidatePath("/my");
}

export async function setCycle(id: string, weeks: number) {
  const { subs, sub } = await load(id);
  if (!sub || ![2, 4, 6].includes(weeks)) return;
  await subs.updateOne({ _id: sub._id }, { $set: { cycle_weeks: weeks } });
  revalidatePath("/my");
}

/** 잠시 쉬기 / 해지 / 이별 */
export async function endSubscription(id: string, kind: "pause" | "cancel" | "farewell") {
  const { subs, users, sub, user } = await load(id);
  if (!sub) return { error: "정기배송을 찾을 수 없어요." };
  if (!["pause", "cancel", "farewell"].includes(kind)) return { error: "알 수 없는 요청이에요." };
  if (kind === "pause") {
    const until = addDays(sub.next_date, 30);
    await subs.updateOne({ _id: sub._id }, { $set: { status: "paused", paused_until: until, next_date: until } });
  } else if (kind === "cancel") {
    await subs.updateOne({ _id: sub._id }, { $set: { status: "cancelled" } });
  } else {
    // 이별: 해당 아이의 모든 정기배송을 정리하고 마케팅 알림 끄기
    await subs.updateMany(
      { user_id: user.id, status: { $in: ["active", "paused"] }, ...(sub.pet_id ? { pet_id: sub.pet_id } : { _id: sub._id }) },
      { $set: { status: "farewell" } },
    );
    await users.updateOne({ _id: user.id }, { $set: { marketing_opt_in: false } });
  }
  revalidatePath("/my");
  return { ok: kind };
}

export async function resumeSubscription(id: string) {
  const { subs, sub } = await load(id);
  if (!sub || sub.status === "active") return;
  const tomorrow = addDays(todayKST(), 1);
  await subs.updateOne(
    { _id: sub._id },
    { $set: { status: "active", paused_until: null, next_date: sub.next_date < tomorrow ? addDays(todayKST(), 3) : sub.next_date } },
  );
  revalidatePath("/my");
}
