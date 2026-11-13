"use client";

import { useState, useTransition } from "react";
import { cancelOrder } from "@/app/actions/order";

export default function CancelOrder({ orderNo, paid }: { orderNo: string; paid: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  return (
    <>
      <button
        className="btn small quiet"
        disabled={pending}
        onClick={() => {
          if (!confirm(paid ? "주문을 취소하고 결제 금액을 환불할까요?" : "주문을 취소할까요?")) return;
          start(async () => setMsg(await cancelOrder(orderNo)));
        }}
      >
        {pending ? "처리 중…" : paid ? "주문 취소·환불" : "주문 취소"}
      </button>
      {msg?.error && <p className="err">{msg.error}</p>}
      {msg?.ok && <p className="ok-msg">{msg.ok}</p>}
    </>
  );
}
