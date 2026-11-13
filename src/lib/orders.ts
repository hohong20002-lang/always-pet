import "server-only";
import { newId } from "@/lib/db";
import { cols, type OrderDoc } from "@/lib/models";
import { addDays, todayKST } from "@/lib/shop";
import { cancelPayment } from "@/lib/toss";

/** 결제 승인 후: 주문을 결제 완료로 바꾸고 재고 차감·정기배송 등록·장바구니 비우기. 이미 처리됐으면 false */
export async function markPaid(order: OrderDoc, pay: { paymentKey: string; method?: string; receiptUrl?: string; approvedAt?: string }) {
  const { orders, products, subs, cart } = await cols();
  const r = await orders.updateOne(
    { _id: order._id, status: "pending" },
    {
      $set: {
        status: "paid",
        payment_key: pay.paymentKey,
        payment_method: pay.method ?? null,
        receipt_url: pay.receiptUrl ?? null,
        paid_at: pay.approvedAt ? new Date(pay.approvedAt) : new Date(),
      },
    },
  );
  if (!r.modifiedCount) return false; // 동시에 두 번 들어온 요청이면 먼저 처리한 쪽만 진행

  const today = todayKST();
  for (const it of order.items) {
    await products.updateOne({ _id: it.product_id }, [{ $set: { stock: { $max: [0, { $subtract: ["$stock", it.qty] }] } } }]);
    if (it.mode === "sub") {
      const weeks = it.cycle_weeks || 4;
      await subs.insertOne({
        _id: newId(),
        user_id: order.user_id,
        pet_id: it.pet_id,
        product_id: it.product_id,
        order_id: order._id,
        name: it.name,
        image: it.image,
        plan: it.plan,
        price: it.unit_price,
        qty: it.qty,
        cycle_weeks: weeks,
        next_date: addDays(today, weeks * 7),
        remain: 100,
        status: "active",
        paused_until: null,
        created_at: new Date(),
      });
    }
  }
  await cart.deleteMany({ user_id: order.user_id });
  return true;
}

/** 주문 취소: 결제된 주문이면 토스 환불 후 재고 복구·연결된 정기배송 해지 */
export async function cancelOrderDoc(order: OrderDoc, reason: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const { orders, products, subs } = await cols();
  if (order.status === "cancelled") return { ok: true };
  if (order.payment_key && order.status !== "pending") {
    const r = await cancelPayment(order.payment_key, reason);
    if (!r.ok && r.code !== "ALREADY_CANCELED_PAYMENT") return { ok: false, message: r.message };
  }
  const u = await orders.updateOne({ _id: order._id, status: order.status }, { $set: { status: "cancelled" } });
  if (u.modifiedCount && order.status !== "pending") {
    for (const it of order.items) await products.updateOne({ _id: it.product_id }, { $inc: { stock: it.qty } });
    await subs.updateMany({ order_id: order._id }, { $set: { status: "cancelled" } });
  }
  return { ok: true };
}
