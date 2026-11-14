import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { isConfigured } from "@/lib/db";
import { recordVisit } from "@/lib/activity";

// 페이지 방문 기록 (화면이 바뀔 때마다 브라우저가 조용히 보내요)
// 방문자 번호는 브라우저가 만든 무작위 값이라 누가 방문했는지는 알 수 없어요. 로그인한 회원이면 회원 id만 함께 남겨요.

const PATH = /^\/[A-Za-z0-9\-_/]{0,100}$/;
const VID = /^[A-Za-z0-9_-]{16,40}$/;

export async function POST(request: NextRequest) {
  if (!isConfigured()) return new NextResponse(null, { status: 204 });

  // 다른 사이트에서 보낸 요청은 무시 (방문 수 부풀리기 방지)
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return new NextResponse(null, { status: 403 });

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
