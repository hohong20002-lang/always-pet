"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const KEY = "ap-vid";

/** 이 브라우저의 무작위 방문자 번호 (개인을 알 수 있는 정보는 담지 않아요) */
function visitorId() {
  try {
    let v = localStorage.getItem(KEY);
    if (!v || !/^[A-Za-z0-9_-]{16,40}$/.test(v)) {
      v = crypto.randomUUID().replace(/-/g, "");
      localStorage.setItem(KEY, v);
    }
    return v;
  } catch {
    // 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 이번 방문에만 쓰는 번호
    return crypto.randomUUID().replace(/-/g, "");
  }
}

/** 화면이 바뀔 때마다 방문 기록을 보내요 (실패해도 사용자에게는 아무 영향 없음) */
export default function VisitTracker() {
  const path = usePathname();
  useEffect(() => {
    if (!path) return;
    fetch("/api/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, vid: visitorId() }),
      keepalive: true,
    }).catch(() => {});
  }, [path]);
  return null;
}
