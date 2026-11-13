// 개발·테스트용 임시 MongoDB (Atlas 없이 로컬에서 돌려볼 때). 실행: npm run db:local
// 메모리에만 저장돼서 끄면 데이터가 사라져요.
// 로컬 테스트 계정 예시: admin-test@example.com / localtest-1234 (.env.local의 ADMIN_EMAILS에 넣으면 관리자)
import { MongoMemoryServer } from "mongodb-memory-server";
const server = await MongoMemoryServer.create({ instance: { port: 27018, ip: "127.0.0.1" } });
console.log("로컬 MongoDB 실행 중:", server.getUri());
process.on("SIGINT", async () => { await server.stop(); process.exit(0); });
setInterval(() => {}, 1 << 30);
