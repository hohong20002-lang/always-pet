import type { NextConfig } from "next";

// 거의 모든 화면이 로그인 사용자별 데이터라서 Cache Components는 쓰지 않아요.
const nextConfig: NextConfig = {
  cacheComponents: false,
};

export default nextConfig;
