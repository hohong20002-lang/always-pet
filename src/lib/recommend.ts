import "server-only";
import { cols, type OrderStatus } from "@/lib/models";
import { CONCERNS, type Product } from "@/lib/shop";

/**
 * 연관 상품 추천
 *
 * 1순위 · 협업 필터링(사용자 기반)
 *   지금 보고 있는/산 상품(+로그인했다면 내가 예전에 산 상품)을 "구매 패턴"으로 보고,
 *   패턴이 겹치는 다른 회원(자카드 유사도)이 함께 산 상품에 점수를 줘요.
 *   서로 다른 회원 MIN_SUPPORT명 이상이 산 상품만 추천해서, 한 사람의 우연한 구매로 추천되지 않게 해요.
 *
 * 2순위 · 비슷한 상품(데이터가 부족할 때)
 *   같은 종류(간식→간식, 생활용품→생활용품, 케어박스→간식)와 겹치는 고민(관절, 피부 등)으로 골라요.
 */

export type Recommendation = {
  id: string;
  name: string;
  image: string;
  price: number;
  trial_price: number | null;
  href: string;
  reason: string;
  method: "together" | "similar";
};

const MIN_SUPPORT = 2; // 함께 산 회원이 최소 몇 명이어야 협업 필터링 추천으로 인정할지
const PAID: OrderStatus[] = ["paid", "preparing", "shipped", "delivered"];
const CACHE_MS = 5 * 60_000;

// 회원별 구매 상품 목록은 5분 동안 메모리에 보관 (주문이 많아져도 매번 전체를 읽지 않게)
const g = globalThis as unknown as { _purchases?: { at: number; data: Map<string, Set<string>> } };

async function purchasesByUser(): Promise<Map<string, Set<string>>> {
  if (g._purchases && Date.now() - g._purchases.at < CACHE_MS) return g._purchases.data;
  const { orders } = await cols();
  const rows = await orders
    .find({ status: { $in: PAID } }, { projection: { user_id: 1, "items.product_id": 1 } })
    .sort({ created_at: -1 })
    .limit(5000)
    .toArray();
  const map = new Map<string, Set<string>>();
  for (const o of rows) {
    const set = map.get(o.user_id) ?? new Set<string>();
    for (const it of o.items ?? []) set.add(it.product_id);
    map.set(o.user_id, set);
  }
  g._purchases = { at: Date.now(), data: map };
  return map;
}

/** 결제가 끝나면 다음 추천에 바로 반영되도록 캐시 비우기 */
export function invalidateRecommendations() {
  g._purchases = undefined;
}

const CATEGORY_LABEL: Record<string, string> = { treat: "간식", living: "생활 케어 용품", box: "케어 박스" };
// 이 종류를 보고 있으면 어떤 종류를 추천할지 (가까운 순서)
const RELATED_CATEGORY: Record<string, string[]> = {
  treat: ["treat", "box"],
  living: ["living"],
  box: ["treat", "living"],
};

const toRec = (p: Product, reason: string, method: Recommendation["method"]): Recommendation => ({
  id: p.id,
  name: p.name,
  image: p.image,
  price: p.price,
  trial_price: p.trial_price,
  href: p.id === "carebox" ? "/box" : `/products/${p.id}`,
  reason,
  method,
});

export async function recommend(opts: { context: string[]; userId?: string | null; limit?: number }): Promise<Recommendation[]> {
  const limit = opts.limit ?? 3;
  const context = [...new Set(opts.context.filter(Boolean))];
  if (!context.length) return [];

  const { products } = await cols();
  const all = (await products.find({ active: true }).sort({ sort: 1 }).toArray()).map(({ _id, ...p }) => ({ ...p, id: _id }) as Product);
  const byId = new Map(all.map((p) => [p.id, p]));
  const buyable = (id: string) => {
    const p = byId.get(id);
    return !!p && p.stock > 0;
  };

  const purchases = await purchasesByUser();
  const mine = opts.userId ? purchases.get(opts.userId) ?? new Set<string>() : new Set<string>();
  // 구매 패턴 = 지금 맥락의 상품 + 내가 예전에 산 상품
  const pattern = new Set([...context, ...mine]);
  // 이미 보고 있거나 산 상품은 추천하지 않기
  const exclude = new Set([...context, ...mine]);

  // ── 1) 협업 필터링 ──
  const score = new Map<string, number>();
  const supporters = new Map<string, number>();
  for (const [uid, bought] of purchases) {
    if (uid === opts.userId) continue;
    let overlap = 0;
    for (const id of bought) if (pattern.has(id)) overlap++;
    if (!overlap) continue;
    const sim = overlap / (pattern.size + bought.size - overlap); // 자카드 유사도
    for (const id of bought) {
      if (exclude.has(id) || !buyable(id)) continue;
      score.set(id, (score.get(id) ?? 0) + sim);
      supporters.set(id, (supporters.get(id) ?? 0) + 1);
    }
  }
  const together = [...score.entries()]
    .filter(([id]) => (supporters.get(id) ?? 0) >= MIN_SUPPORT)
    .sort((a, b) => b[1] - a[1] || (supporters.get(b[0]) ?? 0) - (supporters.get(a[0]) ?? 0))
    .slice(0, limit)
    .map(([id]) => {
      // 구매자가 적을 때 정확한 인원을 보여 주면 특정 회원의 구매를 짐작할 수 있어서 5명 이상일 때만 숫자를 표시
      const n = supporters.get(id) ?? 0;
      return toRec(byId.get(id)!, n >= 5 ? `비슷하게 구매한 분들 ${n}명이 함께 샀어요` : "비슷하게 구매한 분들이 함께 샀어요", "together");
    });

  if (together.length >= limit) return together;

  // ── 2) 데이터가 부족하면 비슷한 상품으로 채우기 ──
  const ctxProducts = context.map((id) => byId.get(id)).filter((p): p is Product => !!p);
  const ctxConcerns = new Set(ctxProducts.flatMap((p) => p.concerns));
  const ctxCategories = new Set(ctxProducts.map((p) => p.category));
  const taken = new Set([...exclude, ...together.map((r) => r.id)]);

  const similar = all
    .filter((p) => !taken.has(p.id) && p.stock > 0)
    .map((p) => {
      let s = 0;
      let reason = "";
      // 같은 종류이거나 가까운 종류일수록 높게
      for (const c of ctxCategories) {
        const rank = (RELATED_CATEGORY[c] ?? []).indexOf(p.category);
        if (rank === 0) s += 4; // 같은 종류가 가장 우선 (간식→간식, 브러시→매트)
        else if (rank > 0) s += 1.5;
      }
      if (ctxCategories.has(p.category)) reason = `함께 보면 좋은 ${CATEGORY_LABEL[p.category]}`;
      // 같은 고민(관절, 피부 등)을 다루면 더 높게
      const shared = p.concerns.filter((c) => ctxConcerns.has(c));
      s += shared.length * 1.5; // 같은 종류 안에서는 같은 고민 상품을 먼저
      if (shared.length) reason = `${CONCERNS.find((c) => c.id === shared[0])?.short ?? ""} 고민에 함께 쓰기 좋아요`;
      if (!reason) reason = p.category === "box" ? "매달 맞춤 구성으로 받아 보세요" : `함께 보면 좋은 ${CATEGORY_LABEL[p.category]}`;
      return { p, s, reason };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.p.sort - b.p.sort)
    .slice(0, limit - together.length)
    .map((x) => toRec(x.p, x.reason, "similar"));

  return [...together, ...similar];
}
