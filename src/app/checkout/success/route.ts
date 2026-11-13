import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { cols } from "@/lib/models";
import { markPaid } from "@/lib/orders";
import { confirmPayment } from "@/lib/toss";

// 토스 결제창에서 결제 인증이 끝나면 이 주소로 돌아와요. 여기서 금액을 검증하고 결제를 승인합니다.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const paymentKey = searchParams.get("paymentKey") ?? "";
  const orderNo = searchParams.get("orderId") ?? "";
  const amount = Number(searchParams.get("amount"));
  const fail = (m: string) => NextResponse.redirect(`${origin}/checkout/fail?message=${encodeURIComponent(m)}`);

  const user = await getUser();
  if (!user) return NextResponse.redirect(`${origin}/login?next=/my`);

  const { orders } = await cols();
  const order = await orders.findOne({ order_no: orderNo, user_id: user.id });
  if (!order) return fail("주문을 찾을 수 없어요.");
  if (order.status !== "pending") return NextResponse.redirect(`${origin}/my/orders/${orderNo}`); // 이미 처리됨(새로고침 등)
  if (order.total !== amount) return fail("결제 금액이 주문 금액과 달라요. 다시 주문해 주세요.");

  const r = await confirmPayment(paymentKey, orderNo, amount);
  if (!r.ok) return fail(r.message);

  const pay = r.data as { method?: string; approvedAt?: string; receipt?: { url?: string } };
  await markPaid(order, { paymentKey, method: pay.method, approvedAt: pay.approvedAt, receiptUrl: pay.receipt?.url });
  return NextResponse.redirect(`${origin}/my/orders/${orderNo}?paid=1`);
}
