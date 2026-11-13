"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { addCareBox, type PetInput } from "@/app/actions/pet";
import { AGE_GROUPS, boxCompo, CONCERNS, INGREDIENTS, PLANS, WEIGHT_GROUPS, won, type Pet, type PlanKey } from "@/lib/shop";

const KEY = "ap-box-draft";
const blank: PetInput = { id: null, name: "", species: "dog", breed: "", age_group: "10세 이상", weight_group: "5kg 미만", concerns: [], current_ingredients: [], meds: "" };

export default function BoxBuilder({ pets, loggedIn }: { pets: Pet[]; loggedIn: boolean }) {
  const [pet, setPet] = useState<PetInput>(pets[0] ? { ...pets[0] } : blank);
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState<PlanKey>("basic");
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();

  // 로그인하러 다녀와도 작성 중인 내용이 남도록
  useEffect(() => {
    try {
      const d = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
      if (d?.pet) {
        // 서버 렌더링 때는 sessionStorage가 없어 마운트 후에 복원해야 해요
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPet((cur) => ({ ...d.pet, id: cur.id ?? d.pet.id ?? null }));
        setStep(d.step ?? 0);
        setPlan(d.plan ?? "basic");
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ pet, step, plan }));
    } catch {}
  }, [pet, step, plan]);

  const set = <K extends keyof PetInput>(k: K, v: PetInput[K]) => setPet((p) => ({ ...p, [k]: v }));
  const toggle = (k: "concerns" | "current_ingredients", v: string, max = 99) => {
    const arr = pet[k];
    if (arr.includes(v)) set(k, arr.filter((x) => x !== v));
    else if (arr.length >= max) setMsg({ error: `최대 ${max}개까지 고를 수 있어요` });
    else set(k, [...arr, v]);
  };
  const next = () => {
    setMsg(null);
    if (step === 0 && !pet.name.trim()) return setMsg({ error: "아이 이름을 알려 주세요" });
    if (step === 1 && !pet.concerns.length) return setMsg({ error: "변화를 하나 이상 골라 주세요" });
    setStep(Math.min(3, step + 1));
  };
  const submit = () =>
    start(async () => {
      setMsg(null);
      const r = await addCareBox(pet, plan);
      setMsg(r);
      if (r?.ok) {
        try {
          sessionStorage.removeItem(KEY);
        } catch {}
      }
    });

  const compo = boxCompo(pet, plan);

  return (
    <div className="detail">
      <div className="stack">
        <div className="gal"><img src="/img/box.jpg" alt="시니어 맞춤 케어 박스" /></div>
      </div>
      <div className="info">
        <div>
          <span className="eyebrow">시니어 맞춤 케어 박스</span>
          <h1>{step < 3 ? `질문 ${step + 1} / 4` : "구성 확인"}</h1>
        </div>
        <div className="steps">{[0, 1, 2, 3].map((i) => <i key={i} className={i <= step ? "on" : ""} />)}</div>

        {step === 0 && (
          <div className="q">
            {pets.length > 1 && (
              <>
                <label className="t">어느 아이 박스인가요?</label>
                <div className="opts">
                  {pets.map((p) => (
                    <button key={p.id} onClick={() => setPet({ ...p })} aria-pressed={pet.id === p.id}>{p.name}</button>
                  ))}
                  <button onClick={() => setPet(blank)} aria-pressed={!pet.id}>+ 새 아이</button>
                </div>
              </>
            )}
            <label className="t" htmlFor="petname">이름</label>
            <input id="petname" type="text" value={pet.name} onChange={(e) => set("name", e.target.value)} placeholder="예: 보리" maxLength={20} />
            <label className="t">어떤 아이인가요?</label>
            <div className="opts">
              {[["dog", "강아지"], ["cat", "고양이"]].map(([v, l]) => (
                <button key={v} onClick={() => set("species", v as "dog" | "cat")} aria-pressed={pet.species === v}>{l}</button>
              ))}
            </div>
            <label className="t">나이</label>
            <div className="opts">
              {AGE_GROUPS.map((o) => <button key={o} onClick={() => set("age_group", o)} aria-pressed={pet.age_group === o}>{o}</button>)}
            </div>
            <label className="t">몸무게</label>
            <div className="opts">
              {WEIGHT_GROUPS.map((o) => <button key={o} onClick={() => set("weight_group", o)} aria-pressed={pet.weight_group === o}>{o}</button>)}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="q">
            <label className="t">요즘 보이는 변화를 골라 주세요 <small style={{ color: "var(--muted)", fontWeight: 400 }}>(최대 2개)</small></label>
            <div className="opts">
              {CONCERNS.map((c) => (
                <button key={c.id} onClick={() => toggle("concerns", c.id, 2)} aria-pressed={pet.concerns.includes(c.id)}>{c.label}</button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="q">
            <label className="t">지금 먹고 있는 간식·영양제의 주원료가 있나요?</label>
            <div className="opts">
              {INGREDIENTS.map((o) => (
                <button key={o} onClick={() => toggle("current_ingredients", o)} aria-pressed={pet.current_ingredients.includes(o)}>{o}</button>
              ))}
            </div>
            <label className="t" htmlFor="meds">복용 중인 약 <small style={{ color: "var(--muted)", fontWeight: 400 }}>(선택)</small></label>
            <textarea id="meds" value={pet.meds} onChange={(e) => set("meds", e.target.value)} placeholder="예: 심장약 1일 2회" />
          </div>
        )}

        {step === 3 && (
          <div className="q">
            <label className="t">{pet.name || "우리 아이"}에게 이렇게 구성했어요</label>
            <ul className="compo">
              {compo.map((c) => (
                <li key={c.n}><span className="dot" /><b>{c.n}</b><small>왜? {c.r}</small></li>
              ))}
            </ul>
            <p className="disclaim">
              {pet.meds.trim()
                ? `복용 중인 약(${pet.meds.trim()})이 있어요. 영양 보조 제품은 수의사와 상의한 뒤 급여해 주세요.`
                : "복용 중인 약을 입력하지 않았어요. 약을 먹고 있다면 영양 보조 제품은 수의사와 상의한 뒤 급여해 주세요."}
            </p>
            <label className="t">플랜</label>
            <div className="plans">
              {(Object.keys(PLANS) as PlanKey[]).map((k) => (
                <button key={k} className="plan" onClick={() => setPlan(k)} aria-pressed={plan === k}>
                  <b>{PLANS[k].label}</b>
                  <span className="price num">월 {won(PLANS[k].price)}</span>
                  <br />
                  <small>{PLANS[k].desc}</small>
                </button>
              ))}
            </div>
            <ul className="terms">
              <li>첫 회차는 주문할 때 결제하고, 4주마다 배송돼요</li>
              <li>남은 양에 맞춰 배송일을 앞당기거나 미룰 수 있어요</li>
              <li>건너뛰기·해지 위약금 없음, 마이페이지에서 바로 처리</li>
            </ul>
          </div>
        )}

        {msg?.error && <p className="err">{msg.error}</p>}
        {msg?.ok && (
          <p className="ok-msg">
            {msg.ok} · <Link href="/cart">장바구니에서 주문하기</Link>
          </p>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {step > 0 && <button className="btn quiet" onClick={() => { setMsg(null); setStep(step - 1); }}>이전</button>}
          {step < 3 ? (
            <button className="btn" onClick={next}>다음</button>
          ) : loggedIn ? (
            <button className="btn" onClick={submit} disabled={pending}>{pending ? "담는 중…" : "정기배송 장바구니 담기"}</button>
          ) : (
            <Link className="btn" href="/login?next=/box">로그인하고 담기</Link>
          )}
        </div>
      </div>
    </div>
  );
}
