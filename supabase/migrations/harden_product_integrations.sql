-- Harden store-product integrations.
-- Run this in Supabase SQL Editor before deploying the matching application code.
-- This migration is additive and safe to re-run.

-- ── Secure connections and resumable sync state ─────────────────────────────
alter table public.store_connections
  add column if not exists credentials_ciphertext text,
  add column if not exists disconnected_at timestamptz,
  add column if not exists last_sync_job_id uuid;

-- Connections are store-scoped. Replace the legacy one-platform-per-vendor
-- constraint so a vendor can connect multiple stores on the same platform.
alter table public.store_connections
  drop constraint if exists store_connections_vendor_id_platform_key;
create unique index if not exists store_connections_vendor_platform_url_idx
  on public.store_connections(vendor_id, platform, store_url);

alter table public.store_connections
  drop constraint if exists store_connections_status_check;
alter table public.store_connections
  add constraint store_connections_status_check
  check (status in ('pending','connected','error','syncing','disconnected'));

create table if not exists public.store_sync_jobs (
  id uuid default gen_random_uuid() primary key,
  vendor_id uuid references auth.users(id) on delete cascade not null,
  connection_id uuid references public.store_connections(id) on delete cascade not null,
  status text not null default 'queued'
    check (status in ('queued','running','completed','partial','failed')),
  cursor jsonb,
  counts jsonb not null default
    '{"discovered":0,"created":0,"updated":0,"unchanged":0,"archived":0,"failed":0}'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  error_message text,
  lease_token uuid,
  lease_expires_at timestamptz,
  started_at timestamptz default now(),
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Required when this migration is re-run after an earlier revision created
-- the jobs table without lease ownership tokens.
alter table public.store_sync_jobs
  add column if not exists lease_token uuid;

create unique index if not exists store_sync_jobs_one_active_idx
  on public.store_sync_jobs(connection_id)
  where status in ('queued','running');

create index if not exists store_sync_jobs_vendor_created_idx
  on public.store_sync_jobs(vendor_id, created_at desc);

alter table public.store_connections
  drop constraint if exists store_connections_last_sync_job_id_fkey;
alter table public.store_connections
  add constraint store_connections_last_sync_job_id_fkey
  foreign key (last_sync_job_id) references public.store_sync_jobs(id) on delete set null;

-- ── Connection-scoped source identity and reconciliation ────────────────────
alter table public.products
  add column if not exists source_connection_id uuid references public.store_connections(id) on delete set null,
  add column if not exists source_last_seen_at timestamptz,
  add column if not exists source_archived_at timestamptz,
  add column if not exists source_checksum text,
  add column if not exists currency text default 'USD',
  add column if not exists source_variants jsonb not null default '[]'::jsonb;

-- Backfill only unambiguous legacy imports. Existing source_url values stored
-- the connection URL, so vendor + platform + URL can identify one connection.
with unambiguous_connections as (
  select
    vendor_id,
    platform,
    store_url,
    min(id::text)::uuid as connection_id
  from public.store_connections
  group by vendor_id, platform, store_url
  having count(*) = 1
)
update public.products as product
set source_connection_id = match.connection_id
from unambiguous_connections as match
where product.source_connection_id is null
  and product.external_id is not null
  and product.vendor_id = match.vendor_id
  and product.source_platform = match.platform
  and regexp_replace(coalesce(product.source_url, ''), '/+$', '') =
      regexp_replace(match.store_url, '/+$', '');

drop index if exists public.products_vendor_external_platform_idx;
create unique index if not exists products_connection_external_idx
  on public.products(vendor_id, source_connection_id, external_id)
  where source_connection_id is not null and external_id is not null;

create index if not exists products_source_reconcile_idx
  on public.products(source_connection_id, source_last_seen_at)
  where source_connection_id is not null;

-- Archived source products must never be exposed publicly.
drop policy if exists "public_read_approved" on public.products;
create policy "public_read_approved" on public.products
  for select
  using (
    approval_status = 'approved'
    and status = 'active'
    and source_archived_at is null
  );

-- Connection credentials and job internals are API-only. The application reads
-- them through its service-role client after authenticating and authorizing the
-- requesting vendor.
alter table public.store_sync_jobs enable row level security;
revoke all on public.store_connections from authenticated, anon;
revoke all on public.store_sync_jobs from authenticated, anon;

-- Vendors can still edit ordinary product fields, but source identity and sync
-- bookkeeping are controlled only by the server-side integration pipeline.
revoke update (
  external_id,
  source_platform,
  source_url,
  source_connection_id,
  source_last_seen_at,
  source_archived_at,
  source_checksum,
  currency,
  source_variants
) on public.products from authenticated;

-- Profile roles authorize privileged vendor/admin APIs. Users may edit their
-- own public profile fields, but cannot rewrite or recreate their role.
alter table public.profiles
  add column if not exists updated_at timestamptz default now();

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    case
      when new.raw_user_meta_data->>'role' in ('buyer', 'vendor')
        then new.raw_user_meta_data->>'role'
      else null
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public, auth;

drop policy if exists "profiles_own_write" on public.profiles;
drop policy if exists "profiles_own_update" on public.profiles;
create policy "profiles_own_update" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke insert, delete, update on public.profiles from authenticated;
grant update (
  full_name,
  store_name,
  phone_number,
  phone,
  website,
  location,
  bio,
  avatar_url,
  updated_at
) on public.profiles to authenticated;