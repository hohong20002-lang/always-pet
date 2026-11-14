"use client";

import { useState, useTransition } from "react";
import { saveLog } from "@/app/actions/record";
import { MEAL_LABEL } from "@/lib/shop";
import type { Log } from "@/lib/summary";

export default function RecordForm({ petId, initial, today }: { petId: string; initial: Log | null; today: string }) {
  const [date, setDate] = useState(today);
  const [meal, setMeal] = useState<number | null>(initial?.meal ?? null);
  const [walk, setWalk] = useState(initial?.walk ?? "");
  const [poop, setPoop] = useState(initial?.poop ?? "");
  const [water, setWater] = useState(initial?.water ?? "");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();

  const opts = (arr: string[], cur: string, set: (v: string) => void) => (
    <div className="opts">
      {arr.map((o) => (
        <button type="button" key={o} onClick={() => set(cur === o ? "" : o)} aria-pressed={cur === o}>{o}</button>
      ))}
    </div>
  );

  const save = () =>
    start(async () => {
      setMsg(null);
      const r = await saveLog({ petId, date, meal: meal ?? -1, walk, poop, water: water || null, memo });
      setMsg(r ?? null);
    });

  return (
    <div className="panel stack">
      <h2 className="h2" style={{ fontSize: 19 }}>
        {date === today ? "오늘 기록" : "지난 날 기록"} <small style={{ color: "var(--muted)", fontFamily: "var(--f-body)", fontSize: 13 }}>탭 3번이면 끝나요</small>
      </h2>
      <div className="field">
        <span>날짜</span>
        <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value || today)} />
      </div>
      <div className="field">
        <span>식사량</span>
        <div className="opts">
          {[0, 1, 2].map((v) => (
            <button type="button" key={v} onClick={() => setMeal(meal === v ? null : v)} aria-pressed={meal === v}>{MEAL_LABEL[v]}</button>
          ))}
        </div>
      </div>
      <div className="field"><span>산책·활동</span>{opts(["평소", "줄었음", "많이 줄었음"], walk, setWalk)}</div>
      <div className="field"><span>배변</span>{opts(["정상", "무름", "변비", "횟수 적음"], poop, setPoop)}</div>
      <div className="field"><span>물 마시는 양<small style={{ color: "var(--muted)", fontWeight: 400 }}>(선택사항)</small></span>{opts(["평소", "많음", "적음"], water, setWater)}</div>
      <div className="field">
        <label htmlFor="memo"><span style={{ fontWeight: 700, fontSize: 14 }}>메모(선택사항)</span></label>
        <textarea id="memo" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 소파에 못 올라가고 앞에서 기다림" maxLength={300} />
      </div>
      {msg?.error && <p className="err">{msg.error}</p>}
      {msg?.ok && <p className="ok-msg">{msg.ok}</p>}
      <button className="btn" onClick={save} disabled={pending || meal === null || !walk || !poop}>{pending ? "저장 중…" : "기록 저장"}</button>
      <p className="disclaim">같은 날짜에 다시 저장하면 그날 기록이 새 내용으로 바뀌어요.</p>
    </div>
  );
}
