-- MEGABAZA: схема базы (Supabase / Postgres). Выполнить целиком в SQL Editor.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- профиль создаётся автоматически при регистрации
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), coalesce(new.raw_user_meta_data->>'phone',''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.categories (
  id text primary key,
  name text not null,
  sort int not null default 0
);

create table public.products (
  id bigint generated always as identity primary key,
  category text references public.categories(id),
  name text not null check (char_length(name) between 1 and 200),
  car text not null default '',
  brand text not null default '',
  price numeric(12,0) not null check (price >= 0),
  in_stock boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.orders (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'new' check (status in ('new','processing','done','cancelled')),
  total numeric(12,0) not null,
  phone text not null,
  address text not null,
  comment text not null default '',
  created_at timestamptz not null default now()
);
create index on public.orders (user_id, created_at desc);
create index on public.orders (status, created_at desc);

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  product_id bigint references public.products(id) on delete set null,
  name text not null,
  price numeric(12,0) not null,
  qty int not null check (qty between 1 and 99)
);
create index on public.order_items (order_id);

-- чат: одна переписка на клиента (thread = user_id клиента)
create table public.messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  from_admin boolean not null default false,
  body text not null check (char_length(body) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.messages (user_id, id);

-- ===== права доступа (RLS) =====
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.messages enable row level security;

create policy profiles_select on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
-- менять роль себе нельзя: разрешаем обновлять только эти колонки
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

create policy categories_read on public.categories for select using (true);
create policy categories_admin on public.categories for all using (public.is_admin()) with check (public.is_admin());

create policy products_read on public.products for select using (active or public.is_admin());
create policy products_admin on public.products for all using (public.is_admin()) with check (public.is_admin());

create policy orders_select on public.orders for select using (user_id = auth.uid() or public.is_admin());
create policy orders_admin_update on public.orders for update using (public.is_admin()) with check (public.is_admin());
revoke update on public.orders from anon, authenticated;
grant update (status) on public.orders to authenticated;

create policy items_select on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));

create policy messages_select on public.messages for select using (user_id = auth.uid() or public.is_admin());
create policy messages_insert on public.messages for insert with check (
  (user_id = auth.uid() and from_admin = false) or (public.is_admin() and from_admin = true));

-- ===== функции =====
-- заказ: цены берутся из базы, а не от клиента
create or replace function public.place_order(items jsonb, p_phone text, p_address text, p_comment text default '')
returns bigint language plpgsql security definer set search_path = public as $$
declare oid bigint; v_total numeric := 0; it jsonb; prod public.products; q int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 or jsonb_array_length(items) > 100 then
    raise exception 'bad items'; end if;
  if char_length(coalesce(p_phone,'')) < 7 or char_length(coalesce(p_address,'')) < 2 then
    raise exception 'phone and address required'; end if;
  insert into orders (user_id, total, phone, address, comment)
    values (auth.uid(), 0, left(p_phone,40), left(p_address,300), left(coalesce(p_comment,''),500)) returning id into oid;
  for it in select * from jsonb_array_elements(items) loop
    q := (it->>'qty')::int;
    select * into prod from products where id = (it->>'id')::bigint and active and in_stock;
    if not found or q < 1 or q > 99 then raise exception 'product unavailable'; end if;
    insert into order_items (order_id, product_id, name, price, qty) values (oid, prod.id, prod.name, prod.price, q);
    v_total := v_total + prod.price * q;
  end loop;
  update orders set total = v_total where id = oid;
  return oid;
end $$;

create or replace function public.mark_read(thread uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then
    update messages set read_at = now() where user_id = thread and not from_admin and read_at is null;
  elsif auth.uid() = thread then
    update messages set read_at = now() where user_id = thread and from_admin and read_at is null;
  end if;
end $$;

-- список переписок для админа (один быстрый запрос)
create or replace function public.admin_threads()
returns table (user_id uuid, full_name text, phone text, last_body text, last_at timestamptz, last_from_admin boolean, unread bigint)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.full_name, p.phone, m.body, m.created_at, m.from_admin,
         (select count(*) from messages x where x.user_id = m.user_id and not x.from_admin and x.read_at is null)
  from (select distinct on (user_id) * from messages order by user_id, id desc) m
  join profiles p on p.id = m.user_id
  where public.is_admin()
  order by m.created_at desc;
$$;

revoke all on function public.place_order, public.mark_read, public.admin_threads from public, anon;
grant execute on function public.place_order, public.mark_read, public.admin_threads to authenticated;

-- realtime
alter publication supabase_realtime add table public.messages, public.orders;

-- ===== начальные данные (образцы) =====
insert into public.categories (id, name, sort) values
 ('tires_car','Легковые шины',1),
 ('tires_lt','Микроавтобус и пикап',2),
 ('tires_truck','Грузовые шины',3),
 ('tires_suv','Внедорожные шины',4),
 ('accessories','Камеры, вентили, грузики',5);
insert into public.products (category, name, car, brand, price) values
 ('tires_car','Шина 175/70 R13 летняя','Chevrolet Matiz / Damas','',390000),
 ('tires_car','Шина 185/65 R15 летняя','Chevrolet Nexia 3 / Cobalt','',520000),
 ('tires_car','Шина 195/65 R15 всесезонная','Chevrolet Cobalt / Gentra','',560000),
 ('tires_car','Шина 205/55 R16 летняя','Chevrolet Lacetti / Gentra','',640000),
 ('tires_car','Шина 215/60 R16 летняя','Chevrolet Malibu','',720000),
 ('tires_car','Шина 225/45 R17 летняя','Chevrolet Malibu / седаны','',810000),
 ('tires_car','Шина 185/65 R15 зимняя','Chevrolet Nexia 3 / Cobalt','',580000),
 ('tires_lt','Шина 195/75 R16C всесезонная','Микроавтобусы','',720000),
 ('tires_lt','Шина 215/75 R16C усиленная','Фургоны, пикапы','',860000),
 ('tires_lt','Шина 235/65 R16C усиленная','Микроавтобусы, грузовые фургоны','',990000),
 ('tires_truck','Шина 295/80 R22.5 рулевая','Грузовики, тягачи','',3100000),
 ('tires_truck','Шина 315/80 R22.5 ведущая','Грузовики, тягачи','',3400000),
 ('tires_truck','Шина 11.00 R20 универсальная','Грузовики','',2600000),
 ('tires_truck','Шина 12.00 R20 универсальная','Грузовики, самосвалы','',3000000),
 ('tires_suv','Шина 235/65 R17 внедорожная','Кроссоверы / SUV','',980000),
 ('tires_suv','Шина 265/65 R17 всесезонная','Внедорожники','',1250000),
 ('accessories','Камера для шины R15','Легковые','',85000),
 ('accessories','Вентиль бескамерный (комплект 4 шт.)','Универсальный','',25000),
 ('accessories','Балансировочные грузики (упаковка)','Универсальные','',60000);

-- Сделать себя админом (после регистрации на сайте), подставьте email:
-- update public.profiles set role='admin' where id = (select id from auth.users where email='you@example.com');
