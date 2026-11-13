import "server-only";
import { createClient, isConfigured } from "@/lib/supabase/server";
import type { Pet, Product } from "@/lib/shop";

export async function getProducts(): Promise<Product[]> {
  if (!isConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("*").eq("active", true).order("sort");
  return (data ?? []) as Product[];
}

export async function getProduct(id: string): Promise<Product | null> {
  if (!isConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  return (data as Product) ?? null;
}

export async function getPets(): Promise<Pet[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("pets").select("*").order("created_at");
  return (data ?? []) as Pet[];
}
