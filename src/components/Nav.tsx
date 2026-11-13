"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const section = (path: string) => {
  if (path.startsWith("/shop") || path.startsWith("/products")) return "shop";
  if (path.startsWith("/box")) return "box";
  if (path.startsWith("/record")) return "record";
  if (path.startsWith("/my")) return "my";
  if (path.startsWith("/cart") || path.startsWith("/checkout")) return "cart";
  if (path === "/") return "home";
  return "";
};

export function NavLinks() {
  const cur = section(usePathname());
  const items = [
    ["shop", "/shop", "쇼핑"],
    ["box", "/box", "케어 박스"],
    ["record", "/record", "건강 기록"],
    ["my", "/my", "구독·주문"],
  ];
  return (
    <nav className="gnb" aria-label="주요 메뉴">
      {items.map(([k, href, label]) => (
        <Link key={k} href={href} aria-current={cur === k ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function TabBar({ cartCount }: { cartCount: number }) {
  const cur = section(usePathname());
  const a = (k: string) => (cur === k ? ("page" as const) : undefined);
  return (
    <nav className="tab" aria-label="하단 메뉴">
      <Link href="/" aria-current={a("home")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" /></svg>홈
      </Link>
      <Link href="/shop" aria-current={a("shop")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 8h14l-1 12H6zM9 8a3 3 0 016 0" /></svg>쇼핑
      </Link>
      <Link href="/record" aria-current={a("record")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19V9M10 19V5M16 19v-7M21 19H3" /></svg>기록
      </Link>
      <Link href="/my" aria-current={a("my")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></svg>MY
      </Link>
      <Link href="/cart" aria-current={a("cart")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h3l2.5 12h12L22 7H6.2" /></svg>장바구니
        <span className="num" data-cartcnt>{cartCount}</span>
      </Link>
    </nav>
  );
}
