-- 올웨이즈 펫 데이터베이스 스키마
-- Supabase 대시보드 > SQL Editor에 통째로 붙여 넣고 Run 하세요. 여러 번 실행해도 안전합니다.

-- ───────── 회원 프로필 ─────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  phone text not null default '',
  zipcode text not null default '',
  address text not null default '',
  address_detail text not null default '',
  is_admin boolean not null default false,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);

-- 가입하면 프로필 자동 생성
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- 일반 회원이 스스로 관리자 권한을 켜지 못하게 막기
create or replace function public.protect_admin_flag() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid()가 없으면 SQL Editor나 서버(시크릿 키)에서 실행한 것
  if new.is_admin is distinct from old.is_admin and auth.uid() is not null and not public.is_admin() then
    new.is_admin := old.is_admin;
  end if;
  return new;
end $$;
drop trigger if exists profiles_protect_admin on public.profiles;
create trigger profiles_protect_admin before update on public.profiles
  for each row execute function public.protect_admin_flag();

-- ───────── 상품 ─────────
create table if not exists public.products (
  id text primary key,
  category text not null check (category in ('box','treat','living')),
  name text not null,
  image text not null,
  price integer not null check (price >= 0),
  trial_price integer,
  subscribable boolean not null default false,
  description text not null default '',
  spec jsonb not null default '{}'::jsonb,
  concerns text[] not null default '{}',
  main_ingredients text[] not null default '{}',
  why jsonb not null default '{}'::jsonb,
  stock integer not null default 100,
  active boolean not null default true,
  sort integer not null default 0
);

-- ───────── 반려동물 ─────────
create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  species text not null default 'dog' check (species in ('dog','cat')),
  breed text not null default '',
  age_group text not null default '10세 이상',
  weight_group text not null default '5kg 미만',
  concerns text[] not null default '{}',
  current_ingredients text[] not null default '{}',
  meds text not null default '',
  created_at timestamptz not null default now()
);

-- ───────── 장바구니 ─────────
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.products(id),
  mode text not null check (mode in ('once','trial','sub')),
  cycle_weeks integer not null default 0,
  plan text not null default '',
  pet_id uuid references public.pets(id) on delete set null,
  qty integer not null default 1 check (qty between 1 and 99),
  created_at timestamptz not null default now(),
  unique (user_id, product_id, mode, cycle_weeks, plan)
);

-- ───────── 주문 ─────────
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','paid','preparing','shipped','delivered','cancelled')),
  order_name text not null,
  items_total integer not null,
  shipping_fee integer not null,
  total integer not null,
  recipient text not null,
  phone text not null,
  zipcode text not null default '',
  address text not null,
  address_detail text not null default '',
  delivery_memo text not null default '',
  payment_key text,
  payment_method text,
  receipt_url text,
  tracking_no text not null default '',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(id),
  name text not null,
  image text not null,
  unit_price integer not null,
  qty integer not null,
  mode text not null,
  cycle_weeks integer not null default 0,
  plan text not null default '',
  pet_id uuid references public.pets(id) on delete set null
);

-- ───────── 정기배송(구독) ─────────
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  product_id text not null references public.products(id),
  order_id uuid references public.orders(id) on delete set null,
  name text not null,
  image text not null,
  plan text not null default '',
  price integer not null,
  qty integer not null default 1,
  cycle_weeks integer not null default 4,
  next_date date not null,
  remain integer not null default 100,
  status text not null default 'active' check (status in ('active','paused','cancelled','farewell')),
  paused_until date,
  created_at timestamptz not null default now()
);

-- ───────── 건강 기록 ─────────
create table if not exists public.health_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  log_date date not null,
  meal integer not null check (meal between 0 and 2),
  walk text not null,
  poop text not null,
  water text,
  memo text not null default '',
  created_at timestamptz not null default now(),
  unique (pet_id, log_date)
);

create index if not exists orders_user_idx on public.orders(user_id, created_at desc);
create index if not exists logs_pet_idx on public.health_logs(pet_id, log_date desc);
create index if not exists subs_user_idx on public.subscriptions(user_id);

-- ───────── 접근 권한 (RLS) ─────────
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.pets enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.subscriptions enable row level security;
alter table public.health_logs enable row level security;

do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 프로필: 본인 조회·수정, 관리자 조회
create policy profiles_self_read on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- 상품: 누구나 판매중 상품 조회, 관리자만 수정
create policy products_read on public.products for select using (active or public.is_admin());
create policy products_admin_write on public.products for all using (public.is_admin()) with check (public.is_admin());

-- 반려동물·장바구니·건강기록: 본인 것만
create policy pets_own on public.pets for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy pets_admin_read on public.pets for select using (public.is_admin());
create policy cart_own on public.cart_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy logs_own on public.health_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 주문: 본인 조회, 결제 전(pending) 주문만 본인이 생성. 결제 확정·배송 상태는 서버(시크릿 키)·관리자만 변경
create policy orders_own_read on public.orders for select using (user_id = auth.uid() or public.is_admin());
create policy orders_own_insert on public.orders for insert with check (user_id = auth.uid() and status = 'pending' and payment_key is null);
create policy orders_admin_update on public.orders for update using (public.is_admin()) with check (public.is_admin());

create policy order_items_read on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));
create policy order_items_insert on public.order_items for insert with check (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid() and o.status = 'pending'));

