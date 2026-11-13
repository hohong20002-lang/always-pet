import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import MyTabs from "../MyTabs";
import ProfileForm from "./ProfileForm";

export const metadata: Metadata = { title: "내 정보" };

export default async function ProfilePage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/my/profile");
  const p = user;
  return (
    <section className="view">
      <span className="eyebrow">마이페이지</span>
      <h1 className="h2" style={{ fontSize: 28, marginBottom: 12 }}>내 정보</h1>
      <MyTabs />
      <div className="panel" style={{ maxWidth: 640 }}>
        <ProfileForm
          email={user.email ?? ""}
          initial={{
            name: p?.name ?? "",
            phone: p?.phone ?? "",
            zipcode: p?.zipcode ?? "",
            address: p?.address ?? "",
            address_detail: p?.address_detail ?? "",
            marketing_opt_in: !!p?.marketing_opt_in,
          }}
        />
      </div>
    </section>
  );
}
