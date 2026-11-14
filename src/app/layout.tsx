import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { getUser } from "@/lib/auth";
import { isConfigured } from "@/lib/db";
import { getCartCount } from "@/lib/queries";
import { NavLinks, TabBar } from "@/components/Nav";
import VisitTracker from "@/components/VisitTracker";

export const metadata: Metadata = {
  title: { default: "올웨이즈 펫 · 노령 반려동물 케어 커머스", template: "%s · 올웨이즈 펫" },
  description: "고르고, 기록하고, 조정하는 일을 한곳에서. 일곱 살이 넘은 아이에게 맞는 돌봄을 매일 실천하기 쉽게.",
  icons: { icon: "/img/logo.jpg" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getUser();
  const cartCount = user ? await getCartCount(user.id) : 0;
  const isAdmin = !!user?.is_admin;

  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Noto+Sans+KR:wght@400;500;700&display=swap"
        />
      </head>
      <body>
        <header className="top">
          <div className="wrap">
            <Link className="logo" href="/">
              <img src="/img/logo.jpg" alt="" />
              <b>Always Pet</b>
            </Link>
            <NavLinks />
            <div className="tools">
              {isAdmin && (
                <Link className="plain" href="/admin">
                  관리자
                </Link>
              )}
              {user ? (
                <Link className="plain" href="/my">
                  마이페이지
                </Link>
              ) : (
                <Link className="plain" href="/login">
                  로그인
                </Link>
              )}
              <Link className="cart-btn" href="/cart">
                장바구니<span className="cnt num">{cartCount}</span>
              </Link>
            </div>
          </div>
        </header>

        {!isConfigured() && (
          <div className="wrap" style={{ paddingTop: 16 }}>
            <div className="notice">
              데이터베이스가 아직 연결되지 않았어요. <code>.env.local</code>에 MongoDB 연결 주소(MONGODB_URI)를 넣어 주세요.
            </div>
          </div>
        )}

        <main className="wrap">{children}</main>

        <footer>
          <div className="wrap footer-wrap">
            <b>올웨이즈 펫 (Always Pet)</b>
            <span>노령 반려동물 케어 커머스 · 전자상거래 팀 프로젝트 데모 사이트</span>
            <span>결제는 토스페이먼츠 테스트 환경으로 처리되어 실제 돈이 나가지 않아요.</span>
          </div>
        </footer>

        <TabBar cartCount={cartCount} />
        <VisitTracker />
      </body>
    </html>
  );
}