-- 구독: 본인 조회·변경(배송일, 일시정지, 해지), 관리자 조회·변경. 생성은 결제 확정 시 서버에서
create policy subs_own_read on public.subscriptions for select using (user_id = auth.uid() or public.is_admin());
create policy subs_own_update on public.subscriptions for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- 구독 금액·상품은 회원이 바꾸지 못하게
create or replace function public.protect_subscription() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.price := old.price; new.product_id := old.product_id; new.user_id := old.user_id;
    new.order_id := old.order_id; new.qty := old.qty; new.name := old.name;
  end if;
  return new;
end $$;
drop trigger if exists subs_protect on public.subscriptions;
create trigger subs_protect before update on public.subscriptions
  for each row execute function public.protect_subscription();

-- ───────── 상품 초기 데이터 ─────────
insert into public.products (id, category, name, image, price, trial_price, subscribable, description, spec, concerns, main_ingredients, why, sort) values
('carebox','box','시니어 맞춤 케어 박스','box.jpg',29900,null,true,
 '아이의 나이·체중·관심사에 맞춰 간식, 영양 보조 제품, 케어 안내서를 매달 구성해 보내드려요.',
 '{}', '{joint,appetite,digest,skin}', '{}',
 '{"joint":"관절 케어 구성 선택 가능","appetite":"기호성 높은 소포장 간식 포함","digest":"소화가 편한 간식으로 구성","skin":"저자극 위생용품 포함 (프리미엄)"}', 0),
('jerky','treat','닭가슴살 육포','treats.jpg',8900,3900,true,
 '얇게 펴서 말려 이가 약한 아이도 잘게 찢어 먹일 수 있어요. 국내산 닭가슴살 단일 원료.',
 '{"주원료":"닭가슴살 100%","중량":"80g","급여":"체중 5kg 기준 하루 2~3조각","식감":"얇고 부드러움"}',
 '{appetite}', '{닭고기}', '{"appetite":"단일 원료라 기호 확인이 쉬워요"}', 1),
('salmon','treat','연어 스틱','treats.jpg',9900,3900,true,
 '연어를 부드러운 스틱으로 만들었어요. 손으로 쉽게 잘라 양 조절이 편해요.',
 '{"주원료":"연어 92%, 고구마 전분","중량":"70g","급여":"체중 5kg 기준 하루 1~2개","식감":"말랑함"}',
 '{appetite,skin}', '{연어}', '{"appetite":"향이 강해 식욕이 떨어진 아이에게 시도해 보기 좋아요","skin":"오메가-3 함유 원료(연어)"}', 2),
('potato','treat','고구마 큐브','treats.jpg',7900,2900,true,
 '한입 크기 큐브로 쪄서 말렸어요. 식이섬유가 들어 있는 곡물 대체 간식이에요.',
 '{"주원료":"국내산 고구마 100%","중량":"100g","급여":"체중 5kg 기준 하루 3~4개","식감":"쫀득함"}',
 '{digest}', '{고구마}', '{"digest":"식이섬유가 있는 단일 원료 간식"}', 3),
('mat','living','미끄럼 방지 매트','mat.jpg',39000,null,false,
 '마루 위에서 다리가 벌어지지 않도록 잡아주는 쿠션 매트예요. 물세탁 가능.',
 '{"크기":"120×90cm","두께":"8mm","소재":"폴리에스터, 논슬립 TPR","세탁":"30℃ 이하 물세탁"}',
 '{slip,joint}', '{}', '{"slip":"미끄러운 바닥에서 보행을 도와요","joint":"관절에 가는 충격을 줄여요"}', 4),
('bed','living','도넛 쿠션 침대','bed.jpg',49000,null,false,
 '테두리가 낮아 노령견·노령묘도 쉽게 드나들어요. 커버 분리 세탁.',
 '{"크기":"지름 70cm","입구 높이":"9cm","소재":"부클레 원단, 극세사","세탁":"커버 분리 세탁"}',
 '{joint,slip}', '{}', '{"joint":"입구가 낮아 관절 부담이 적어요","slip":"바닥 미끄럼 방지 처리"}', 5),
('brush','living','부드러운 핀 브러시','brush.jpg',15000,null,false,
 '끝이 둥근 핀이라 얇아진 피부에도 자극이 적어요.',
 '{"크기":"21×10cm","핀":"끝 둥근 스테인리스","손잡이":"미끄럼 방지 실리콘"}',
 '{skin}', '{}', '{"skin":"피부 자극이 적은 둥근 핀"}', 6),
('shampoo','living','마일드 저자극 샴푸','shampoo.jpg',16900,null,true,
 '향을 줄인 약산성 샴푸예요. 노령 동물의 건조한 피부를 고려했어요.',
 '{"용량":"1,000ml","pH":"약산성","향":"무향에 가까운 저향"}',
 '{skin}', '{}', '{"skin":"약산성·저향 처방"}', 7),
('harness','living','보행 보조 하네스','harness.jpg',32000,null,false,
 '등 손잡이로 계단이나 차에 오를 때 몸을 살짝 받쳐줄 수 있어요.',
 '{"사이즈":"S / M / L","소재":"에어메쉬, 나일론 웨빙","특징":"등 손잡이, 2점 조절"}',
 '{joint}', '{}', '{"joint":"계단·차량 승하차를 보조해요"}', 8)
on conflict (id) do update set
  category = excluded.category, name = excluded.name, image = excluded.image, price = excluded.price,
  trial_price = excluded.trial_price, subscribable = excluded.subscribable, description = excluded.description,
  spec = excluded.spec, concerns = excluded.concerns, main_ingredients = excluded.main_ingredients,
  why = excluded.why, sort = excluded.sort;
