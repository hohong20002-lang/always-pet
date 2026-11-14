// 서버 액션 입력 검증 도우미
// 서버 액션은 누구나 직접 POST로 호출할 수 있어서, TypeScript 타입만 믿지 않고 실행 시점에 값을 다시 확인해요.
// 특히 MongoDB 쿼리에 객체({"$ne": ...} 같은 연산자)가 들어가지 않도록 id는 반드시 문자열로만 받아요.

/** id 값: 문자열이 아니거나 이상한 문자가 있으면 빈 문자열 */
export function sid(v: unknown): string {
  return typeof v === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(v) ? v : "";
}

/** 숫자 값: 숫자가 아니면 기본값, 범위를 벗어나면 잘라냄 */
export function num(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** 문자열 값: 문자열이 아니면 빈 문자열, 길이 제한 */
export function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** 정해진 값 중 하나만 허용 */
export function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** 문자열 배열: 배열이 아니면 빈 배열, 문자열만 남김 */
export function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/** 로그인 후 이동할 주소: 우리 사이트 안의 경로만 허용 (외부 사이트로 보내는 열린 리다이렉트 방지) */
export function safeNext(v: unknown): string {
  const s = typeof v === "string" ? v : "";
  // "/"로 시작하고, "//"·"/\"(브라우저가 외부 주소로 해석) 및 제어문자가 없어야 함
  if (!s.startsWith("/") || s.startsWith("//") || s.startsWith("/\\") || /[\\\u0000-\u001f]/.test(s)) return "/";
  return s;
}
