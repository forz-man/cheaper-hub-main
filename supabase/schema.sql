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
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  features text[] default array[]::text[],
  specs jsonb default '{}'::jsonb,
  images jsonb default '[]'::jsonb,
  -- Store import tracking (populated when product is synced from an external platform)
  external_id text,
  source_platform text,
  source_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Safe to re-run: add columns to pre-existing products tables.
alter table public.products add column if not exists images jsonb default '[]'::jsonb;
alter table public.products add column if not exists external_id text;
alter table public.products add column if not exists source_platform text;
alter table public.products add column if not exists source_url text;

-- Unique index for upsert deduplication when syncing from external platforms.
-- Allows the same vendor to have the same product from different platforms.
create unique index if not exists products_vendor_external_platform_idx
  on public.products(vendor_id, external_id, source_platform)
  where external_id is not null and source_platform is not null;

create index if not exists products_approval_status_idx
  on public.products(approval_status);

alter table public.products enable row level security;

create policy "vendor_insert_own" on public.products
  for insert to authenticated
  with check (auth.uid() = vendor_id);

create policy "vendor_select_own" on public.products
  for select to authenticated
  using (auth.uid() = vendor_id);

create policy "vendor_update_own" on public.products
  for update to authenticated
  using (auth.uid() = vendor_id)
  with check (auth.uid() = vendor_id);

create policy "vendor_delete_own" on public.products
  for delete to authenticated
  using (auth.uid() = vendor_id);

create policy "public_read_approved" on public.products
  for select
  using (approval_status = 'approved' and status = 'active');

-- Column-level: only service_role can update approval_status
revoke update on public.products from authenticated;
grant update (
  vendor_name, name, description, category, price, original_price,
  stock, status, features, specs, images,
  external_id, source_platform, source_url, updated_at
) on public.products to authenticated;

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
  subtotal numeric(10,2) not null,
  -- Per-vendor fulfillment + payout tracking. Money is captured to the
  -- platform's own Stripe balance at checkout and held there; a vendor's
  -- share is only "released" (marked payable) once their item is delivered.
  fulfillment_status text default 'processing' check (fulfillment_status in ('processing', 'shipped', 'delivered', 'cancelled')),
  payout_status text default 'pending' check (payout_status in ('pending', 'released')),
  payout_amount numeric(10,2),
  payout_released_at timestamptz,
  created_at timestamptz default now()
);

-- Safe to re-run: add payout/fulfillment columns to pre-existing order_items tables.
alter table public.order_items add column if not exists fulfillment_status text default 'processing' check (fulfillment_status in ('processing', 'shipped', 'delivered', 'cancelled'));
alter table public.order_items add column if not exists payout_status text default 'pending' check (payout_status in ('pending', 'released'));
alter table public.order_items add column if not exists payout_amount numeric(10,2);
alter table public.order_items add column if not exists payout_released_at timestamptz;
alter table public.order_items add column if not exists created_at timestamptz default now();
-- Stripe Transfer id once a vendor's payout has actually been sent via Connect.
alter table public.order_items add column if not exists stripe_transfer_id text;

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
  created_at timestamptz default now(),
  -- Stripe Connect (Express) account used to pay vendors out after delivery.
  stripe_account_id text,
  stripe_charges_enabled boolean default false,
  stripe_payouts_enabled boolean default false,
  stripe_details_submitted boolean default false
);

-- Safe to re-run: add Stripe Connect columns to pre-existing profiles tables.
alter table public.profiles add column if not exists stripe_account_id text;
alter table public.profiles add column if not exists stripe_charges_enabled boolean default false;
alter table public.profiles add column if not exists stripe_payouts_enabled boolean default false;
alter table public.profiles add column if not exists stripe_details_submitted boolean default false;

alter table public.profiles enable row level security;

create policy "profiles_public_read" on public.profiles
  for select using (true);

create policy "profiles_own_write" on public.profiles
  for all to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create profile on sign-up (includes role sync from user_metadata)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data->>'role', '')
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
  platform      text not null,
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

-- Update the platform check constraint to include all supported platforms.
-- Drop the old auto-named constraint (if it exists) and add a named one.
alter table public.store_connections
  drop constraint if exists store_connections_platform_check;
alter table public.store_connections
  add constraint store_connections_platform_check
  check (platform in (
    'shopify','woocommerce','wix','wordpress',
    'etsy','squarespace','bigcommerce','prestashop','magento2','ecwid'
  ));

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

