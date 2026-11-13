"use client";

import { useEffect, useRef, useState } from "react";
import { loadTossPayments, type TossPaymentsWidgets } from "@tosspayments/tosspayments-sdk";
import { createOrder } from "@/app/actions/order";
import { won } from "@/lib/shop";

type Profile = { name: string; phone: string; zipcode: string; address: string; address_detail: string };

export default function CheckoutForm({ amount, customerKey, profile }: { amount: number; customerKey: string; profile: Profile }) {
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);
  const started = useRef(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const toss = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "");
        const widgets = toss.widgets({ customerKey });
        await widgets.setAmount({ currency: "KRW", value: amount });
        await Promise.all([
          widgets.renderPaymentMethods({ selector: "#payment-method", variantKey: "DEFAULT" }),
          widgets.renderAgreement({ selector: "#agreement", variantKey: "AGREEMENT" }),
        ]);
        widgetsRef.current = widgets;
        setReady(true);
      } catch (e) {
        setError("결제창을 불러오지 못했어요. 새로고침해 주세요. " + (e instanceof Error ? e.message : ""));
      }
    })();
  }, [amount, customerKey]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const widgets = widgetsRef.current;
    if (!widgets) return;
    setBusy(true);
    setError("");
    const r = await createOrder(new FormData(e.currentTarget));
    if (!r.ok) {
      setError(r.error);
      setBusy(false);
      return;
    }
    try {
      if (r.amount !== amount) await widgets.setAmount({ currency: "KRW", value: r.amount });
      await widgets.requestPayment({
        orderId: r.orderNo,
        orderName: r.orderName,
        customerName: r.customerName,
        customerEmail: r.customerEmail || undefined,
        successUrl: `${window.location.origin}/checkout/success`,
        failUrl: `${window.location.origin}/checkout/fail`,
      });
    } catch (err) {
      const code = (err as { code?: string }).code;
      setError(code === "USER_CANCEL" ? "결제를 취소했어요. 다시 시도할 수 있어요." : "결제를 시작하지 못했어요. " + ((err as Error).message ?? ""));
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      <div className="panel form">
        <h2 className="h2" style={{ fontSize: 19 }}>배송 정보</h2>
        <div className="two">
          <label>
            받는 분
            <input type="text" name="recipient" defaultValue={profile.name} autoComplete="name" required />
          </label>
          <label>
            연락처
            <input type="tel" name="phone" defaultValue={profile.phone} placeholder="010-0000-0000" autoComplete="tel" required />
          </label>
        </div>
        <div className="two">
          <label>
            우편번호 <small>(선택)</small>
            <input type="text" name="zipcode" defaultValue={profile.zipcode} autoComplete="postal-code" inputMode="numeric" />
          </label>
          <span />
        </div>
        <label>
          주소
          <input type="text" name="address" defaultValue={profile.address} autoComplete="address-line1" required />
        </label>
        <label>
          상세 주소
          <input type="text" name="address_detail" defaultValue={profile.address_detail} autoComplete="address-line2" />
        </label>
        <label>
          배송 메모 <small>(선택)</small>
          <input type="text" name="memo" placeholder="예: 문 앞에 놓아 주세요" />
        </label>
        <label style={{ flexDirection: "row", alignItems: "center", fontWeight: 400, gap: 8 }}>
          <input type="checkbox" name="save_address" defaultChecked /> 다음에도 이 배송지 사용
        </label>
      </div>

      <div className="panel stack">
        <h2 className="h2" style={{ fontSize: 19 }}>결제 수단</h2>
        <div className="pay-box">
          <div id="payment-method" />
          <div id="agreement" />
        </div>
        {!ready && !error && <p className="disclaim">결제창을 불러오는 중…</p>}
      </div>

      {error && <p className="err">{error}</p>}
      <button className="btn" disabled={!ready || busy}>{busy ? "결제 진행 중…" : `${won(amount)} 결제하기`}</button>
    </form>
  );
}
