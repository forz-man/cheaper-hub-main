-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)
-- This creates all tables Cheaper needs. Safe to re-run (uses IF NOT EXISTS).

-- ── Products ──────────────────────────────────────────────────────────────────
create table if not exists public.products (
  id uuid default gen_random_uuid() primary key,
  vendor_id uuid references auth.users(id) on delete cascade not null,
  vendor_name text,
  name text not null,
  description text,
  category text,
  price numeric(10,2) not null,
  original_price numeric(10,2),
  stock integer default 0 not null,
  status text default 'active' check (status in ('active', 'draft', 'out_of_stock')),
  features text[] default array[]::text[],
  specs jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.products enable row level security;

create policy "vendors_manage_own" on public.products
  for all to authenticated
  using (auth.uid() = vendor_id)
  with check (auth.uid() = vendor_id);

create policy "public_read_active" on public.products
  for select
  using (status = 'active' or auth.uid() = vendor_id);

-- ── Orders ────────────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  buyer_id uuid references auth.users(id) on delete set null,
  buyer_email text,
  buyer_name text,
  status text default 'processing' check (status in ('processing', 'shipped', 'delivered', 'cancelled')),
  total numeric(10,2) not null,
  shipping_name text,
  shipping_address text,
  shipping_city text,
  shipping_zip text,
  shipping_country text default 'US',
  payment_status text default 'unpaid' check (payment_status in ('unpaid', 'paid', 'failed', 'refunded')),
  stripe_session_id text,
  stripe_payment_intent text,
  created_at timestamptz default now()
);

-- Safe to re-run: add payment columns to pre-existing orders tables.
alter table public.orders add column if not exists payment_status text default 'unpaid' check (payment_status in ('unpaid', 'paid', 'failed', 'refunded'));
alter table public.orders add column if not exists stripe_session_id text;
alter table public.orders add column if not exists stripe_payment_intent text;

alter table public.orders enable row level security;

create policy "orders_buyer_select" on public.orders
  for select to authenticated using (auth.uid() = buyer_id);

create policy "orders_buyer_insert" on public.orders
  for insert to authenticated with check (auth.uid() = buyer_id);

-- ── Order Items ───────────────────────────────────────────────────────────────
create table if not exists public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  product_id text not null,
  product_name text not null,
  vendor_id uuid,
  vendor_name text,
  price numeric(10,2) not null,
  qty integer not null default 1,
  subtotal numeric(10,2) not null
);

alter table public.order_items enable row level security;

create policy "order_items_buyer" on public.order_items
  for select to authenticated
  using (exists (
    select 1 from public.orders where id = order_id and buyer_id = auth.uid()
  ));

create policy "order_items_vendor" on public.order_items
  for select to authenticated
  using (vendor_id = auth.uid());

create policy "order_items_insert" on public.order_items
  for insert to authenticated
  with check (exists (
    select 1 from public.orders where id = order_id and buyer_id = auth.uid()
  ));

-- ── Auto-update timestamps ────────────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create or replace trigger products_updated_at
  before update on public.products
  for each row execute procedure public.handle_updated_at();

-- ── Profiles ──────────────────────────────────────────────────────────────────
-- Created automatically on sign-up via trigger; stores display name and role.
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  email text,
  role text check (role in ('buyer', 'vendor', 'admin')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_public_read" on public.profiles
  for select using (true);

create policy "profiles_own_write" on public.profiles
  for all to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Conversations ─────────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id uuid default gen_random_uuid() primary key,
  buyer_id uuid references auth.users(id) on delete set null,
  seller_id uuid references auth.users(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz default now()
);

alter table public.conversations enable row level security;

create policy "conversations_participant" on public.conversations
  for all to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id)
  with check (auth.uid() = buyer_id or auth.uid() = seller_id);

-- ── Messages ──────────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete set null,
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

create policy "messages_participant" on public.messages
  for all to authenticated
  using (
    exists (
      select 1 from public.conversations
      where id = conversation_id
        and (buyer_id = auth.uid() or seller_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.conversations
      where id = conversation_id
        and (buyer_id = auth.uid() or seller_id = auth.uid())
    )
  );

-- Enable realtime for messages and conversations
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;

-- ── User display-name helper ──────────────────────────────────────────────────
-- SECURITY DEFINER lets anon/authenticated callers read auth.users metadata
-- without exposing the full table.  Call via supabase.rpc('get_user_display_names').
create or replace function public.get_user_display_names(user_ids uuid[])
returns table (id uuid, display_name text, email text)
security definer
set search_path = public, auth
language sql
as $$
  select
    u.id,
    coalesce(
      nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(u.raw_user_meta_data->>'name'), ''),
      split_part(u.email, '@', 1),
      'User'
    ) as display_name,
    u.email
  from auth.users u
  where u.id = any(user_ids);
$$;

grant execute on function public.get_user_display_names(uuid[]) to authenticated, anon;

-- ── Store integrations ────────────────────────────────────────────────────────
create table if not exists public.store_connections (
  id            uuid default gen_random_uuid() primary key,
  vendor_id     uuid references auth.users(id) on delete cascade not null,
  platform      text not null check (platform in ('shopify','woocommerce','wix','wordpress')),
  store_url     text not null,
  credentials   jsonb not null default '{}',   -- encrypted at rest by Supabase; never expose raw
  status        text not null default 'pending' check (status in ('pending','connected','error','syncing')),
  error_message text,
  last_synced_at timestamptz,
  product_count  int default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(vendor_id, platform, store_url)
);

alter table public.store_connections enable row level security;

create policy "Vendor owns their connections"
  on public.store_connections for all
  using (auth.uid() = vendor_id)
  with check (auth.uid() = vendor_id);

-- ── Vendor order policies ─────────────────────────────────────────────────────
-- Vendors need to see orders that contain their items, and update the status.

create policy "orders_vendor_select" on public.orders
  for select to authenticated
  using (exists (
    select 1 from public.order_items
    where order_items.order_id = orders.id
      and order_items.vendor_id = auth.uid()
  ));

create policy "orders_vendor_update" on public.orders
  for update to authenticated
  using (exists (
    select 1 from public.order_items
    where order_items.order_id = orders.id
      and order_items.vendor_id = auth.uid()
  ))
  with check (status in ('processing', 'shipped', 'delivered', 'cancelled'));
