"use client";

import { useState, useTransition } from "react";
import { deletePet, savePet, type PetInput } from "@/app/actions/pet";
import { AGE_GROUPS, CONCERNS, INGREDIENTS, WEIGHT_GROUPS, type Pet } from "@/lib/shop";

const blank: PetInput = { id: null, name: "", species: "dog", breed: "", age_group: "10세 이상", weight_group: "5kg 미만", concerns: [], current_ingredients: [], meds: "" };

export default function PetForm({ pet }: { pet?: Pet }) {
  const [p, setP] = useState<PetInput>(pet ? { ...pet } : blank);
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof PetInput>(k: K, v: PetInput[K]) => setP((x) => ({ ...x, [k]: v }));
  const toggle = (k: "concerns" | "current_ingredients", v: string, max = 99) => {
    const arr = p[k];
    if (arr.includes(v)) set(k, arr.filter((x) => x !== v));
    else if (arr.length < max) set(k, [...arr, v]);
  };

  return (
    <div className="form">
      <div className="two">
        <label>이름<input type="text" value={p.name} onChange={(e) => set("name", e.target.value)} maxLength={20} placeholder="예: 보리" /></label>
        <label><span className="lbl">품종<small>(선택사항)</small></span><input type="text" value={p.breed} onChange={(e) => set("breed", e.target.value)} maxLength={30} placeholder="예: 말티즈" /></label>
      </div>
      <div className="field"><span>종류</span>
        <div className="opts">
          {[["dog", "강아지"], ["cat", "고양이"]].map(([v, l]) => (
            <button type="button" key={v} onClick={() => set("species", v as "dog" | "cat")} aria-pressed={p.species === v}>{l}</button>
          ))}
        </div>
      </div>
      <div className="field"><span>나이</span>
        <div className="opts">{AGE_GROUPS.map((o) => <button type="button" key={o} onClick={() => set("age_group", o)} aria-pressed={p.age_group === o}>{o}</button>)}</div>
      </div>
      <div className="field"><span>몸무게</span>
        <div className="opts">{WEIGHT_GROUPS.map((o) => <button type="button" key={o} onClick={() => set("weight_group", o)} aria-pressed={p.weight_group === o}>{o}</button>)}</div>
      </div>
      <div className="field"><span>요즘 보이는 변화 <small style={{ fontWeight: 400, color: "var(--muted)" }}>(최대 2개)</small></span>
        <div className="opts">{CONCERNS.map((c) => <button type="button" key={c.id} onClick={() => toggle("concerns", c.id, 2)} aria-pressed={p.concerns.includes(c.id)}>{c.label}</button>)}</div>
      </div>
      <div className="field"><span>지금 먹는 간식·영양제 주원료</span>
        <div className="opts">{INGREDIENTS.map((o) => <button type="button" key={o} onClick={() => toggle("current_ingredients", o)} aria-pressed={p.current_ingredients.includes(o)}>{o}</button>)}</div>
      </div>
      <label><span className="lbl">복용 중인 약<small>(선택사항)</small></span><textarea value={p.meds} onChange={(e) => set("meds", e.target.value)} maxLength={200} placeholder="예: 심장약 1일 2회" /></label>
      {msg?.error && <p className="err">{msg.error}</p>}
      {msg?.ok && <p className="ok-msg">{msg.ok}</p>}
      <div className="row">
        <button
          className="btn"
          disabled={pending || !p.name.trim()}
          onClick={() =>
            start(async () => {
              const r = await savePet(p);
              setMsg(r.error ? { error: r.error } : { ok: "저장했어요" });
              if (!pet && r.id) setP(blank);
            })
          }
        >
          {pending ? "저장 중…" : pet ? "저장" : "등록하기"}
        </button>
        {pet && (
          <button
            className="btn quiet"
            disabled={pending}
            onClick={() => {
              if (confirm(`${pet.name}의 정보와 건강 기록을 모두 지울까요? 되돌릴 수 없어요.`)) start(() => deletePet(pet.id));
            }}
          >
            삭제
          </button>
        )}
      </div>
    </div>
  );
}
