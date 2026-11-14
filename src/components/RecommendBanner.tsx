"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Recommendation } from "@/lib/recommend";
import { won } from "@/lib/shop";

const KEY = "ap-rec-closed"; // 닫은 배너는 이번 방문(탭) 동안 다시 띄우지 않아요

/**
 * 연관 상품 추천 배너
 * - 모바일: 하단 탭 바로 위에 가로 바 형태
 * - 웹: 오른쪽 아래 모서리에 작은 상자 형태
 */
export default function RecommendBanner({ items, title, spot }: { items: Recommendation[]; title: string; spot: string }) {
  const [show, setShow] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    let closed = false;
    try {
      closed = (sessionStorage.getItem(KEY) ?? "").split(",").includes(spot);
    } catch {}
    if (closed || !items.length) return;
    // 페이지를 읽기 시작할 시간을 조금 준 뒤 부드럽게 등장
    const t = setTimeout(() => setShow(true), 1200);
    return () => clearTimeout(t);
  }, [items.length, spot]);

  useEffect(() => {
    document.body.classList.toggle("has-rec", show);
    return () => document.body.classList.remove("has-rec");
  }, [show]);

  if (!show || !items.length) return null;
  const r = items[i % items.length];

  const close = () => {
    setShow(false);
    try {
      const prev = (sessionStorage.getItem(KEY) ?? "").split(",").filter(Boolean);
      sessionStorage.setItem(KEY, [...new Set([...prev, spot])].join(","));
    } catch {}
  };

  return (
    <aside className="rec-banner" role="complementary" aria-label="추천 상품">
      <button className="rec-x" onClick={close} aria-label="추천 닫기">×</button>
      <span className="rec-title">{title}</span>
      <Link href={r.href} className="rec-body">
        <img src={`/img/${r.image}`} alt="" />
        <span className="rec-info">
          <b>{r.name}</b>
          <small>{r.reason}</small>
          <span className="num">
            {won(r.price)}
            {r.trial_price ? <em> · 체험 {won(r.trial_price)}</em> : null}
          </span>
        </span>
        <span className="rec-go">보기</span>
      </Link>
      {items.length > 1 && (
        <div className="rec-dots">
          {items.map((it, k) => (
            <button key={it.id} onClick={() => setI(k)} aria-label={`${k + 1}번째 추천 보기`} aria-pressed={k === i % items.length} />
          ))}
        </div>
      )}
    </aside>
  );
}
