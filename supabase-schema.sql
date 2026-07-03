create extension if not exists "pgcrypto";

do $$
begin
  create type public.user_role as enum ('owner', 'admin', 'manager', 'operator', 'viewer');
exception when duplicate_object then null;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'user_role'
      and e.enumlabel = 'owner'
  ) then
    alter type public.user_role add value 'owner' before 'admin';
  end if;
end $$;

do $$
begin
  create type public.user_status as enum ('active', 'inactive');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.audit_result as enum ('success', 'failure');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.favorite_resource as enum ('dashboard', 'product', 'order', 'alert', 'report');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role public.user_role not null default 'operator',
  status public.user_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  preferences jsonb not null default '{"theme":"system","lowStockThreshold":10,"favoritePages":["/dashboard","/alerts"]}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  resource_type public.favorite_resource not null,
  resource_id text not null,
  label text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, resource_type, resource_id)
);

create table if not exists public.internal_product_notes (
  product_id text primary key,
  notes text,
  minimum_stock integer check (minimum_stock is null or minimum_stock >= 0),
  tags text[] not null default '{}',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.product_cache (
  tiny_id text primary key,
  sku text,
  name text not null,
  category text,
  ean text,
  status text,
  unit text,
  brand text,
  price numeric(14,2),
  promotional_price numeric(14,2),
  cost_price numeric(14,2),
  stock_quantity numeric(14,3),
  reserved_stock numeric(14,3),
  minimum_stock numeric(14,3),
  maximum_stock numeric(14,3),
  weight_net_kg numeric(12,4),
  weight_gross_kg numeric(12,4),
  width_cm numeric(12,3),
  height_cm numeric(12,3),
  length_cm numeric(12,3),
  image_url text,
  raw_payload jsonb not null default '{}'::jsonb,
  stock_payload jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'finished', 'failed')),
  total_pages integer,
  total_products integer not null default 0 check (total_products >= 0),
  processed_products integer not null default 0 check (processed_products >= 0),
  error_message text,
  created_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.product_stock_snapshots (
  id uuid primary key default gen_random_uuid(),
  tiny_id text not null references public.product_cache(tiny_id) on delete cascade,
  stock_quantity numeric(14,3),
  reserved_stock numeric(14,3),
  payload jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  user_email text not null,
  ip_address inet,
  action text not null,
  description text not null,
  product_id text,
  order_id text,
  result public.audit_result not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('debug', 'info', 'warn', 'error')),
  source text not null,
  message text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists preferences_set_updated_at on public.user_preferences;
create trigger preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

drop trigger if exists product_notes_set_updated_at on public.internal_product_notes;
create trigger product_notes_set_updated_at
before update on public.internal_product_notes
for each row execute function public.set_updated_at();

drop trigger if exists product_cache_set_updated_at on public.product_cache;
create trigger product_cache_set_updated_at
before update on public.product_cache
for each row execute function public.set_updated_at();

drop trigger if exists settings_set_updated_at on public.system_settings;
create trigger settings_set_updated_at
before update on public.system_settings
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, status)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.email, 'Usuário Belaways'),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'operator'),
    'active'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        updated_at = now();

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
exception
  when invalid_text_representation then
    insert into public.profiles (id, email, full_name, role, status)
    values (
      new.id,
      coalesce(new.email, ''),
      coalesce(new.raw_user_meta_data->>'full_name', new.email, 'Usuário Belaways'),
      'operator',
      'active'
    )
    on conflict (id) do nothing;

    insert into public.user_preferences (user_id)
    values (new.id)
    on conflict (user_id) do nothing;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_user_role()
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role
  from public.profiles
  where id = auth.uid()
        and status = 'active'
  limit 1;
$$;

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.favorites enable row level security;
alter table public.internal_product_notes enable row level security;
alter table public.product_cache enable row level security;
alter table public.product_sync_runs enable row level security;
alter table public.product_stock_snapshots enable row level security;
alter table public.audit_logs enable row level security;
alter table public.system_logs enable row level security;
alter table public.system_settings enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
to authenticated
using (auth.uid() = id or public.current_user_role() in ('owner', 'admin', 'manager'));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "preferences_manage_own" on public.user_preferences;
create policy "preferences_manage_own"
on public.user_preferences for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "favorites_manage_own" on public.favorites;
create policy "favorites_manage_own"
on public.favorites for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "product_notes_read_authenticated" on public.internal_product_notes;
create policy "product_notes_read_authenticated"
on public.internal_product_notes for select
to authenticated
using (true);

drop policy if exists "product_notes_write_managers" on public.internal_product_notes;
create policy "product_notes_write_managers"
on public.internal_product_notes for all
to authenticated
using (public.current_user_role() in ('owner', 'admin', 'manager'))
with check (public.current_user_role() in ('owner', 'admin', 'manager'));

drop policy if exists "product_cache_read_authenticated" on public.product_cache;
create policy "product_cache_read_authenticated"
on public.product_cache for select
to authenticated
using (true);

