-- MEGABAZA, часть 2: расширения. Выполнять ПОСЛЕ schema.sql.
create extension if not exists pg_net with schema extensions;

alter table public.products
  add column image_url text, add column description text not null default '', add column sku text not null default '',
  add column badge text, add column old_price numeric(12,0), add column stock int check (stock >= 0),
  add column wholesale_price numeric(12,0);
alter table public.profiles add column wholesale boolean not null default false;
alter table public.messages add column attachment_url text;
alter table public.orders alter column user_id drop not null;
alter table public.orders
  add column delivery text not null default 'delivery' check (delivery in ('delivery','pickup')),
  add column payment text not null default 'cash' check (payment in ('cash','card')),
  add column promo text not null default '', add column discount numeric(12,0) not null default 0,
  add column delivery_fee numeric(12,0) not null default 0, add column guest_name text not null default '',
  add column admin_note text not null default '';
revoke update on public.orders from authenticated; grant update (status, admin_note) on public.orders to authenticated;

create table public.reviews (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text not null default '' check (char_length(body) <= 1000),
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);
create table public.favorites (user_id uuid not null references public.profiles(id) on delete cascade, product_id bigint not null references public.products(id) on delete cascade, primary key (user_id, product_id));
create table public.stock_alerts (user_id uuid not null references public.profiles(id) on delete cascade, product_id bigint not null references public.products(id) on delete cascade, primary key (user_id, product_id));
create table public.garage (id bigint generated always as identity primary key, user_id uuid not null references public.profiles(id) on delete cascade, make text not null default '', model text not null check (char_length(model) between 1 and 80), year int, vin text not null default '');
create table public.promo_codes (code text primary key check (code = upper(code)), percent int not null check (percent between 1 and 90), min_total numeric(12,0) not null default 0, active boolean not null default true);
create table public.banners (id bigint generated always as identity primary key, title text not null, text text not null default '', link text not null default '', sort int not null default 0, active boolean not null default true);
create table public.settings (key text primary key, value text not null default '');
create table public.private_settings (key text primary key, value text not null default '');
create table public.quick_replies (id bigint generated always as identity primary key, text text not null check (char_length(text) between 1 and 500));
create table public.customer_notes (user_id uuid primary key references public.profiles(id) on delete cascade, note text not null default '');
create table public.audit_log (id bigint generated always as identity primary key, at timestamptz not null default now(), user_id uuid, table_name text, op text, row_id text, data jsonb);

alter table public.reviews enable row level security; alter table public.favorites enable row level security;
alter table public.stock_alerts enable row level security; alter table public.garage enable row level security;
alter table public.promo_codes enable row level security; alter table public.banners enable row level security;
alter table public.settings enable row level security; alter table public.private_settings enable row level security;
alter table public.quick_replies enable row level security; alter table public.customer_notes enable row level security;
alter table public.audit_log enable row level security;

create policy reviews_insert on public.reviews for insert with check (user_id = auth.uid());
create policy reviews_admin on public.reviews for all using (public.is_admin()) with check (public.is_admin());
create policy fav_own on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy alert_own on public.stock_alerts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy garage_own on public.garage for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy promo_admin on public.promo_codes for all using (public.is_admin()) with check (public.is_admin());
create policy banners_read on public.banners for select using (active or public.is_admin());
create policy banners_admin on public.banners for all using (public.is_admin()) with check (public.is_admin());
create policy settings_read on public.settings for select using (true);
create policy settings_admin on public.settings for all using (public.is_admin()) with check (public.is_admin());
create policy private_admin on public.private_settings for all using (public.is_admin()) with check (public.is_admin());
create policy qr_admin on public.quick_replies for all using (public.is_admin()) with check (public.is_admin());
create policy notes_admin on public.customer_notes for all using (public.is_admin()) with check (public.is_admin());
create policy audit_admin on public.audit_log for select using (public.is_admin());

-- Telegram-уведомления прямо из базы (токен и chat id хранятся в private_settings)
create or replace function public.tg_notify(txt text) returns void language plpgsql security definer set search_path = public, extensions as $$
declare tok text; chat text;
begin
  select value into tok from private_settings where key = 'tg_token';
  select value into chat from private_settings where key = 'tg_chat';
  if coalesce(tok,'') = '' or coalesce(chat,'') = '' then return; end if;
  begin perform net.http_post(url := 'https://api.telegram.org/bot' || tok || '/sendMessage', body := jsonb_build_object('chat_id', chat, 'text', left(txt, 3500)));
  exception when others then null; end;
end $$;
revoke all on function public.tg_notify from public, anon, authenticated;

