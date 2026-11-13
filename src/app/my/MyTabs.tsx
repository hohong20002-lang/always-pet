"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MyTabs() {
  const path = usePathname();
  const tabs = [
    ["/my", "구독·주문"],
    ["/my/pets", "우리 아이"],
    ["/my/profile", "내 정보"],
  ];
  return (
    <nav className="tabs" aria-label="마이페이지 메뉴">
      {tabs.map(([href, label]) => (
        <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>{label}</Link>
      ))}
    </nav>
  );
}
