import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getPets, getProduct } from "@/lib/queries";
import { getUser } from "@/lib/auth";
import ProductBuy from "./ProductBuy";

export async function generateMetadata({ params }: PageProps<"/products/[id]">): Promise<Metadata> {
  const p = await getProduct((await params).id);
  return { title: p?.name ?? "상품" };
}

export default async function ProductPage({ params }: PageProps<"/products/[id]">) {
  const { id } = await params;
  if (id === "carebox") redirect("/box");
  const p = await getProduct(id);
  if (!p || !p.active) notFound();
  const user = await getUser();
  const pets = user ? await getPets(user.id) : [];
  const pet = pets[0];
  const overlap = pet ? p.main_ingredients.filter((m) => pet.current_ingredients.includes(m)) : [];

  return (
    <section className="view">
      <Link className="back" href="/shop">← 상품 목록</Link>
      <div className="detail">
        <div className="gal">
          <img src={`/img/${p.image}`} alt={p.name} />
        </div>
        <div className="info">
          <div>
            <span className="eyebrow">{p.category === "treat" ? "시니어 간식" : "생활 케어 용품"}</span>
            <h1>{p.name}</h1>
          </div>
          <p>{p.description}</p>
          <dl className="kv">
            {Object.entries(p.spec).map(([k, v]) => (
              <div key={k} style={{ display: "contents" }}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          {p.main_ingredients.length > 0 &&
            (pet ? (
              overlap.length ? (
                <div className="check warn">⚠ <span><b>{pet.name}</b>가 지금 먹는 <b>{overlap.join(", ")}</b> 원료와 겹쳐요. 하루 급여량을 나눠 주세요.</span></div>
              ) : (
                <div className="check ok">✓ <span><b>{pet.name}</b>가 지금 먹는 제품과 겹치는 주원료가 없어요.</span></div>
              )
            ) : (
              <p className="disclaim">
                <Link href={user ? "/my/pets" : `/login?next=/products/${p.id}`}>반려동물을 등록</Link>하면 지금 먹는 간식과 주원료가 겹치는지 확인해 드려요.
              </p>
            ))}
          <ProductBuy
            product={{ id: p.id, price: p.price, trial_price: p.trial_price, subscribable: p.subscribable, stock: p.stock }}
            petId={pet?.id ?? null}
          />
        </div>
      </div>
    </section>
  );
}
