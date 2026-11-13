"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { createAdminClient, createClient, getUser } from "@/lib/supabase/server";
import { cancelPayment } from "@/lib/toss";

async function requireAdmin() {
  const user = await getUser();
  if (!user) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!data?.is_admin) notFound();
  return supabase;
}

const STATUSES = ["paid", "preparing", "shipped", "delivered", "cancelled"];

export async function updateOrder(fd: FormData) {
  const supabase = await requireAdmin();
  const id = String(fd.get("id"));
  const status = String(fd.get("status"));
  const tracking = String(fd.get("tracking_no") ?? "").trim().slice(0, 40);
  if (!STATUSES.includes(status)) return;
  const { data: o } = await supabase.from("orders").select("status, payment_key").eq("id", id).single();
  if (!o) return;
  if (status === "cancelled" && o.status !== "cancelled" && o.payment_key) {
    const r = await cancelPayment(o.payment_key, "판매자 취소");
    if (!r.ok && r.code !== "ALREADY_CANCELED_PAYMENT") throw new Error("환불 실패: " + r.message);
    await createAdminClient().from("subscriptions").update({ status: "cancelled" }).eq("order_id", id);
  }
  await supabase.from("orders").update({ status, tracking_no: tracking }).eq("id", id);
  revalidatePath("/admin");
}

export async function updateProduct(fd: FormData) {
  const supabase = await requireAdmin();
  const id = String(fd.get("id"));
  const price = Math.max(0, Math.floor(Number(fd.get("price")) || 0));
  const stock = Math.max(0, Math.floor(Number(fd.get("stock")) || 0));
  const active = !!fd.get("active");
  await supabase.from("products").update({ price, stock, active }).eq("id", id);
  revalidatePath("/", "layout");
}