drop policy if exists "product_cache_write_managers" on public.product_cache;
create policy "product_cache_write_managers"
on public.product_cache for all
to authenticated
using (public.current_user_role() in ('owner', 'admin', 'manager'))
with check (public.current_user_role() in ('owner', 'admin', 'manager'));

drop policy if exists "product_sync_runs_read_authenticated" on public.product_sync_runs;
create policy "product_sync_runs_read_authenticated"
on public.product_sync_runs for select
to authenticated
using (true);

drop policy if exists "product_sync_runs_write_managers" on public.product_sync_runs;
create policy "product_sync_runs_write_managers"
on public.product_sync_runs for all
to authenticated
using (public.current_user_role() in ('owner', 'admin', 'manager'))
with check (public.current_user_role() in ('owner', 'admin', 'manager'));

drop policy if exists "product_stock_snapshots_read_authenticated" on public.product_stock_snapshots;
create policy "product_stock_snapshots_read_authenticated"
on public.product_stock_snapshots for select
to authenticated
using (true);

drop policy if exists "product_stock_snapshots_write_managers" on public.product_stock_snapshots;
create policy "product_stock_snapshots_write_managers"
on public.product_stock_snapshots for insert
to authenticated
with check (public.current_user_role() in ('owner', 'admin', 'manager'));

drop policy if exists "audit_read_managers" on public.audit_logs;
create policy "audit_read_managers"
on public.audit_logs for select
to authenticated
using (public.current_user_role() in ('owner', 'admin', 'manager'));

drop policy if exists "audit_insert_authenticated" on public.audit_logs;
create policy "audit_insert_authenticated"
on public.audit_logs for insert
to authenticated
with check (auth.uid() = user_id or public.current_user_role() in ('owner', 'admin', 'manager'));

drop policy if exists "system_logs_read_admin" on public.system_logs;
create policy "system_logs_read_admin"
on public.system_logs for select
to authenticated
using (public.current_user_role() in ('owner', 'admin'));

drop policy if exists "settings_read_managers" on public.system_settings;
create policy "settings_read_managers"
on public.system_settings for select
to authenticated
using (public.current_user_role() in ('owner', 'admin', 'manager'));

drop policy if exists "settings_write_admin" on public.system_settings;
create policy "settings_write_admin"
on public.system_settings for all
to authenticated
using (public.current_user_role() = 'owner')
with check (public.current_user_role() = 'owner');

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_user_id_idx on public.audit_logs (user_id);
create index if not exists audit_logs_product_id_idx on public.audit_logs (product_id);
create index if not exists audit_logs_order_id_idx on public.audit_logs (order_id);
create index if not exists favorites_user_id_idx on public.favorites (user_id);
create index if not exists system_logs_created_at_idx on public.system_logs (created_at desc);
create index if not exists product_cache_sku_idx on public.product_cache (sku);
create index if not exists product_cache_ean_idx on public.product_cache (ean);
create index if not exists product_cache_category_idx on public.product_cache (category);
create index if not exists product_cache_name_idx on public.product_cache (lower(name));
create index if not exists product_cache_synced_at_idx on public.product_cache (synced_at desc);
create index if not exists product_sync_runs_started_at_idx on public.product_sync_runs (started_at desc);
create index if not exists product_stock_snapshots_tiny_id_idx on public.product_stock_snapshots (tiny_id);
create index if not exists product_stock_snapshots_captured_at_idx on public.product_stock_snapshots (captured_at desc);

insert into public.system_settings (key, value)
values
  ('tiny_sync', '{"enabled":true,"timeoutMs":15000,"maxRetries":3}'::jsonb),
  ('alerts', '{"lowStockEnabled":true,"missingEanEnabled":true,"delayedOrdersEnabled":true}'::jsonb)
on conflict (key) do nothing;

insert into public.profiles (id, email, full_name, role, status)
select id, email, 'Dono Belaways', 'owner', 'active'
from auth.users
where lower(email) = lower('rls50@me.com')
on conflict (id) do update
set email = excluded.email,
    full_name = excluded.full_name,
    role = 'owner',
    status = 'active',
    updated_at = now();

insert into public.user_preferences (user_id)
select id
from auth.users
where lower(email) = lower('rls50@me.com')
on conflict (user_id) do nothing;

grant usage on schema public to authenticated;

revoke all on all tables in schema public from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

grant select, insert, update, delete on public.user_preferences to authenticated;
grant select, insert, update, delete on public.favorites to authenticated;
grant select, insert, update, delete on public.internal_product_notes to authenticated;
grant select, insert, update, delete on public.product_cache to authenticated;
grant select, insert, update on public.product_sync_runs to authenticated;
grant select, insert on public.product_stock_snapshots to authenticated;
grant select, insert on public.audit_logs to authenticated;
grant select on public.system_logs to authenticated;
grant select, insert, update, delete on public.system_settings to authenticated;

grant execute on function public.current_user_role() to authenticated;