-- RLS policies only constrain which rows/values are allowed — they do NOT
-- stop a vendor from including other columns (e.g. payment_status) in the
-- same UPDATE statement as long as `status` still passes the check above.
-- Lock this down with column-level privileges so vendors can only ever
-- write the `status` column on orders; payment/session fields are only
-- ever written by trusted server code using the service-role admin client.
revoke update on public.orders from authenticated;
grant update (status) on public.orders to authenticated;

-- Same class of leak on profiles: Stripe Connect fields must never be
-- readable or writable by any client-side session (browser code never
-- needs them directly — every route that touches them uses the
-- service-role admin client). Without this, a vendor could read another
-- vendor's stripe_account_id (public read policy) and overwrite their own
-- profile's stripe_account_id with it (owner write policy), then use the
-- Stripe dashboard-link endpoint to log into someone else's account.
revoke select (stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_details_submitted) on public.profiles from authenticated, anon;
revoke update (stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_details_submitted) on public.profiles from authenticated, anon;

-- ── Contact messages ─────────────────────────────────────────────────────────
-- Submissions from the public /contact page. Anyone (including logged-out
-- visitors) can insert; nobody can read/update/delete via the client —
-- only server code using the service-role admin client can list these.
create table if not exists public.contact_messages (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  email       text not null,
  subject     text,
  message     text not null,
  status      text not null default 'new' check (status in ('new', 'read', 'resolved')),
  created_at  timestamptz default now()
);

alter table public.contact_messages enable row level security;

create policy "contact_messages_public_insert" on public.contact_messages
  for insert to anon, authenticated
  with check (true);

-- ── Notifications ──────────────────────────────────────────────────────────────
-- Structured notifications for product approvals, order updates, and system events.
-- Enables real-time push to the notification bell/dropdown and full notification page.
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in (
    'product_pending', 'product_approved', 'product_rejected',
    'order_update', 'payout_release', 'system'
  )),
  title text not null,
  body text,
  link text,                          -- href to navigate when clicked
  data jsonb default '{}'::jsonb,     -- extra payload (product_id, vendor_id, reason, etc.)
  is_read boolean default false,
  created_at timestamptz default now()
);

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_is_read_idx on public.notifications(is_read);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

alter table public.notifications enable row level security;

-- Users can read their own notifications
create policy "notifications_user_select" on public.notifications
  for select to authenticated
  using (auth.uid() = user_id);

-- Admin users can insert for any user (service_role bypasses RLS entirely)
create policy "notifications_admin_insert" on public.notifications
  for insert to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Users can update their own notifications (mark read/unread)
create policy "notifications_user_update" on public.notifications
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can delete their own notifications
create policy "notifications_user_delete" on public.notifications
  for delete to authenticated
  using (auth.uid() = user_id);

-- Enable realtime for notifications
alter publication supabase_realtime add table public.notifications;

-- ── Activity logs ─────────────────────────────────────────────────────────────
-- Audit trail for admin actions (approve/reject products, manage users, etc.)
create table if not exists public.activity_logs (
  id uuid default gen_random_uuid() primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,           -- 'product', 'user', 'order', 'vendor'
  entity_id text,                      -- the affected entity's id
  description text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists activity_logs_actor_idx on public.activity_logs(actor_id);
create index if not exists activity_logs_created_at_idx on public.activity_logs(created_at desc);

alter table public.activity_logs enable row level security;

-- Admin can read all activity logs
create policy "activity_logs_admin_select" on public.activity_logs
  for select to authenticated
  using (true);

-- Admin users can insert (service_role bypasses RLS entirely)
create policy "activity_logs_admin_insert" on public.activity_logs
  for insert to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ── Add product approval columns (safe to re-run) ─────────────────────────────
alter table public.products add column if not exists approved_at timestamptz;
alter table public.products add column if not exists approved_by uuid references auth.users(id);
alter table public.products add column if not exists rejected_at timestamptz;
alter table public.products add column if not exists rejected_by uuid references auth.users(id);
alter table public.products add column if not exists rejection_reason text;

-- ── Trigger: notify admins when vendor submits a new pending product ───────────
create or replace function public.notify_admins_on_pending_product()
returns trigger as $$
begin
  if new.approval_status = 'pending' then
    insert into public.notifications (user_id, type, title, body, link, data)
    select
      p.id,
      'product_pending',
      'New product submitted',
      'Product: ' || new.name || E'\nVendor: ' || coalesce(new.vendor_name, 'Unknown'),
      '/dashboard/admin?section=products&tab=pending',
      jsonb_build_object('product_id', new.id, 'vendor_id', new.vendor_id)
    from public.profiles p
    where p.role = 'admin';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_product_insert_pending on public.products;
create trigger on_product_insert_pending
  after insert on public.products
  for each row
  execute function public.notify_admins_on_pending_product();

-- ── Trigger: notify admins when existing product changes to pending ────────────
create or replace function public.notify_admins_on_pending_update()
returns trigger as $$
begin
  if new.approval_status = 'pending' and old.approval_status != 'pending' then
    insert into public.notifications (user_id, type, title, body, link, data)
    select
      p.id,
      'product_pending',
      'Product resubmitted',
      'Product: ' || new.name || E'\nVendor: ' || coalesce(new.vendor_name, 'Unknown'),
      '/dashboard/admin?section=products&tab=pending',
      jsonb_build_object('product_id', new.id, 'vendor_id', new.vendor_id)
    from public.profiles p
    where p.role = 'admin';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_product_update_pending on public.products;
create trigger on_product_update_pending
  after update on public.products
  for each row
  when (new.approval_status = 'pending' and old.approval_status != 'pending')
  execute function public.notify_admins_on_pending_update();

-- ── Reviews ──────────────────────────────────────────────────────────────────
-- Buyers can leave one review per product after a delivered purchase.
-- rating: 1–5 integer enforced by CHECK constraint.
-- order_item_id links to the specific delivered item (purchase proof).
create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  order_item_id uuid references public.order_items(id) on delete set null,
  rating integer not null check (rating >= 1 and rating <= 5),
  text text,
  created_at timestamptz default now(),
  unique(user_id, product_id)
);

