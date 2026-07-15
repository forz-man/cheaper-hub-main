-- ── Product import columns ────────────────────────────────────────────────────
-- Run this in Supabase SQL Editor to enable the store-import feature.
-- Safe to re-run: all statements use IF NOT EXISTS / DROP IF EXISTS guards.

-- 1. New columns on products for tracking imported items
alter table public.products
  add column if not exists external_id text,
  add column if not exists source_platform text,
  add column if not exists source_url text;

-- 2. Unique index used by sync upsert to deduplicate re-imports
create unique index if not exists products_vendor_external_platform_idx
  on public.products (vendor_id, external_id, source_platform)
  where external_id is not null and source_platform is not null;

-- 3. Store connections table (creates only if it doesn't exist yet)
create table if not exists public.store_connections (
  id             uuid default gen_random_uuid() primary key,
  vendor_id      uuid references auth.users(id) on delete cascade not null,
  platform       text not null,
  store_url      text not null,
  credentials    jsonb not null default '{}',
  status         text not null default 'pending'
                   check (status in ('pending','connected','error','syncing')),
  error_message  text,
  last_synced_at timestamptz,
  product_count  int default 0,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique(vendor_id, platform, store_url)
);

-- 4. Update the platform constraint to include all 10 supported platforms.
--    Drop the old constraint first (handles both the auto-named and named versions).
alter table public.store_connections
  drop constraint if exists store_connections_platform_check;

alter table public.store_connections
  add constraint store_connections_platform_check
  check (platform in (
    'shopify','woocommerce','wix','wordpress',
    'etsy','squarespace','bigcommerce','prestashop','magento2','ecwid'
  ));

-- 5. RLS for store_connections (drop first so re-runs don't error)
alter table public.store_connections enable row level security;

drop policy if exists "Vendor owns their connections" on public.store_connections;
create policy "Vendor owns their connections"
  on public.store_connections for all
  using (auth.uid() = vendor_id)
  with check (auth.uid() = vendor_id);
