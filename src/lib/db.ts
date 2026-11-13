import "server-only";
import { MongoClient, type Db } from "mongodb";
import { SEED_PRODUCTS } from "./seed";

// 서버리스(Vercel)에서도 연결을 재사용하도록 전역에 보관해요.
const g = globalThis as unknown as { _mongo?: Promise<Db> };

export function isConfigured() {
  const uri = process.env.MONGODB_URI ?? "";
  return uri.startsWith("mongodb") && !uri.includes("<password>");
}

async function connect(): Promise<Db> {
  const client = new MongoClient(process.env.MONGODB_URI!, { maxPoolSize: 10, serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "always_pet");
  await setup(db);
  return db;
}

export function getDb(): Promise<Db> {
  if (!isConfigured()) throw new Error("MONGODB_URI가 설정되지 않았어요.");
  if (!g._mongo) {
    g._mongo = connect().catch((e) => {
      g._mongo = undefined;
      throw e;
    });
  }
  return g._mongo;
}

/** 인덱스 생성 + 상품이 비어 있으면 초기 상품 등록 (처음 연결할 때 한 번) */
async function setup(db: Db) {
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("sessions").createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }),
    db.collection("pets").createIndex({ user_id: 1 }),
    db.collection("cart_items").createIndex({ user_id: 1, product_id: 1, mode: 1, cycle_weeks: 1, plan: 1 }, { unique: true }),
    db.collection("orders").createIndex({ order_no: 1 }, { unique: true }),
    db.collection("orders").createIndex({ user_id: 1, created_at: -1 }),
    db.collection("subscriptions").createIndex({ user_id: 1 }),
    db.collection("health_logs").createIndex({ pet_id: 1, log_date: 1 }, { unique: true }),
  ]);
  const products = db.collection<{ _id: string }>("products");
  if ((await products.estimatedDocumentCount()) === 0) {
    await products.insertMany(SEED_PRODUCTS.map(({ id, ...rest }) => ({ _id: id, ...rest })));
  }
}

/** Mongo 문서의 _id를 id로 바꿔 화면에서 쓰기 쉽게 */
export function withId<T extends { _id: unknown }>(doc: T): Omit<T, "_id"> & { id: string } {
  const { _id, ...rest } = doc;
  return { ...rest, id: String(_id) };
}

export const newId = () => crypto.randomUUID();
