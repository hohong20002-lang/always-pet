import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, getUser } from "@/lib/supabase/server";
import { confirmPayment } from "@/lib/toss";
import { addDays, todayKST } from "@/lib/shop";

// 토스 결제창에서 결제 인증이 끝나면 이 주소로 돌아와요. 여기서 금액을 검증하고 결제를 승인합니다.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const paymentKey = searchParams.get("paymentKey") ?? "";
  const orderNo = searchParams.get("orderId") ?? "";
  const amount = Number(searchParams.get("amount"));
  const fail = (m: string) => NextResponse.redirect(`${origin}/checkout/fail?message=${encodeURIComponent(m)}&orderId=${encodeURIComponent(orderNo)}`);

  const user = await getUser();
  if (!user) return NextResponse.redirect(`${origin}/login?next=/my`);

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return fail("서버 설정(SUPABASE_SECRET_KEY)이 빠져 있어 결제를 확정하지 못했어요.");
  }

  const { data: order } = await admin.from("orders").select("*").eq("order_no", orderNo).maybeSingle();
  if (!order || order.user_id !== user.id) return fail("주문을 찾을 수 없어요.");
  if (order.status !== "pending") return NextResponse.redirect(`${origin}/my/orders/${orderNo}`); // 이미 처리됨(새로고침 등)
  if (order.total !== amount) return fail("결제 금액이 주문 금액과 달라요. 다시 주문해 주세요.");

  const r = await confirmPayment(paymentKey, orderNo, amount);
  if (!r.ok) return fail(r.message);

  const pay = r.data as { method?: string; approvedAt?: string; receipt?: { url?: string } };
  const { data: updated } = await admin
    .from("orders")
    .update({
      status: "paid",
      payment_key: paymentKey,
      payment_method: pay.method ?? null,
      receipt_url: pay.receipt?.url ?? null,
      paid_at: pay.approvedAt ?? new Date().toISOString(),
    })
    .eq("id", order.id)
    .eq("status", "pending")
    .select("id");
  // 동시에 두 번 들어온 요청이면 먼저 처리한 쪽만 진행
  if (!updated?.length) return NextResponse.redirect(`${origin}/my/orders/${orderNo}`);

  // 재고 차감, 정기배송 등록
  const { data: items } = await admin.from("order_items").select("*").eq("order_id", order.id);
  const today = todayKST();
  for (const it of items ?? []) {
    const { data: p } = await admin.from("products").select("stock").eq("id", it.product_id).single();
    if (p) await admin.from("products").update({ stock: Math.max(0, p.stock - it.qty) }).eq("id", it.product_id);
    if (it.mode === "sub") {
      const weeks = it.cycle_weeks || 4;
      await admin.from("subscriptions").insert({
        user_id: user.id,
        pet_id: it.pet_id,
        product_id: it.product_id,
        order_id: order.id,
        name: it.name,
        image: it.image,
        plan: it.plan,
        price: it.unit_price,
        qty: it.qty,
        cycle_weeks: weeks,
        next_date: addDays(today, weeks * 7),
      });
    }
  }

  // 주문한 상품을 장바구니에서 비우기
  await admin.from("cart_items").delete().eq("user_id", user.id);

  return NextResponse.redirect(`${origin}/my/orders/${orderNo}?paid=1`);
}
