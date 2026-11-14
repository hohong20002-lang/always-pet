"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isConfigured, newId } from "@/lib/db";
import { cols } from "@/lib/models";
import { adminEmails, checkPassword, endSession, hashPassword, startSession } from "@/lib/auth";
import { blockedMinutes, clearFailures, clientIp, recordFailure } from "@/lib/ratelimit";
import { safeNext, str } from "@/lib/validate";

export type AuthState = { error?: string; info?: string } | null;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function login(_: AuthState, fd: FormData): Promise<AuthState> {
  if (!isConfigured()) return { error: "데이터베이스가 아직 연결되지 않았어요." };
  const email = str(fd.get("email"), 200).toLowerCase();
  const password = typeof fd.get("password") === "string" ? String(fd.get("password")).slice(0, 200) : "";
  if (!email || !password) return { error: "이메일과 비밀번호를 입력해 주세요." };

  // 같은 이메일 15분에 10번, 같은 IP 15분에 30번 실패하면 잠시 막기
  const ip = await clientIp();
  const keys = [`login:email:${email}`, `login:ip:${ip}`];
  const wait = await blockedMinutes([
    { key: keys[0], limit: 10 },
    { key: keys[1], limit: 30 },
  ]);
  if (wait) return { error: `로그인 시도가 너무 많아요. ${wait}분 뒤에 다시 시도해 주세요.` };

  const { users } = await cols();
  const u = await users.findOne({ email });
  if (!u || !(await checkPassword(password, u.password_hash))) {
    await recordFailure(keys, 15);
    return { error: "이메일 또는 비밀번호가 맞지 않아요." };
  }
  await clearFailures([keys[0]]);
  await startSession(u._id);
  revalidatePath("/", "layout");
  redirect(safeNext(fd.get("next")));
}

export async function signup(_: AuthState, fd: FormData): Promise<AuthState> {
  if (!isConfigured()) return { error: "데이터베이스가 아직 연결되지 않았어요." };
  const name = str(fd.get("name"), 40);
  const email = str(fd.get("email"), 200).toLowerCase();
  const password = typeof fd.get("password") === "string" ? String(fd.get("password")) : "";
  if (!name) return { error: "이름을 입력해 주세요." };
  if (!EMAIL.test(email)) return { error: "이메일 형식을 확인해 주세요." };
  if (password.length < 8) return { error: "비밀번호는 8자 이상으로 정해 주세요." };
  if (password.length > 72) return { error: "비밀번호는 72자 이하로 정해 주세요." };
  if (!fd.get("agree")) return { error: "이용약관과 개인정보 수집·이용에 동의해 주세요." };
  // 이메일 인증이 없어서, 관리자 목록에 있는 이메일로 남이 먼저 가입해 관리자 권한을 가져가지 못하게 막아요.
  // 관리자를 늘리려면 먼저 그 이메일로 가입한 뒤에 ADMIN_EMAILS에 추가하세요.
  if (adminEmails().includes(email)) return { error: "이 이메일로는 가입할 수 없어요. 다른 이메일을 사용해 주세요." };

  // 같은 IP에서 1시간에 10개 넘게 가입하지 못하게 (가짜 계정 대량 생성 방지)
  const ipKey = `signup:ip:${await clientIp()}`;
  const wait = await blockedMinutes([{ key: ipKey, limit: 10 }]);
  if (wait) return { error: `가입 요청이 너무 많아요. ${wait}분 뒤에 다시 시도해 주세요.` };

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
  await recordFailure([ipKey], 60);
  await startSession(id);
  revalidatePath("/", "layout");
  redirect(safeNext(fd.get("next")));
}

export async function logout() {
  await endSession();
  revalidatePath("/", "layout");
  redirect("/");
}
