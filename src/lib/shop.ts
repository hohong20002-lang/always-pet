// 쇼핑몰 공통 데이터·계산 (서버·클라이언트 모두 사용)

export const CONCERNS = [
  { id: "joint", label: "산책을 힘들어해요", short: "관절·보행" },
  { id: "appetite", label: "간식을 잘 안 먹어요", short: "식욕" },
  { id: "digest", label: "배변이 불규칙해요", short: "소화·배변" },
  { id: "skin", label: "털·피부가 거칠어요", short: "피부·위생" },
  { id: "slip", label: "집에서 자주 미끄러져요", short: "생활환경" },
] as const;

export const INGREDIENTS = ["닭고기", "연어", "고구마", "오메가-3", "글루코사민"];
export const AGE_GROUPS = ["7~9세", "10세 이상"];
export const WEIGHT_GROUPS = ["5kg 미만", "5~10kg", "10kg 이상"];
export const MEAL_LABEL = ["거의 안 먹음", "절반", "잘 먹음"];

export const PLANS = {
  basic: { label: "기본", price: 29900, desc: "간식 2종 + 영양 보조 1종 + 안내서" },
  premium: { label: "프리미엄", price: 39900, desc: "기본 구성 + 위생 케어 + 상담 리포트 출력본" },
} as const;
export type PlanKey = keyof typeof PLANS;

export const FREE_SHIP = 30000;
export const SHIP_FEE = 3000;

export type Product = {
  id: string;
  category: "box" | "treat" | "living";
  name: string;
  image: string;
  price: number;
  trial_price: number | null;
  subscribable: boolean;
  description: string;
  spec: Record<string, string>;
  concerns: string[];
  main_ingredients: string[];
  why: Record<string, string>;
  stock: number;
  active: boolean;
  sort: number;
};

export type Pet = {
  id: string;
  name: string;
  species: "dog" | "cat";
  breed: string;
  age_group: string;
  weight_group: string;
  concerns: string[];
  current_ingredients: string[];
  meds: string;
};

export type Mode = "once" | "trial" | "sub";

export const won = (n: number) => n.toLocaleString("ko-KR") + "원";
export const concernOf = (id: string) => CONCERNS.find((c) => c.id === id);

/** 구매 방식별 단가. 서버에서 주문 금액을 계산할 때도 이 함수를 써요. */
export function unitPrice(p: Pick<Product, "id" | "price" | "trial_price">, mode: Mode, plan = ""): number {
  if (p.id === "carebox") return PLANS[(plan as PlanKey) in PLANS ? (plan as PlanKey) : "basic"].price;
  if (mode === "trial") return p.trial_price ?? p.price;
  if (mode === "sub") return Math.round((p.price * 0.9) / 100) * 100;
  return p.price;
}

export function modeNote(mode: Mode, cycle: number, plan = "") {
  if (plan) return `매달 정기배송 · ${PLANS[plan as PlanKey]?.label ?? ""} 플랜`;
  if (mode === "trial") return "소량 체험팩 (3회분)";
  if (mode === "sub") return `정기배송 · ${cycle}주마다`;
  return "한 번 구매";
}

export const shippingFee = (itemsTotal: number) => (itemsTotal >= FREE_SHIP || itemsTotal === 0 ? 0 : SHIP_FEE);

/** 케어 박스 구성 (추천 이유 포함) */
export function boxCompo(pet: Pick<Pet, "name" | "species" | "age_group" | "concerns" | "current_ingredients">, plan: string) {
  const out: { n: string; r: string }[] = [];
  const cat = pet.species === "cat";
  const hasChicken = pet.current_ingredients.includes("닭고기");
  out.push({ n: "케어 안내서", r: `${pet.name || "우리 아이"}의 나이(${pet.age_group})에 맞춘 이번 달 관찰 포인트 1장` });
  if (pet.concerns.includes("appetite"))
    out.push({
      n: hasChicken ? "연어 스틱 소포장" : "닭가슴살 육포 소포장",
      r: "식욕이 떨어졌다고 해서 향이 강한 간식을 골랐어요" + (hasChicken ? ". 지금 닭고기 간식을 먹고 있어 원료를 바꿨어요" : ""),
    });
  if (pet.concerns.includes("digest")) out.push({ n: "고구마 큐브 소포장", r: "배변이 불규칙하다고 해서 식이섬유가 있는 단일 원료 간식을 넣었어요" });
  if (pet.concerns.includes("joint"))
    out.push({ n: cat ? "캣 관절 영양 파우더 (14일분)" : "관절 영양 츄 (14일분)", r: "산책·활동이 줄었다고 해서 넣었어요. 영양 보조 제품이며 치료 목적이 아니에요" });
  if (pet.concerns.includes("skin")) out.push({ n: "저자극 물티슈", r: "털·피부가 거칠다고 해서 넣었어요" });
  if (pet.concerns.includes("slip")) out.push({ n: "발바닥 미끄럼 방지 패드", r: "집에서 미끄러진다고 해서 넣었어요" });
  if (plan === "premium") out.push({ n: "마일드 저자극 샴푸 (소용량)", r: "프리미엄 구성에 포함되는 위생 케어 상품이에요" });
  if (out.length < 3) out.push({ n: "시니어 기본 간식 1종", r: "관심사를 고르지 않아 부드러운 기본 간식을 넣었어요" });
  return out;
}

/** 한국 시간 기준 오늘 날짜 (YYYY-MM-DD) */
export function todayKST() {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}
export function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${"일월화수목금토"[d.getUTCDay()]})`;
}
export function fmtDateTime(ts: string) {
  const d = new Date(new Date(ts).getTime() + 9 * 3600_000);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getUTCFullYear()}.${p(d.getUTCMonth() + 1)}.${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

export const ORDER_STATUS: Record<string, string> = {
  pending: "결제 대기",
  paid: "결제 완료",
  preparing: "상품 준비중",
  shipped: "배송중",
  delivered: "배송 완료",
  cancelled: "주문 취소",
};
export const SUB_STATUS: Record<string, string> = {
  active: "이용 중",
  paused: "일시정지",
  cancelled: "해지됨",
  farewell: "정리됨",
};
