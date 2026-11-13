import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { getPets } from "@/lib/queries";
import BoxBuilder from "./BoxBuilder";

export const metadata: Metadata = { title: "시니어 맞춤 케어 박스" };

export default async function BoxPage() {
  const user = await getUser();
  const pets = user ? await getPets() : [];
  return (
    <section className="view">
      <BoxBuilder pets={pets} loggedIn={!!user} />
    </section>
  );
}
