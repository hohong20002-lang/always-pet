import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { getDb, isConfigured } from "./db";

const COOKIE = "ap_session";
const DAYS = 30;

export type User = {
  id: string;
  email: string;
  name: string;
  phone: string;
  zipcode: string;
  address: string;
  address_detail: string;
  marketing_opt_in: boolean;
  is_admin: boolean;
};

type UserDoc = Omit<User, "id" | "is_admin"> & { _id: string; password_hash: string; created_at: Date };

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const checkPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

/** 로그인 세션 만들기: 무작위 토큰은 쿠키에, 해시만 DB에 저장해요 */
export async function startSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + DAYS * 86400_000);
  const db = await getDb();
  await db.collection<{ _id: string; user_id: string; expires_at: Date }>("sessions").insertOne({ _id: hashToken(token), user_id: userId, expires_at: expires });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token && isConfigured()) {
    const db = await getDb();
    await db.collection<{ _id: string }>("sessions").deleteOne({ _id: hashToken(token) });
  }
  store.delete(COOKIE);
}

/** 현재 로그인한 회원 (없으면 null) */
export async function getUser(): Promise<User | null> {
  const store = await cookies(); // 로그인 상태에 따라 달라지는 페이지임을 Next.js에 알려요
  const token = store.get(COOKIE)?.value;
  if (!token || !isConfigured()) return null;
  const db = await getDb();
  const s = await db.collection<{ _id: string; user_id: string; expires_at: Date }>("sessions").findOne({ _id: hashToken(token) });
  if (!s || s.expires_at < new Date()) return null;
  const u = await db.collection<UserDoc>("users").findOne({ _id: s.user_id }, { projection: { password_hash: 0 } });
  if (!u) return null;
  return {
    id: u._id,
    email: u.email,
    name: u.name ?? "",
    phone: u.phone ?? "",
    zipcode: u.zipcode ?? "",
    address: u.address ?? "",
    address_detail: u.address_detail ?? "",
    marketing_opt_in: !!u.marketing_opt_in,
    is_admin: adminEmails().includes(u.email),
  };
}
