"use client";

import { useState, useTransition } from "react";
import { endSubscription, resumeSubscription, setCycle, setRemain, shiftNext } from "@/app/actions/subscription";
import { addDays, fmtDate, SUB_STATUS, won } from "@/lib/shop";

export type Sub = {
  id: string;
  name: string;
  image: string;
  price: number;
  qty: number;
  cycle_weeks: number;
  next_date: string;
  remain: number;
  status: "active" | "paused" | "cancelled" | "farewell";
  paused_until: string | null;
  pets: { name: string } | null;
};

const END_OPTS = [
  ["pause", "잠시 쉬기", "1개월 동안 배송과 결제를 멈춰요. 기록은 그대로 쓸 수 있어요."],
  ["cancel", "해지하기", "다음 배송부터 멈춰요. 위약금은 없어요."],
  ["farewell", "아이와 이별했어요", "이 아이의 정기배송을 모두 정리하고 마케팅 알림을 멈춰요. 다시 묻지 않을게요."],
] as const;

export default function SubCard({ sub: s }: { sub: Sub }) {
  const [pending, start] = useTransition();
  const [remain, setR] = useState(s.remain);
  const [endOpen, setEndOpen] = useState(false);
  const [choice, setChoice] = useState<"pause" | "cancel" | "farewell" | null>(null);
  const [msg, setMsg] = useState("");
  const run = (fn: () => Promise<unknown>, m?: string) =>
    start(async () => {
      const r = (await fn()) as { ok?: string; error?: string } | undefined;
      setMsg(r?.error ?? m ?? (typeof r?.ok === "string" && r.ok.length > 10 ? r.ok : ""));
    });

  const live = s.status === "active";
  const suggest = remain >= 50 ? 7 : remain <= 20 ? -5 : 0;
  const pet = s.pets?.name;

  return (
    <div className="panel stack" style={{ opacity: pending ? 0.6 : 1 }}>
      <div className="subhead">
        <img src={`/img/${s.image}`} alt="" />
        <div>
          <span className={`tag ${live ? "green" : ""}`}>{SUB_STATUS[s.status]}</span>
          <h3 className="h2" style={{ fontSize: 19, marginTop: 4 }}>{s.name}{s.qty > 1 ? ` × ${s.qty}` : ""}</h3>
          <span className="num" style={{ color: "var(--muted)" }}>
            {won(s.price * s.qty)} · {s.cycle_weeks}주마다{pet ? ` · ${pet}` : ""}
          </span>
        </div>
      </div>

      {s.status === "paused" && (
        <div className="stack">
          <p>{s.paused_until ? fmtDate(s.paused_until) : ""}까지 쉬는 중이에요. 그 전에 언제든 다시 시작할 수 있어요.</p>
          <div><button className="btn small" onClick={() => run(() => resumeSubscription(s.id), "다시 시작했어요")}>다시 시작하기</button></div>
        </div>
      )}
      {(s.status === "cancelled" || s.status === "farewell") && (
        <p style={{ color: "var(--muted)" }}>
          {s.status === "farewell" ? "그동안 함께해 주셔서 고맙습니다. 알림과 광고를 모두 멈췄어요. 건강 기록은 원하실 때 보거나 지울 수 있어요." : "해지된 정기배송이에요."}
        </p>
      )}

      {live && (
        <>
          <div>
            <span style={{ color: "var(--muted)", fontSize: 14 }}>다음 배송</span>
            <div className="big num">{fmtDate(s.next_date)}</div>
          </div>
          <div className="row">
            <button className="btn small quiet" onClick={() => run(() => shiftNext(s.id, -7))}>1주 당기기</button>
            <button className="btn small quiet" onClick={() => run(() => shiftNext(s.id, 7))}>1주 미루기</button>
            <button className="btn small quiet" onClick={() => run(() => shiftNext(s.id, s.cycle_weeks * 7))}>이번 회차 건너뛰기</button>
          </div>
          <div className="field">
            <span>배송 주기</span>
            <div className="opts">
              {[2, 4, 6].map((w) => (
                <button key={w} onClick={() => run(() => setCycle(s.id, w))} aria-pressed={s.cycle_weeks === w}>{w}주마다</button>
              ))}
            </div>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <label htmlFor={`r-${s.id}`} style={{ fontSize: 14, color: "var(--muted)" }}>
              지난 배송분이 <b className="num" style={{ color: "var(--fg)" }}>{remain}%</b> 남았어요
            </label>
            <input
              id={`r-${s.id}`}
              type="range"
              min={0}
              max={100}
              step={10}
              value={remain}
              onChange={(e) => setR(+e.target.value)}
              onPointerUp={() => run(() => setRemain(s.id, remain))}
              onKeyUp={() => run(() => setRemain(s.id, remain))}
            />
            {suggest ? (
              <>
                <div className={`check ${suggest > 0 ? "ok" : "warn"}`}>
                  {suggest > 0 ? "↻" : "!"}{" "}
                  <span>
                    지금 속도라면 <b>{suggest > 0 ? "1주 미뤄도" : "5일 앞당기는 게"}</b> {suggest > 0 ? "충분해요." : "좋겠어요."} 다음 배송을 {fmtDate(addDays(s.next_date, suggest))}로 바꿀까요?
                  </span>
                </div>
                <div><button className="btn small" onClick={() => run(() => shiftNext(s.id, suggest))}>{fmtDate(addDays(s.next_date, suggest))}로 변경</button></div>
              </>
            ) : (
              <div className="check ok">✓ <span>지금 배송일이 남은 양과 잘 맞아요.</span></div>
            )}
          </div>
        </>
      )}

      {(live || s.status === "paused") &&
        (endOpen ? (
          <div className="stack">
            <b>정기배송을 어떻게 할까요?</b>
            <div className="endopts">
              {END_OPTS.map(([k, t, d]) => (
                <button key={k} className="endopt" onClick={() => setChoice(k)} aria-pressed={choice === k} disabled={k === "pause" && s.status === "paused"}>
                  <b>{t}</b>
                  <small>{d}</small>
                </button>
              ))}
            </div>
            <div className="row">
              {choice && (
                <button
                  className="btn"
                  onClick={() => {
                    run(() => endSubscription(s.id, choice), { pause: "1개월 쉬기로 했어요", cancel: "해지했어요", farewell: "마음을 다해 정리했어요" }[choice]);
                    setEndOpen(false);
                  }}
                >
                  {{ pause: "1개월 쉬기", cancel: "해지 확정", farewell: "정리하기" }[choice]}
                </button>
              )}
              <button className="btn quiet" onClick={() => { setEndOpen(false); setChoice(null); }}>돌아가기</button>
            </div>
          </div>
        ) : (
          <div><button className="btn small quiet" onClick={() => setEndOpen(true)}>정기배송 멈추기·해지</button></div>
        ))}
      {msg && <p className="ok-msg">{msg}</p>}
    </div>
  );
}