create or replace function public.trg_msg_notify() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not new.from_admin then
    perform public.tg_notify('💬 ' || coalesce((select full_name from profiles where id = new.user_id), 'Клиент') || ': ' || new.body);
  end if;
  return new;
end $$;
create trigger msg_notify after insert on public.messages for each row execute function public.trg_msg_notify();

-- журнал действий админов
create or replace function public.trg_audit() returns trigger language plpgsql security definer set search_path = public as $$
declare j jsonb := to_jsonb(coalesce(new, old));
begin
  if public.is_admin() then
    insert into audit_log (user_id, table_name, op, row_id, data) values (auth.uid(), tg_table_name, tg_op, coalesce(j->>'id', j->>'code', j->>'key'), j);
  end if;
  return coalesce(new, old);
end $$;
create trigger audit_products after insert or update or delete on public.products for each row execute function public.trg_audit();
create trigger audit_orders after update on public.orders for each row execute function public.trg_audit();
create trigger audit_promo after insert or update or delete on public.promo_codes for each row execute function public.trg_audit();
create trigger audit_settings after insert or update or delete on public.settings for each row execute function public.trg_audit();

-- «сообщить о поступлении»: когда товар снова в наличии, клиенту приходит сообщение в чат
create or replace function public.trg_restock() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.in_stock and not old.in_stock then
    insert into messages (user_id, from_admin, body) select user_id, true, 'Товар «' || new.name || '» снова в наличии!' from stock_alerts where product_id = new.id;
    delete from stock_alerts where product_id = new.id;
  end if;
  return new;
end $$;
create trigger products_restock after update of in_stock on public.products for each row execute function public.trg_restock();

-- проверка промокода
create or replace function public.check_promo(p_code text, p_total numeric) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select percent from promo_codes where code = upper(trim(p_code)) and active and min_total <= p_total), 0);
$$;

-- оформление заказа (гость или клиент), скидка, доставка, склад, оптовые цены
drop function if exists public.place_order(jsonb, text, text, text);
create or replace function public.place_order(items jsonb, p_phone text, p_address text, p_comment text default '',
  p_delivery text default 'delivery', p_payment text default 'cash', p_promo text default '', p_name text default '')
returns bigint language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); oid bigint; sub numeric := 0; it jsonb; prod public.products; q int; price numeric;
        pct int := 0; disc numeric := 0; fee numeric := 0; wh boolean; lines text := ''; fee_s numeric; free_s numeric;
begin
  if uid is null and char_length(coalesce(p_name,'')) < 2 then raise exception 'name required'; end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 or jsonb_array_length(items) > 100 then raise exception 'bad items'; end if;
  if char_length(coalesce(p_phone,'')) < 7 then raise exception 'phone required'; end if;
  if p_delivery not in ('delivery','pickup') or p_payment not in ('cash','card') then raise exception 'bad options'; end if;
  if p_delivery = 'delivery' and char_length(coalesce(p_address,'')) < 2 then raise exception 'address required'; end if;
  wh := coalesce((select wholesale from profiles where id = uid), false);
  insert into orders (user_id, total, phone, address, comment, delivery, payment, guest_name)
    values (uid, 0, left(p_phone,40), left(coalesce(p_address,''),300), left(coalesce(p_comment,''),500), p_delivery, p_payment, left(coalesce(p_name,''),80))
    returning id into oid;
  for it in select * from jsonb_array_elements(items) loop
    q := (it->>'qty')::int;
    select * into prod from products where id = (it->>'id')::bigint and active and in_stock for update;
    if not found or q < 1 or q > 99 or (prod.stock is not null and prod.stock < q) then raise exception 'product unavailable'; end if;
    price := case when wh and prod.wholesale_price is not null then prod.wholesale_price else prod.price end;
    insert into order_items (order_id, product_id, name, price, qty) values (oid, prod.id, prod.name, price, q);
    if prod.stock is not null then update products set stock = stock - q, in_stock = (stock - q) > 0 where id = prod.id; end if;
    sub := sub + price * q; lines := lines || E'\n• ' || prod.name || ' × ' || q;
  end loop;
  if coalesce(p_promo,'') <> '' then
    pct := public.check_promo(p_promo, sub);
    if pct = 0 then raise exception 'bad promo'; end if;
    disc := round(sub * pct / 100);
  end if;
  if p_delivery = 'delivery' then
    fee_s := coalesce((select nullif(value,'')::numeric from settings where key = 'delivery_fee'), 0);
    free_s := coalesce((select nullif(value,'')::numeric from settings where key = 'free_delivery_from'), 0);
    if free_s = 0 or sub - disc < free_s then fee := fee_s; end if;
  end if;
  update orders set total = sub - disc + fee, discount = disc, delivery_fee = fee, promo = upper(coalesce(p_promo,'')) where id = oid;
  perform public.tg_notify('🆕 Заказ №' || oid || ' на ' || (sub - disc + fee) || ' сум' || E'\n👤 ' || coalesce(nullif(p_name,''), (select full_name from profiles where id = uid), '') || E'\n📞 ' || p_phone ||
        E'\n' || case p_delivery when 'pickup' then 'Самовывоз' else '📍 ' || p_address end || lines);
  return oid;
