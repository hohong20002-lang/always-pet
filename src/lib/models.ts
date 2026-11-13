import "server-only";
import { getDb } from "./db";
import type { Mode, Pet, Product } from "./shop";

export type ProductDoc = Omit<Product, "id"> & { _id: string };
export type PetDoc = Omit<Pet, "id"> & { _id: string; user_id: string; created_at: Date };
export type CartDoc = {
  _id: string;
  user_id: string;
  product_id: string;
  mode: Mode;
  cycle_weeks: number;
  plan: string;
  pet_id: string | null;
  qty: number;
  created_at: Date;
};
export type OrderItem = {
  product_id: string;
  name: string;
  image: string;
  unit_price: number;
  qty: number;
  mode: Mode;
  cycle_weeks: number;
  plan: string;
  pet_id: string | null;
};
export type OrderStatus = "pending" | "paid" | "preparing" | "shipped" | "delivered" | "cancelled";
export type OrderDoc = {
  _id: string;
  order_no: string;
  user_id: string;
  status: OrderStatus;
  order_name: string;
  items: OrderItem[];
  items_total: number;
  shipping_fee: number;
  total: number;
  recipient: string;
  phone: string;
  zipcode: string;
  address: string;
  address_detail: string;
  delivery_memo: string;
  payment_key: string | null;
  payment_method: string | null;
  receipt_url: string | null;
  tracking_no: string;
  paid_at: Date | null;
  created_at: Date;
};
export type SubStatus = "active" | "paused" | "cancelled" | "farewell";
export type SubDoc = {
  _id: string;
  user_id: string;
  pet_id: string | null;
  product_id: string;
  order_id: string;
  name: string;
  image: string;
  plan: string;
  price: number;
  qty: number;
  cycle_weeks: number;
  next_date: string;
  remain: number;
  status: SubStatus;
  paused_until: string | null;
  created_at: Date;
};
export type LogDoc = {
  _id: string;
  user_id: string;
  pet_id: string;
  log_date: string;
  meal: number;
  walk: string;
  poop: string;
  water: string | null;
  memo: string;
  created_at: Date;
};

/** 컬렉션 모음 */
export async function cols() {
  const db = await getDb();
  return {
    users: db.collection<{ _id: string; email: string; password_hash: string; name: string; phone: string; zipcode: string; address: string; address_detail: string; marketing_opt_in: boolean; created_at: Date }>("users"),
    products: db.collection<ProductDoc>("products"),
    pets: db.collection<PetDoc>("pets"),
    cart: db.collection<CartDoc>("cart_items"),
    orders: db.collection<OrderDoc>("orders"),
    subs: db.collection<SubDoc>("subscriptions"),
    logs: db.collection<LogDoc>("health_logs"),
  };
}
