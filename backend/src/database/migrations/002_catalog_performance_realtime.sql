create extension if not exists pg_trgm;

create index if not exists product_cache_name_trgm_idx
  on public.product_cache using gin (name gin_trgm_ops);

create index if not exists product_cache_sku_trgm_idx
  on public.product_cache using gin (sku gin_trgm_ops);

create index if not exists product_cache_ean_trgm_idx
  on public.product_cache using gin (ean gin_trgm_ops);

create index if not exists product_cache_status_synced_at_idx
  on public.product_cache (status, synced_at desc);

create index if not exists product_cache_status_stock_idx
  on public.product_cache (status, stock_quantity);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'product_cache'
     ) then
    alter publication supabase_realtime add table public.product_cache;
  end if;
end $$;
