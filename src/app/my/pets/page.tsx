import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { getPets } from "@/lib/queries";
import { concernOf } from "@/lib/shop";
import MyTabs from "../MyTabs";
import PetForm from "./PetForm";

export const metadata: Metadata = { title: "우리 아이" };

export default async function PetsPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/my/pets");
  const pets = await getPets();
  return (
    <section className="view">
      <span className="eyebrow">마이페이지</span>
      <h1 className="h2" style={{ fontSize: 28, marginBottom: 12 }}>우리 아이</h1>
      <MyTabs />
      <div className="list">
        {pets.map((p) => (
          <details key={p.id} className="panel">
            <summary style={{ cursor: "pointer", display: "flex", gap: 12, alignItems: "center" }}>
              <span className="petbar">
                <span className="av">{p.name.slice(0, 1)}</span>
                <span>
                  <b>{p.name}</b>
                  <br />
                  <small style={{ color: "var(--muted)" }}>
                    {p.breed || (p.species === "cat" ? "고양이" : "강아지")} · {p.age_group} · {p.weight_group}
                    {p.concerns.length ? " · " + p.concerns.map((c) => concernOf(c)?.short).join(", ") : ""}
                  </small>
                </span>
              </span>
            </summary>
            <div style={{ marginTop: 14 }}>
              <PetForm pet={p} />
            </div>
          </details>
        ))}
        <details className="panel" open={!pets.length}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>+ 아이 등록하기</summary>
          <div style={{ marginTop: 14 }}>
            <PetForm />
          </div>
        </details>
      </div>
    </section>
  );
}
