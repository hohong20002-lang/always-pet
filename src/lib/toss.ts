import "server-only";

const auth = () => "Basic " + Buffer.from((process.env.TOSS_SECRET_KEY ?? "") + ":").toString("base64");

type TossResult = { ok: true; data: Record<string, unknown> } | { ok: false; code: string; message: string };

async function call(path: string, body: unknown, idempotencyKey?: string): Promise<TossResult> {
  try {
    const res = await fetch(`https://api.tosspayments.com${path}`, {
      method: "POST",
      headers: {
        Authorization: auth(),
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, code: data.code ?? "ERROR", message: data.message ?? "결제사 오류" };
    return { ok: true, data };
  } catch {
    return { ok: false, code: "NETWORK", message: "결제사에 연결하지 못했어요." };
  }
}

/** 결제 승인 */
export const confirmPayment = (paymentKey: string, orderId: string, amount: number) =>
  call("/v1/payments/confirm", { paymentKey, orderId, amount }, `confirm-${orderId}`);

/** 결제 취소(전액 환불) */
export const cancelPayment = (paymentKey: string, reason: string) =>
  call(`/v1/payments/${encodeURIComponent(paymentKey)}/cancel`, { cancelReason: reason }, `cancel-${paymentKey}`);
