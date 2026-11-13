"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { todayKST } from "@/lib/shop";

export async function saveLog(input: { petId: string; date?: string; meal: number; walk: string; poop: string; water: string | null; memo: string }) {
  const user = await getUser();
  if (!user) redirect("/login?next=/record");
  const date = input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date) && input.date <= todayKST() ? input.date : todayKST();
  if (![0, 1, 2].includes(input.meal) || !input.walk || !input.poop) return { error: "식사·활동·배변을 골라 주세요." };
  const supabase = await createClient();
  const { error } = await supabase.from("health_logs").upsert(
    {
      user_id: user.id,
      pet_id: input.petId,
      log_date: date,
      meal: input.meal,
      walk: input.walk.slice(0, 20),
      poop: input.poop.slice(0, 20),
      water: input.water?.slice(0, 20) ?? null,
      memo: input.memo.trim().slice(0, 300),
    },
    { onConflict: "pet_id,log_date" },
  );
  if (error) return { error: "기록을 저장하지 못했어요." };
  revalidatePath("/record");
  return { ok: "기록을 저장했어요" };
}

export async function deleteLog(id: string) {
  const user = await getUser();
  if (!user) redirect("/login?next=/record");
  const supabase = await createClient();
  await supabase.from("health_logs").delete().eq("id", id);
  revalidatePath("/record");
}
