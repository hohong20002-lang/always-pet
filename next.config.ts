import type { NextConfig } from "next";

// 모든 페이지에 붙는 기본 보안 헤더
const securityHeaders = [
  // 다른 사이트가 우리 페이지를 iframe으로 감싸 클릭을 가로채지 못하게 (클릭재킹 방지)
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://*.tosspayments.com" },
  // 파일 종류를 추측해서 실행하지 않게
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 다른 사이트로 이동할 때 주소 전체(주문번호 등)를 넘기지 않게
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 쓰지 않는 기기 권한은 막기 (결제창이 쓰는 payment는 허용)
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://*.tosspayments.com\")" },
  // 항상 HTTPS로만 접속
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

// 거의 모든 화면이 로그인 사용자별 데이터라서 Cache Components는 쓰지 않아요.
const nextConfig: NextConfig = {
  cacheComponents: false,
  poweredByHeader: false, // 서버 종류(Next.js)를 응답 헤더로 알리지 않기
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
