import Link from "next/link";
import type { Metadata } from "next";
import { CONCERNS, concernOf, won } from "@/lib/shop";
import { getProducts } from "@/lib/queries";

export const metadata: Metadata = { title: "쇼핑" };

const CATS = [
  ["all", "전체"],
  ["box", "케어 박스"],
  ["treat", "간식·식품"],
  ["living", "생활 케어 용품"],
] as const;

export default async function Shop({ searchParams }: PageProps<"/shop">) {
  const sp = await searchParams;
  const concern = typeof sp.concern === "string" ? sp.concern : "";
  const cat = typeof sp.cat === "string" ? sp.cat : "all";
  const all = await getProducts();
  const list = all.filter((p) => (cat === "all" || p.category === cat) && (!concern || p.concerns.includes(concern)));
  const cn = concernOf(concern);
  const href = (c: string, k: string) => {
    const q = new URLSearchParams();
    if (c) q.set("concern", c);
    if (k !== "all") q.set("cat", k);
    const s = q.toString();
    return "/shop" + (s ? "?" + s : "");
  };

  return (
    <section className="view">
      <div className="shop-head">
        <div>
          <span className="eyebrow">쇼핑</span>
          <h1 className="h2" style={{ fontSize: 28 }}>{cn ? `${cn.label} 아이를 위한 상품` : "전체 상품"}</h1>
        </div>
        <span className="num" style={{ color: "var(--muted)" }}>{list.length}개</span>
      </div>
      <div className="filters">
        <div className="row" role="group" aria-label="변화로 찾기">
          {CONCERNS.map((c) => (
            <Link key={c.id} className="chip" href={href(concern === c.id ? "" : c.id, cat)} aria-pressed={concern === c.id} style={{ textDecoration: "none" }}>
              {c.short}
            </Link>
          ))}
        </div>
        <div className="row" role="group" aria-label="상품 종류">
          {CATS.map(([k, label]) => (
            <Link key={k} className="chip" href={href(concern, k)} aria-pressed={cat === k} style={{ textDecoration: "none" }}>
              {label}
            </Link>
          ))}
        </div>
      </div>

      {list.length ? (
        <div className="grid">
          {list.map((p) => (
            <Link key={p.id} className="card" href={p.category === "box" ? "/box" : `/products/${p.id}`}>
              <div className="im">
                <img src={`/img/${p.image}`} alt={p.name} loading="lazy" />
              </div>
              <div className="bd">
                <div className="row" style={{ gap: 4 }}>
                  {p.concerns.map((c) => (
                    <span key={c} className="tag">{concernOf(c)?.short}</span>
                  ))}
                  {p.stock <= 0 && <span className="tag warm">품절</span>}
                </div>
                <span className="nm">{p.name}</span>
                {concern && p.why[concern] && <span className="why">추천 이유 · {p.why[concern]}</span>}
                <span className="pr">
                  <span className="price num">{won(p.price)}</span>
                  {p.category === "box" && <small style={{ color: "var(--muted)" }}> /월</small>}
                  {p.trial_price ? <span className="tag warm"> 소량 체험 {won(p.trial_price)}</span> : null}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty">{all.length ? "이 조건에 맞는 상품이 아직 없어요. 다른 변화를 선택해 보세요." : "상품을 불러오지 못했어요."}</div>
      )}
    </section>
  );
}
