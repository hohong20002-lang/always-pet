"use client";

import { useTransition } from "react";
import { removeCartItem, updateCartQty } from "@/app/actions/cart";

export function CartQty({ id, qty }: { id: string; qty: number }) {
  const [pending, start] = useTransition();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, opacity: pending ? 0.5 : 1 }}>
      <div className="qty">
        <button disabled={pending || qty <= 1} onClick={() => start(() => updateCartQty(id, qty - 1))} aria-label="수량 줄이기">−</button>
        <span className="num">{qty}</span>
        <button disabled={pending} onClick={() => start(() => updateCartQty(id, qty + 1))} aria-label="수량 늘리기">+</button>
      </div>
      <button className="linkbtn" disabled={pending} onClick={() => start(() => removeCartItem(id))}>삭제</button>
    </div>
  );
}