alter table public.reviews enable row level security;

-- Anyone can read reviews (shown on product pages)
create policy "reviews_public_read" on public.reviews
  for select to anon, authenticated
  using (true);

-- Authenticated users can insert their own reviews.
-- Purchase verification is enforced in the API layer (service role).
-- RLS prevents inserting on behalf of another user.
create policy "reviews_insert_own" on public.reviews
  for insert to authenticated
  with check (auth.uid() = user_id);

-- Users can update/delete their own reviews
create policy "reviews_update_own" on public.reviews
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "reviews_delete_own" on public.reviews
  for delete to authenticated
  using (auth.uid() = user_id);

-- ── Backfill: sync role from auth.users metadata into profiles ───────────────
-- Existing users who signed up before the trigger was updated will have
-- profiles.role = NULL. This one-time update copies the role from the
-- auth.users raw_user_meta_data into the profiles table.
-- Safe to re-run (idempotent).
update public.profiles p
set role = u.raw_user_meta_data->>'role'
from auth.users u
where p.id = u.id
  and p.role is null
  and u.raw_user_meta_data->>'role' is not null;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ADMIN DASHBOARD PRODUCTION AUDIT MIGRATIONS (July 2026)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Profiles: soft-delete and suspension columns ─────────────────────────────
alter table public.profiles add column if not exists suspended boolean default false;
alter table public.profiles add column if not exists suspended_at timestamptz;
alter table public.profiles add column if not exists suspended_by uuid references auth.users(id);
alter table public.profiles add column if not exists deleted boolean default false;
alter table public.profiles add column if not exists deleted_at timestamptz;
alter table public.profiles add column if not exists deleted_by uuid references auth.users(id);
alter table public.profiles add column if not exists updated_at timestamptz default now();

-- ── Settings table ───────────────────────────────────────────────────────────
create table if not exists public.settings (
  key text primary key,
  value text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz default now()
);

alter table public.settings enable row level security;

-- Only admins can read/write settings (service_role bypasses RLS for admin API)
create policy "settings_admin_all" on public.settings
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Default settings
insert into public.settings (key, value) values
  ('platform_name', 'Cheaper'),
  ('support_email', 'support@cheaper.com'),
  ('commission_rate', '10'),
  ('platform_fee', '0'),
  ('currency', 'USD'),
  ('contact_number', ''),
  ('maintenance_mode', 'false'),
  ('tax_rate', '0'),
  ('shipping_flat_rate', '0'),
  ('free_shipping_threshold', '100')
on conflict (key) do nothing;

-- ── Indexes for performance ──────────────────────────────────────────────────
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_suspended_idx on public.profiles(suspended);
create index if not exists profiles_deleted_idx on public.profiles(deleted);
create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_payment_status_idx on public.orders(payment_status);
create index if not exists orders_buyer_id_idx on public.orders(buyer_id);
create index if not exists order_items_vendor_id_idx on public.order_items(vendor_id);
create index if not exists order_items_product_id_idx on public.order_items(product_id);
create index if not exists contact_messages_status_idx on public.contact_messages(status);
create index if not exists products_vendor_id_idx on public.products(vendor_id);
create index if not exists products_status_idx on public.products(status);
create index if not exists reviews_product_id_idx on public.reviews(product_id);
create index if not exists reviews_user_id_idx on public.reviews(user_id);
