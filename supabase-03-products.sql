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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists product_cache_set_updated_at on public.product_cache;
create trigger product_cache_set_updated_at
before update on public.product_cache
for each row execute function public.set_updated_at();

alter table public.product_cache enable row level security;
alter table public.product_sync_runs enable row level security;
alter table public.product_stock_snapshots enable row level security;

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

create index if not exists product_cache_sku_idx on public.product_cache (sku);
create index if not exists product_cache_ean_idx on public.product_cache (ean);
create index if not exists product_cache_category_idx on public.product_cache (category);
create index if not exists product_cache_name_idx on public.product_cache (lower(name));
create index if not exists product_cache_synced_at_idx on public.product_cache (synced_at desc);
create index if not exists product_sync_runs_started_at_idx on public.product_sync_runs (started_at desc);
create index if not exists product_stock_snapshots_tiny_id_idx on public.product_stock_snapshots (tiny_id);
create index if not exists product_stock_snapshots_captured_at_idx on public.product_stock_snapshots (captured_at desc);

grant select, insert, update, delete on public.product_cache to authenticated;
grant select, insert, update on public.product_sync_runs to authenticated;
grant select, insert on public.product_stock_snapshots to authenticated;
