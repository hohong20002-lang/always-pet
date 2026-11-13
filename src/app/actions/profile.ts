"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { cols } from "@/lib/models";

export async function updateProfile(_: unknown, fd: FormData): Promise<{ ok?: string; error?: string } | null> {
  const user = await getUser();
  if (!user) redirect("/login?next=/my/profile");
  const s = (k: string, n = 200) => String(fd.get(k) ?? "").trim().slice(0, n);
  const { users } = await cols();
  await users.updateOne(
    { _id: user.id },
    {
      $set: {
        name: s("name", 40),
        phone: s("phone", 20).replace(/[^0-9-]/g, ""),
        zipcode: s("zipcode", 10),
        address: s("address"),
        address_detail: s("address_detail"),
        marketing_opt_in: !!fd.get("marketing_opt_in"),
      },
    },
  );
  revalidatePath("/", "layout");
  return { ok: "저장했어요" };
}
