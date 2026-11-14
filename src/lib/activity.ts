import "server-only";
import { headers } from "next/headers";
import { getDb, newId } from "./db";
import { todayKST } from "./shop";

// 방문·로그인 기록 (관리자 화면용)
// - 개인정보를 최소로: 방문은 무작위 방문자 번호만, IP는 앞 두 자리만 남겨요.
// - 오래된 기록은 TTL 인덱스로 자동 삭제 (방문 90일, 로그인 180일 · db.ts에서 설정)

export type LoginKind = "login" | "login_failed" | "signup" | "logout";

export type VisitDoc = { _id: string; vid: string; day: string; path: string; slot: number; user_id: string | null; at: Date };
export type LoginEventDoc = {
  _id: string;
  kind: LoginKind;
  email: string;
  user_id: string | null;
  ip: string;
  device: string;
  browser: string;
  at: Date;
};

export const visitsCol = async () => (await getDb()).collection<VisitDoc>("visits");
export const loginEventsCol = async () => (await getDb()).collection<LoginEventDoc>("login_events");

/** IP는 앞 두 자리만 (예: 1.225.x.x) */
function maskIp(ip: string) {
  if (!ip || ip === "unknown") return "-";
  if (ip.includes(":")) return ip.split(":").slice(0, 2).join(":") + ":…";
  const p = ip.split(".");
  return p.length === 4 ? `${p[0]}.${p[1]}.x.x` : "-";
}

/** 접속 기기·브라우저를 대략적으로만 (정확한 기종·버전은 저장하지 않아요) */
function describeAgent(ua: string) {
  const device = /iPad|Tablet/i.test(ua) ? "태블릿" : /Mobi|Android|iPhone/i.test(ua) ? "모바일" : "PC";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /SamsungBrowser/.test(ua)
      ? "삼성 인터넷"
      : /KAKAOTALK/i.test(ua)
        ? "카카오톡"
        : /NAVER/i.test(ua)
          ? "네이버"
          : /Chrome\//.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : /Firefox\//.test(ua)
                ? "Firefox"
                : "기타";
  return { device, browser };
}

async function requestInfo() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  return { ip: maskIp(ip), ...describeAgent(h.get("user-agent") ?? "") };
}

/** 로그인·가입·로그아웃 기록. 기록 실패가 로그인 자체를 막지 않도록 오류는 무시해요. */
export async function recordLoginEvent(kind: LoginKind, email: string, userId: string | null) {
  try {
    const info = await requestInfo();
    const col = await loginEventsCol();
    await col.insertOne({ _id: newId(), kind, email: email.slice(0, 200), user_id: userId, ...info, at: new Date() });
  } catch {
    // 기록 실패는 무시
  }
}

/**
 * 페이지 방문 기록. 같은 방문자가 같은 페이지를 같은 30초 구간에 다시 열면 한 번으로 셉니다.
 * (방문자·경로·30초 구간에 고유 인덱스를 걸어, 동시에 두 번 와도 DB가 한 번만 저장해요)
 */
export async function recordVisit(vid: string, path: string, userId: string | null) {
  const col = await visitsCol();
  const slot = Math.floor(Date.now() / 30_000);
  try {
    const r = await col.updateOne(
      { vid, path, slot },
      { $setOnInsert: { _id: newId(), day: todayKST(), user_id: userId, at: new Date() } },
      { upsert: true },
    );
    return r.upsertedCount > 0;
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return false; // 동시에 들어온 같은 방문
    throw e;
  }
}
