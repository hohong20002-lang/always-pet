"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { addToCart } from "@/app/actions/cart";
import { unitPrice, won, type Mode } from "@/lib/shop";

type P = { id: string; price: number; trial_price: number | null; subscribable: boolean; stock: number };

export default function ProductBuy({ product: p, petId }: { product: P; petId: string | null }) {
  const [mode, setMode] = useState<Mode>(p.trial_price ? "trial" : "once");
  const [cycle, setCycle] = useState(4);
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();
  const price = unitPrice(p, mode);

  const add = () =>
    start(async () => {
      setMsg(null);
      const r = await addToCart({ productId: p.id, mode, cycle, qty, petId, next: `/products/${p.id}` });
      setMsg(r);
    });

  if (p.stock <= 0) return <div className="disclaim">지금은 품절이에요. 곧 다시 준비할게요.</div>;

  return (
    <>
      <div className="seg" role="group" aria-label="구매 방식">
        {p.trial_price ? <button onClick={() => setMode("trial")} aria-pressed={mode === "trial"}>소량 체험</button> : null}
        <button onClick={() => setMode("once")} aria-pressed={mode === "once"}>한 번 구매</button>
        {p.subscribable && <button onClick={() => setMode("sub")} aria-pressed={mode === "sub"}>정기배송 10%↓</button>}
      </div>
      {mode === "trial" && (
        <p className="disclaim">처음이라면 3회 분량 체험팩으로 기호부터 확인해 보세요.</p>
      )}
      {mode === "sub" && (
        <div className="field">
          <span>배송 주기</span>
          <div className="opts">
            {[2, 4, 6].map((w) => (
              <button key={w} onClick={() => setCycle(w)} aria-pressed={cycle === w}>{w}주마다</button>
            ))}
          </div>
          <p className="disclaim">언제든 건너뛰기·주기 변경·해지할 수 있어요. 위약금은 없어요.</p>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div className="qty">
          <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="수량 줄이기">−</button>
          <span className="num">{qty}</span>
          <button onClick={() => setQty(Math.min(9, qty + 1))} aria-label="수량 늘리기">+</button>
        </div>
        <span className="price num" style={{ fontSize: 22 }}>{won(price * qty)}</span>
      </div>
      <button className="btn" onClick={add} disabled={pending}>{pending ? "담는 중…" : "장바구니 담기"}</button>
      {msg?.error && <p className="err">{msg.error}</p>}
      {msg?.ok && (
        <p className="ok-msg">
          {msg.ok} · <Link href="/cart">장바구니 보기</Link>
        </p>
      )}
    </>
  );
}
