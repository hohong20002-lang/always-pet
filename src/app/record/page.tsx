import Link from "next/link";
import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import { cols } from "@/lib/models";
import { getPets } from "@/lib/queries";
import { addDays, MEAL_LABEL, todayKST } from "@/lib/shop";
import { vetReport, weeklySummary, type Log } from "@/lib/summary";
import RecordForm from "./RecordForm";
import PetForm from "@/app/my/pets/PetForm";
import { ReportBox, DeleteLog } from "./ReportBox";

export const metadata: Metadata = { title: "건강 기록" };

export default async function RecordPage({ searchParams }: PageProps<"/record">) {
  const user = await getUser();
  if (!user)
    return (
      <section className="view">
        <div className="empty">
          <h1 className="h2">로그인하고 건강 기록을 시작하세요</h1>
          <p style={{ margin: "10px 0 18px" }}>하루 1분, 버튼 몇 개로 식사·활동·배변을 기록하면 주간 요약과 병원 상담용 리포트를 만들어 드려요.</p>
          <Link className="btn" href="/login?next=/record">로그인</Link>
        </div>
      </section>
    );

  const pets = await getPets(user.id);
  if (!pets.length)
    return (
      <section className="view">
        <div className="panel stack" style={{ maxWidth: 640, margin: "0 auto" }}>
          <h1 className="h2">먼저 아이를 등록해 주세요</h1>
          <PetForm />
        </div>
      </section>
    );

  const sp = await searchParams;
  const pet = pets.find((p) => p.id === sp.pet) ?? pets[0];
  const today = todayKST();
  const c = await cols();
  const docs = await c.logs
    .find({ pet_id: pet.id, user_id: user.id, log_date: { $gte: addDays(today, -29) } })
    .sort({ log_date: -1 })
    .toArray();
  const logs: Log[] = docs.map((l) => ({ id: l._id, log_date: l.log_date, meal: l.meal, walk: l.walk, poop: l.poop, water: l.water, memo: l.memo }));
  const todayLog = logs.find((l) => l.log_date === today) ?? null;
  const sm = weeklySummary(logs, today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  return (
    <section className="view">
      {pets.length > 1 && (
        <div className="petpick" style={{ marginBottom: 14 }}>
          {pets.map((p) => (
            <Link key={p.id} className="chip" href={`/record?pet=${p.id}`} aria-pressed={p.id === pet.id}>{p.name}</Link>
          ))}
        </div>
      )}
      <div className="petbar" style={{ marginBottom: 18 }}>
        <div className="av">{pet.name.slice(0, 1)}</div>
        <div>
          <h1 className="h2">{pet.name}의 건강 기록</h1>
          <span style={{ color: "var(--muted)", fontSize: 14 }}>
            {pet.breed || (pet.species === "cat" ? "고양이" : "강아지")} · {pet.age_group} · {pet.weight_group} · <Link href="/my/pets">정보 수정</Link>
          </span>
        </div>
      </div>
      <div className="rec">
        <RecordForm key={pet.id + (todayLog?.id ?? "")} petId={pet.id} initial={todayLog} today={today} />
        <div className="stack">
          <div className="panel stack">
            <h2 className="h2" style={{ fontSize: 19 }}>최근 7일 식사량</h2>
            <div>
              <div className="chart" role="img" aria-label="최근 7일 식사량 막대 그래프">
                {days.map((d) => {
                  const l = logs.find((x) => x.log_date === d);
                  const v = l ? l.meal + 1 : 0;
                  return (
                    <div key={d} className={`bar ${l && l.meal < 2 ? "low" : ""} ${d === today ? "today" : ""}`}>
                      <i style={{ height: v * 50 }} title={l ? MEAL_LABEL[l.meal] : "기록 없음"} />
                    </div>
                  );
                })}
              </div>
              <div className="days num">{days.map((d) => <span key={d}>{d === today ? "오늘" : d.slice(5).replace("-", "/")}</span>)}</div>
              <div className="legend">
                <span><i style={{ background: "var(--brand)" }} />잘 먹음</span>
                <span><i style={{ background: "var(--warm)" }} />절반 이하</span>
              </div>
            </div>
          </div>
          <div className="panel stack">
            <h2 className="h2" style={{ fontSize: 19 }}>주간 요약</h2>
            <div className="ai">
              <ul>{sm.pts.map((p) => <li key={p}>{p}</li>)}</ul>
              {sm.ask.length > 0 && (
                <p style={{ fontSize: 14 }}>
                  <b>더 알려 주세요</b>
                  {sm.ask.map((a) => <span key={a}><br />{a}</span>)}
                </p>
              )}
            </div>
            <p className="disclaim">이 요약은 보호자의 기록을 정리한 것이에요. 질병을 진단하거나 통증을 판정하지 않아요. 변화가 계속되면 동물병원 상담을 권해요.</p>
            <ReportBox text={vetReport(pet, logs, today)} />
          </div>
          <div className="panel">
            <h2 className="h2" style={{ fontSize: 17, marginBottom: 8 }}>최근 기록</h2>
            {logs.length ? (
              <ul className="log">
                {logs.slice(0, 14).map((l) => (
                  <li key={l.id}>
                    <span className="num">{l.log_date.slice(5).replace("-", "/")}</span>
                    <span>
                      식사 {MEAL_LABEL[l.meal]} · 활동 {l.walk} · 배변 {l.poop}
                      {l.water ? ` · 물 ${l.water}` : ""}
                      {l.memo ? ` · ${l.memo}` : ""} <DeleteLog id={l.id} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: "var(--muted)" }}>아직 기록이 없어요.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
