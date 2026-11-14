import "server-only";
import { headers } from "next/headers";
import { getDb } from "./db";

// 로그인·가입 시도 횟수 제한 (비밀번호 무작위 대입 방지)
// 시도 기록은 MongoDB에 저장되고, 정해진 시간이 지나면 TTL 인덱스로 자동 삭제돼요.

type Attempt = { _id: string; count: number; expires_at: Date };

const coll = async () => (await getDb()).collection<Attempt>("login_attempts");

/** 요청한 사람의 IP (Vercel이 붙여 주는 x-forwarded-for 첫 번째 값) */
export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

/** 막혀 있으면 남은 분(分)을, 아니면 0을 돌려줘요 */
export async function blockedMinutes(keys: { key: string; limit: number }[]) {
  const c = await coll();
  const docs = await c.find({ _id: { $in: keys.map((k) => k.key) } }).toArray();
  const now = Date.now();
  for (const d of docs) {
    const limit = keys.find((k) => k.key === d._id)!.limit;
    if (d.count >= limit && d.expires_at.getTime() > now) return Math.ceil((d.expires_at.getTime() - now) / 60000);
  }
  return 0;
}

/** 실패 1회 기록 (처음 실패한 때부터 windowMin 분 동안 유지) */
export async function recordFailure(keys: string[], windowMin: number) {
  const c = await coll();
  const expires = new Date(Date.now() + windowMin * 60000);
  await Promise.all(
    keys.map((key) => c.updateOne({ _id: key }, { $inc: { count: 1 }, $setOnInsert: { expires_at: expires } }, { upsert: true })),
  );
}

export async function clearFailures(keys: string[]) {
  const c = await coll();
  await c.deleteMany({ _id: { $in: keys } });
}
