import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { isConfigured } from "@/lib/db";
import { recordVisit } from "@/lib/activity";
import { blockedMinutes, clientIp, recordFailure } from "@/lib/ratelimit";

// 페이지 방문 기록 (화면이 바뀔 때마다 브라우저가 조용히 보내요)
// 방문자 번호는 브라우저가 만든 무작위 값이라 누가 방문했는지는 알 수 없어요. 로그인한 회원이면 회원 id만 함께 남겨요.

const PATH = /^\/[A-Za-z0-9\-_/]{0,100}$/;
const VID = /^[A-Za-z0-9_-]{16,40}$/;

export async function POST(request: NextRequest) {
  if (!isConfigured()) return new NextResponse(null, { status: 204 });

  // 우리 사이트 화면에서 보낸 요청만 받아요 (브라우저는 이 요청에 항상 Origin을 붙여요)
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return new NextResponse(null, { status: 403 });

  // 같은 IP에서 10분에 120번 넘게 오면 무시 (가짜 방문으로 통계를 부풀리거나 DB 용량을 채우는 것 방지)
  const ipKey = `visit:ip:${await clientIp()}`;
  if (await blockedMinutes([{ key: ipKey, limit: 120 }])) return new NextResponse(null, { status: 429 });
  await recordFailure([ipKey], 10); // 이름은 '실패 기록'이지만 여기서는 요청 횟수를 세는 데 써요

  let body: { path?: unknown; vid?: unknown };
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  // 문자열이고 정해진 모양일 때만 받아요 (객체·연산자·스크립트 차단)
  if (typeof body?.path !== "string" || !PATH.test(body.path) || typeof body?.vid !== "string" || !VID.test(body.vid)) {
    return new NextResponse(null, { status: 400 });
  }

  const user = await getUser();
  await recordVisit(body.vid, body.path, user?.id ?? null);
  return new NextResponse(null, { status: 204 });
}
