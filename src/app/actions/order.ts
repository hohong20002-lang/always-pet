"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { newId } from "@/lib/db";
import { cols } from "@/lib/models";
import { loadCart } from "@/lib/cart";
import { cancelOrderDoc } from "@/lib/orders";
import { todayKST } from "@/lib/shop";

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

  const cart = await loadCart(user.id);
  if (!cart.lines.length) return { ok: false, error: "장바구니가 비어 있어요." };
  const short = cart.lines.find((l) => l.stock < l.qty);
  if (short) return { ok: false, error: `${short.name}의 재고가 부족해요.` };

  const orderNo = `AP${todayKST().replace(/-/g, "")}-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  const first = cart.lines[0].name;
  const orderName = (cart.lines.length > 1 ? `${first} 외 ${cart.lines.length - 1}건` : first).slice(0, 100);

  const { orders, users } = await cols();
  await orders.insertOne({
    _id: newId(),
    order_no: orderNo,
    user_id: user.id,
    status: "pending",
    order_name: orderName,
    items: cart.lines.map((l) => ({
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
    items_total: cart.itemsTotal,
    shipping_fee: cart.ship,
    total: cart.total,
    recipient,
    phone,
    zipcode,
    address,
    address_detail: addressDetail,
    delivery_memo: memo,
    payment_key: null,
    payment_method: null,
    receipt_url: null,
    tracking_no: "",
    paid_at: null,
    created_at: new Date(),
  });

  if (fd.get("save_address")) {
    await users.updateOne({ _id: user.id }, { $set: { phone, zipcode, address, address_detail: addressDetail, ...(user.name ? {} : { name: recipient }) } });
  }
  return { ok: true, orderNo, amount: cart.total, orderName, customerName: recipient, customerEmail: user.email };
}

/** 배송 준비 전(결제 완료 상태)인 주문은 회원이 직접 취소·환불할 수 있어요. */
export async function cancelOrder(orderNo: string): Promise<{ ok?: string; error?: string }> {
  const user = await getUser();
  if (!user) return { error: "로그인이 필요해요." };
  const { orders } = await cols();
  const o = await orders.findOne({ order_no: String(orderNo), user_id: user.id });
  if (!o) return { error: "주문을 찾을 수 없어요." };
  if (o.status !== "pending" && o.status !== "paid") return { error: "이미 배송 준비가 시작돼서 취소할 수 없어요. 고객센터로 문의해 주세요." };
  const r = await cancelOrderDoc(o, "고객 요청 취소");
  if (!r.ok) return { error: "환불하지 못했어요: " + r.message };
  revalidatePath("/my", "layout");
  return { ok: o.status === "paid" ? "주문을 취소했어요. 카드 결제는 영업일 기준 3~5일 안에 환불돼요." : "주문을 취소했어요." };
}
