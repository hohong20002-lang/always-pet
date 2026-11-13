"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient, getUser } from "@/lib/supabase/server";
import { loadCart } from "@/lib/cart";
import { todayKST } from "@/lib/shop";
import { cancelPayment } from "@/lib/toss";

export type CreateOrderResult =
  | { ok: true; orderNo: string; amount: number; orderName: string; customerName: string; customerEmail: string }
  | { ok: false; error: string };

const str = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);

/** 결제 전 주문서(결제 대기)를 만들어요. 금액은 반드시 서버에서 DB 가격으로 다시 계산해요. */
export async function createOrder(fd: FormData): Promise<CreateOrderResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };
  const recipient = str(fd, "recipient", 40);
  const phone = str(fd, "phone", 20).replace(/[^0-9-]/g, "");
  const zipcode = str(fd, "zipcode", 10);
  const address = str(fd, "address");
  const addressDetail = str(fd, "address_detail");
  const memo = str(fd, "memo");
  if (!recipient || phone.replace(/-/g, "").length < 9 || !address) return { ok: false, error: "받는 분, 연락처, 주소를 확인해 주세요." };

  const supabase = await createClient();
  const cart = await loadCart(supabase);
  if (!cart.lines.length) return { ok: false, error: "장바구니가 비어 있어요." };
  const short = cart.lines.find((l) => l.stock < l.qty);
  if (short) return { ok: false, error: `${short.name}의 재고가 부족해요.` };

  const orderNo = `AP${todayKST().replace(/-/g, "")}-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  const first = cart.lines[0].name;
  const orderName = cart.lines.length > 1 ? `${first} 외 ${cart.lines.length - 1}건` : first;

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      order_no: orderNo,
      user_id: user.id,
      order_name: orderName.slice(0, 100),
      items_total: cart.itemsTotal,
      shipping_fee: cart.ship,
      total: cart.total,
      recipient,
      phone,
      zipcode,
      address,
      address_detail: addressDetail,
      delivery_memo: memo,
    })
    .select("id")
    .single();
  if (error || !order) return { ok: false, error: "주문서를 만들지 못했어요. 잠시 후 다시 시도해 주세요." };

  const { error: itemErr } = await supabase.from("order_items").insert(
    cart.lines.map((l) => ({
      order_id: order.id,
      product_id: l.product_id,
      name: l.name,
      image: l.image,
      unit_price: l.unit,
      qty: l.qty,
      mode: l.mode,
      cycle_weeks: l.cycle_weeks,
      plan: l.plan,
      pet_id: l.pet_id,
    })),
  );
  if (itemErr) return { ok: false, error: "주문 상품을 저장하지 못했어요." };

  if (fd.get("save_address")) {
    await supabase.from("profiles").update({ name: recipient, phone, zipcode, address, address_detail: addressDetail }).eq("id", user.id);
  }

  return { ok: true, orderNo, amount: cart.total, orderName, customerName: recipient, customerEmail: user.email ?? "" };
}

/** 배송 준비 전(결제 완료 상태)인 주문은 회원이 직접 취소·환불할 수 있어요. */
export async function cancelOrder(orderNo: string): Promise<{ ok?: string; error?: string }> {
  const user = await getUser();
  if (!user) return { error: "로그인이 필요해요." };
  const admin = createAdminClient();
  const { data: o } = await admin.from("orders").select("id, user_id, status, payment_key").eq("order_no", orderNo).maybeSingle();
  if (!o || o.user_id !== user.id) return { error: "주문을 찾을 수 없어요." };
  if (o.status === "pending") {
    await admin.from("orders").update({ status: "cancelled" }).eq("id", o.id);
  } else if (o.status === "paid" && o.payment_key) {
    const r = await cancelPayment(o.payment_key, "고객 요청 취소");
    if (!r.ok) return { error: "환불하지 못했어요: " + r.message };
    await admin.from("orders").update({ status: "cancelled" }).eq("id", o.id);
    await admin.from("subscriptions").update({ status: "cancelled" }).eq("order_id", o.id);
    await restock(admin, o.id);
  } else {
    return { error: "이미 배송 준비가 시작돼서 취소할 수 없어요. 고객센터로 문의해 주세요." };
  }
  revalidatePath("/my", "layout");
  return { ok: "주문을 취소했어요. 카드 결제는 영업일 기준 3~5일 안에 환불돼요." };
}

async function restock(admin: ReturnType<typeof createAdminClient>, orderId: string) {
  const { data: items } = await admin.from("order_items").select("product_id, qty").eq("order_id", orderId);
  for (const it of items ?? []) {
    const { data: p } = await admin.from("products").select("stock").eq("id", it.product_id).single();
    if (p) await admin.from("products").update({ stock: p.stock + it.qty }).eq("id", it.product_id);
  }
}