end $$;

create or replace function public.product_reviews(pid bigint) returns table (rating int, body text, created_at timestamptz, author text)
language sql stable security definer set search_path = public as $$
  select r.rating, r.body, r.created_at, split_part(p.full_name, ' ', 1) from reviews r join profiles p on p.id = r.user_id where r.product_id = pid order by r.id desc limit 100;
$$;

create or replace function public.admin_stats() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then return null; end if;
  return jsonb_build_object(
    'today_orders', (select count(*) from orders where created_at >= date_trunc('day', now())),
    'today_revenue', (select coalesce(sum(total),0) from orders where created_at >= date_trunc('day', now()) and status <> 'cancelled'),
    'week_revenue', (select coalesce(sum(total),0) from orders where created_at >= now() - interval '7 days' and status <> 'cancelled'),
    'new_orders', (select count(*) from orders where status = 'new'),
    'customers', (select count(*) from profiles where role = 'customer'),
    'unread', (select count(*) from messages where not from_admin and read_at is null),
    'series', (select coalesce(jsonb_agg(jsonb_build_object('d', d::date, 'n', n, 'sum', s) order by d), '[]') from (
       select g as d, (select count(*) from orders o where o.created_at::date = g::date) n,
              (select coalesce(sum(total),0) from orders o where o.created_at::date = g::date and o.status <> 'cancelled') s
       from generate_series(now() - interval '6 days', now(), interval '1 day') g) t),
    'top', (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'qty', q)), '[]') from (
       select name, sum(qty) q from order_items group by name order by q desc limit 5) t));
end $$;

create or replace function public.admin_customers() returns table (id uuid, full_name text, phone text, wholesale boolean, orders bigint, spent numeric, last_order timestamptz, note text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.phone, p.wholesale, count(o.id), coalesce(sum(o.total) filter (where o.status <> 'cancelled'), 0), max(o.created_at), coalesce(n.note, '')
  from profiles p left join orders o on o.user_id = p.id left join customer_notes n on n.user_id = p.id
  where public.is_admin() and p.role = 'customer' group by p.id, n.note order by max(o.created_at) desc nulls last;
$$;

create or replace function public.admin_set_wholesale(uid uuid, v boolean) returns void language plpgsql security definer set search_path = public as $$
begin if public.is_admin() then update profiles set wholesale = v where id = uid; end if; end $$;

create or replace function public.admin_broadcast(p_text text) returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_admin() or char_length(coalesce(p_text,'')) not between 1 and 2000 then return 0; end if;
  insert into messages (user_id, from_admin, body) select id, true, p_text from profiles where role = 'customer';
  get diagnostics n = row_count; return n;
end $$;

revoke all on function public.place_order, public.check_promo, public.product_reviews, public.admin_stats, public.admin_customers, public.admin_set_wholesale, public.admin_broadcast from public, anon, authenticated;
grant execute on function public.place_order, public.check_promo, public.product_reviews to anon, authenticated;
grant execute on function public.admin_stats, public.admin_customers, public.admin_set_wholesale, public.admin_broadcast to authenticated;

-- хранилище картинок
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('products','products',true,5242880,array['image/jpeg','image/png','image/webp']),
  ('chat','chat',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy products_files_admin on storage.objects for all to authenticated using (bucket_id = 'products' and public.is_admin()) with check (bucket_id = 'products' and public.is_admin());
create policy chat_files_upload on storage.objects for insert to authenticated with check (bucket_id = 'chat' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

insert into public.settings (key, value) values
  ('phone','+998 90 000 00 00'),('address','Ташкент, Сергелийский район'),('hours_from','9'),('hours_to','19'),
  ('telegram','mega_baza_uz'),('whatsapp',''),('instagram',''),('delivery_fee','25000'),('free_delivery_from','500000'),('map_query','Sergeli, Tashkent');
insert into public.banners (title, text, sort) values ('Автозапчасти в наличии', 'Доставка по Ташкенту. Подберём деталь под ваш автомобиль.', 1);
insert into public.quick_replies (text) values ('Здравствуйте! Чем могу помочь?'), ('Уточните, пожалуйста, марку, модель и год автомобиля.'), ('Товар в наличии, можно оформить заказ на сайте.');
alter publication supabase_realtime add table public.reviews;
