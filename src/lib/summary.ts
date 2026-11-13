import { addDays, MEAL_LABEL, type Pet } from "@/lib/shop";

export type Log = { id: string; log_date: string; meal: number; walk: string; poop: string; water: string | null; memo: string };

/** 기록을 바탕으로 한 주간 요약 (진단이 아닌 관찰 정리) */
export function weeklySummary(logs: Log[], today: string) {
  const from = addDays(today, -6);
  const week = logs.filter((l) => l.log_date >= from && l.log_date <= today).sort((a, b) => a.log_date.localeCompare(b.log_date));
  const pts: string[] = [];
  const ask: string[] = [];
  if (!week.length) return { week, pts: ["이번 주 기록이 아직 없어요. 오늘 기록부터 남겨 보세요."], ask };

  const avg = (a: Log[]) => a.reduce((s, x) => s + x.meal, 0) / Math.max(1, a.length);
  if (week.length >= 4) {
    const first = week.slice(0, 3), last = week.slice(-3);
    if (avg(last) < avg(first)) pts.push(`식사량이 주 초반보다 줄었어요. 최근 3번의 기록 중 ${last.filter((x) => x.meal < 2).length}번은 절반 이하로 먹었어요.`);
    else if (avg(last) > avg(first)) pts.push("식사량이 주 초반보다 늘었어요.");
  }
  const lowMeal = week.filter((x) => x.meal === 0).length;
  if (lowMeal) pts.push(`거의 먹지 않은 날이 ${lowMeal}일 있었어요.`);
  const lowWalk = week.filter((x) => /줄었음/.test(x.walk)).length;
  if (lowWalk) pts.push(`산책·활동이 평소보다 줄었다고 기록한 날이 ${lowWalk}일이에요.`);
  const badPoop = week.filter((x) => x.poop !== "정상");
  if (badPoop.length) pts.push(`배변이 평소와 달랐던 날이 ${badPoop.length}일이에요 (${[...new Set(badPoop.map((x) => x.poop))].join(", ")}).`);
  const water = week.filter((x) => x.water && x.water !== "평소");
  if (water.length) pts.push(`물 마시는 양이 평소와 달랐던 날이 ${water.length}일이에요 (${[...new Set(water.map((x) => x.water))].join(", ")}).`);
  const memos = week.filter((l) => l.memo).map((l) => `${l.log_date.slice(5).replace("-", "/")} '${l.memo}'`);
  if (memos.length) pts.push("메모: " + memos.join(", "));
  if (!pts.length) pts.push(`이번 주 ${week.length}일 기록에서 눈에 띄는 변화는 없었어요.`);

  if (!week.some((x) => x.water)) ask.push("물 마시는 양은 평소와 비슷했나요?");
  if (lowWalk && !week.some((l) => /계단|다리|절뚝/.test(l.memo))) ask.push("걸을 때 특정 다리를 아껴 쓰는 모습이 있었나요?");
  if (week.length < 4) ask.push(`이번 주 기록이 ${week.length}일이라 흐름을 보기엔 조금 부족해요.`);
  return { week, pts, ask };
}

export function vetReport(pet: Pet, logs: Log[], today: string) {
  const s = weeklySummary(logs, today);
  const qs = ["지금 보이는 변화가 나이 때문인지, 확인해 볼 검사가 있을까요?"];
  if (s.week.some((x) => /줄었음/.test(x.walk))) qs.push("산책을 힘들어하는데 관절 상태를 확인해 볼 수 있을까요?");
  if (pet.current_ingredients.length) qs.push(`지금 먹는 간식·영양제(${pet.current_ingredients.join(", ")})를 계속 줘도 될까요?`);
  if (pet.meds) qs.push(`복용 중인 약(${pet.meds})과 함께 줘도 되는 간식·영양제는 무엇인가요?`);
  const rows = s.week.map((l) => `${l.log_date} 식사 ${MEAL_LABEL[l.meal]} · 활동 ${l.walk} · 배변 ${l.poop}${l.water ? " · 물 " + l.water : ""}${l.memo ? " · " + l.memo : ""}`);
  return [
    `${pet.name} (${pet.species === "cat" ? "고양이" : "강아지"}${pet.breed ? " · " + pet.breed : ""} · ${pet.age_group} · ${pet.weight_group})`,
    `상담 준비 메모 · ${addDays(today, -6)} ~ ${today} 기록 기준`,
    "",
    "[관찰된 변화]",
    ...s.pts.map((p) => "· " + p),
    "",
    "[날짜별 기록]",
    ...(rows.length ? rows.map((r) => "· " + r) : ["· 기록 없음"]),
    "",
    "[수의사에게 물어볼 질문]",
    ...qs.map((q) => "· " + q),
    "",
    "※ 보호자가 기록한 내용을 정리한 것이며 진단이 아닙니다.",
  ].join("\n");
}
