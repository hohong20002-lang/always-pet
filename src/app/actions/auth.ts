"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isConfigured, newId } from "@/lib/db";
import { cols } from "@/lib/models";
import { checkPassword, endSession, hashPassword, startSession } from "@/lib/auth";

export type AuthState = { error?: string; info?: string } | null;

const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function login(_: AuthState, fd: FormData): Promise<AuthState> {
  if (!isConfigured()) return { error: "데이터베이스가 아직 연결되지 않았어요." };
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const { users } = await cols();
  const u = await users.findOne({ email });
  if (!u || !(await checkPassword(password, u.password_hash))) return { error: "이메일 또는 비밀번호가 맞지 않아요." };
  await startSession(u._id);
  revalidatePath("/", "layout");
  redirect(safeNext(fd.get("next")));
}

export async function signup(_: AuthState, fd: FormData): Promise<AuthState> {
  if (!isConfigured()) return { error: "데이터베이스가 아직 연결되지 않았어요." };
  const name = String(fd.get("name") ?? "").trim().slice(0, 40);
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!name) return { error: "이름을 입력해 주세요." };
  if (!EMAIL.test(email)) return { error: "이메일 형식을 확인해 주세요." };
  if (password.length < 8) return { error: "비밀번호는 8자 이상으로 정해 주세요." };
  if (!fd.get("agree")) return { error: "이용약관과 개인정보 수집·이용에 동의해 주세요." };

  const { users } = await cols();
  if (await users.findOne({ email })) return { error: "이미 가입된 이메일이에요. 로그인해 주세요." };
  const id = newId();
  try {
    await users.insertOne({
      _id: id,
      email,
      password_hash: await hashPassword(password),
      name,
      phone: "",
      zipcode: "",
      address: "",
      address_detail: "",
      marketing_opt_in: false,
      created_at: new Date(),
    });
  } catch {
    return { error: "이미 가입된 이메일이에요. 로그인해 주세요." };
  }
  await startSession(id);
  revalidatePath("/", "layout");
  redirect(safeNext(fd.get("next")));
}

export async function logout() {
  await endSession();
  revalidatePath("/", "layout");
  redirect("/");
}
