"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/auth";
import { cols, type OrderStatus } from "@/lib/models";
import { cancelOrderDoc } from "@/lib/orders";

async function requireAdmin() {
  const user = await getUser();
  if (!user?.is_admin) notFound();
  return user;
}

const STATUSES: OrderStatus[] = ["paid", "preparing", "shipped", "delivered", "cancelled"];

export async function updateOrder(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id"));
  const status = String(fd.get("status")) as OrderStatus;
  const tracking = String(fd.get("tracking_no") ?? "").trim().slice(0, 40);
  if (!STATUSES.includes(status)) return;
  const { orders } = await cols();
  const o = await orders.findOne({ _id: id });
  if (!o || o.status === "cancelled") return;
  if (status === "cancelled") {
    const r = await cancelOrderDoc(o, "판매자 취소");
    if (!r.ok) throw new Error("환불 실패: " + r.message);
    await orders.updateOne({ _id: id }, { $set: { tracking_no: tracking } });
  } else {
    await orders.updateOne({ _id: id }, { $set: { status, tracking_no: tracking } });
  }
  revalidatePath("/admin");
}

export async function updateProduct(fd: FormData) {
  await requireAdmin();
  const { products } = await cols();
  await products.updateOne(
    { _id: String(fd.get("id")) },
    {
      $set: {
        price: Math.max(0, Math.floor(Number(fd.get("price")) || 0)),
        stock: Math.max(0, Math.floor(Number(fd.get("stock")) || 0)),
        active: !!fd.get("active"),
      },
    },
  );
  revalidatePath("/", "layout");
}
