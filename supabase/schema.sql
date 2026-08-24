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
  is_todays_deal boolean not null default false,
  features text[] default array[]::text[],
  specs jsonb default '{}'::jsonb,
  images jsonb default '[]'::jsonb,
  -- Store import tracking (populated when product is synced from an external platform)
  external_id text,
  source_platform text,
  source_url text,
  source_last_seen_at timestamptz,
  source_archived_at timestamptz,
  source_checksum text,
  currency text default 'USD',
  source_variants jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Safe to re-run: add columns to pre-existing products tables.
alter table public.products add column if not exists images jsonb default '[]'::jsonb;
alter table public.products add column if not exists external_id text;
alter table public.products add column if not exists source_platform text;
alter table public.products add column if not exists source_url text;
alter table public.products add column if not exists source_last_seen_at timestamptz;
alter table public.products add column if not exists source_archived_at timestamptz;
alter table public.products add column if not exists source_checksum text;
alter table public.products add column if not exists currency text default 'USD';
alter table public.products add column if not exists source_variants jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists is_todays_deal boolean not null default false;

create index if not exists products_approval_status_idx
  on public.products(approval_status);

create index if not exists products_todays_deal_idx
  on public.products(is_todays_deal)
  where is_todays_deal = true;

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
  using (
    approval_status = 'approved'
    and status = 'active'
    and source_archived_at is null
  );

-- Column-level: only service_role can update approval_status
revoke update on public.products from authenticated;
grant update (
  vendor_name, name, description, category, price, original_price,
  stock, status, features, specs, images, updated_at
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
  payment_issue_status text default 'none' check (payment_issue_status in ('none', 'partially_refunded', 'refunded', 'disputed', 'dispute_won', 'dispute_lost', 'needs_support')),
  refunded_amount numeric(10,2) not null default 0,
  disputed_amount numeric(10,2) not null default 0,
  stripe_session_id text,
  stripe_payment_intent text,
  created_at timestamptz default now()
);

-- Safe to re-run: add payment columns to pre-existing orders tables.
alter table public.orders add column if not exists payment_status text default 'unpaid' check (payment_status in ('unpaid', 'paid', 'failed', 'refunded'));
alter table public.orders add column if not exists payment_issue_status text default 'none' check (payment_issue_status in ('none', 'partially_refunded', 'refunded', 'disputed', 'dispute_won', 'dispute_lost', 'needs_support'));
alter table public.orders add column if not exists refunded_amount numeric(10,2) not null default 0;
alter table public.orders add column if not exists disputed_amount numeric(10,2) not null default 0;
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
  -- platform balance at checkout and each vendor's net share is transferred
  -- immediately after Stripe confirms the payment.
  fulfillment_status text default 'processing' check (fulfillment_status in ('processing', 'shipped', 'delivered', 'cancelled')),
  payout_status text default 'pending' check (payout_status in ('pending', 'released')),
  payout_amount numeric(10,2),
  payout_released_at timestamptz,
  payout_attempted_at timestamptz,
  payout_error text,
  payout_recovery_status text default 'none' check (payout_recovery_status in ('none', 'pending', 'recovered', 'reinstated', 'needs_support')),
  payout_recovered_amount numeric(10,2) not null default 0,
  payout_recovered_at timestamptz,
  payout_recovery_error text,
  created_at timestamptz default now()
);

-- Safe to re-run: add payout/fulfillment columns to pre-existing order_items tables.
alter table public.order_items add column if not exists fulfillment_status text default 'processing' check (fulfillment_status in ('processing', 'shipped', 'delivered', 'cancelled'));
alter table public.order_items add column if not exists payout_status text default 'pending' check (payout_status in ('pending', 'released'));
alter table public.order_items add column if not exists payout_amount numeric(10,2);
alter table public.order_items add column if not exists payout_released_at timestamptz;
alter table public.order_items add column if not exists payout_attempted_at timestamptz;
alter table public.order_items add column if not exists payout_error text;
alter table public.order_items add column if not exists payout_recovery_status text default 'none' check (payout_recovery_status in ('none', 'pending', 'recovered', 'reinstated', 'needs_support'));
alter table public.order_items add column if not exists payout_recovered_amount numeric(10,2) not null default 0;
alter table public.order_items add column if not exists payout_recovered_at timestamptz;
alter table public.order_items add column if not exists payout_recovery_error text;
alter table public.order_items add column if not exists created_at timestamptz default now();
-- Stripe Transfer id once a vendor's payout has actually been sent via Connect.
alter table public.order_items add column if not exists stripe_transfer_id text;

-- Stripe webhook records and one recovery row per adjustment/item. The unique
-- adjustment key is the database-side retry guard; Stripe idempotency protects
-- the corresponding transfer reversal request.
create table if not exists public.stripe_payment_events (
  id uuid default gen_random_uuid() primary key,
  stripe_event_id text not null unique,
  event_type text not null,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  stripe_adjustment_id text not null,
  order_id uuid references public.orders(id) on delete set null,
  status text not null default 'processing' check (status in ('processing', 'processed', 'needs_support', 'ignored')),
  amount_cents integer not null default 0,
  currency text default 'usd',
  error text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  processed_at timestamptz
);

create index if not exists stripe_payment_events_order_idx
  on public.stripe_payment_events(order_id, created_at desc);
create index if not exists stripe_payment_events_adjustment_idx
  on public.stripe_payment_events(stripe_adjustment_id);

create table if not exists public.payout_recovery_events (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  order_item_id uuid references public.order_items(id) on delete cascade not null,
  vendor_id uuid references auth.users(id) on delete set null,
  stripe_event_id text not null,
  stripe_adjustment_id text not null,
  event_type text not null check (event_type in ('refund', 'dispute')),
  amount_cents integer not null check (amount_cents >= 0),
  stripe_transfer_id text not null,
  stripe_transfer_reversal_id text,
  stripe_reinstatement_transfer_id text,
  status text not null default 'pending' check (status in ('pending', 'recovered', 'reinstated', 'needs_support', 'not_applicable')),
  error text,
  created_at timestamptz default now(),
  resolved_at timestamptz,
  unique (stripe_event_id, order_item_id),
  unique (stripe_adjustment_id, order_item_id)
);

create index if not exists payout_recovery_events_order_idx
  on public.payout_recovery_events(order_id, created_at desc);
create index if not exists payout_recovery_events_vendor_idx
  on public.payout_recovery_events(vendor_id, created_at desc);

-- A canonical Stripe adjustment exists even when an order had no released
-- transfers. This makes order-level refund/dispute accounting exactly-once.
create table if not exists public.stripe_payment_adjustments (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  stripe_adjustment_id text not null unique,
  event_type text not null check (event_type in ('refund', 'dispute')),
  amount_cents integer not null check (amount_cents >= 0),
  created_at timestamptz default now()
);

create index if not exists stripe_payment_adjustments_order_idx
  on public.stripe_payment_adjustments(order_id, created_at desc);

alter table public.stripe_payment_events enable row level security;
alter table public.payout_recovery_events enable row level security;
alter table public.stripe_payment_adjustments enable row level security;

-- Atomically reserve the remaining recovery capacity before any Stripe API
-- call. This protects overlapping webhooks for different partial refunds from
-- reversing a transfer beyond its original amount.
create or replace function public.claim_payout_recovery(
  p_order_id uuid,
  p_order_item_id uuid,
  p_vendor_id uuid,
  p_stripe_event_id text,
  p_stripe_adjustment_id text,
  p_event_type text,
  p_requested_amount_cents integer,
  p_stripe_transfer_id text
) returns public.payout_recovery_events
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_recovery public.payout_recovery_events;
  payout_cents integer;
  already_claimed_cents integer;
  claim_cents integer;
  created_recovery public.payout_recovery_events;
begin
  select * into existing_recovery
  from public.payout_recovery_events
  where stripe_adjustment_id = p_stripe_adjustment_id
    and order_item_id = p_order_item_id;
  if found then return existing_recovery; end if;

  perform 1 from public.order_items
  where id = p_order_item_id
    and order_id = p_order_id
    and vendor_id is not distinct from p_vendor_id
    and stripe_transfer_id = p_stripe_transfer_id
    and payout_status = 'released'
  for update;
  if not found then raise exception 'Order item % was not found', p_order_item_id; end if;

  select coalesce(round(payout_amount * 100)::integer, 0) into payout_cents
  from public.order_items where id = p_order_item_id;
  select coalesce(sum(amount_cents), 0) into already_claimed_cents
  from public.payout_recovery_events
  where order_item_id = p_order_item_id
    and status in ('pending', 'recovered', 'needs_support');

  claim_cents := greatest(0, least(coalesce(p_requested_amount_cents, 0), payout_cents - already_claimed_cents));
  insert into public.payout_recovery_events (
    order_id, order_item_id, vendor_id, stripe_event_id, stripe_adjustment_id,
    event_type, amount_cents, stripe_transfer_id, status
  ) values (
    p_order_id, p_order_item_id, p_vendor_id, p_stripe_event_id, p_stripe_adjustment_id,
    p_event_type, claim_cents, p_stripe_transfer_id,
    case when claim_cents > 0 then 'pending' else 'not_applicable' end
  ) returning * into created_recovery;

  if claim_cents > 0 then
    update public.order_items set payout_recovery_status = 'pending' where id = p_order_item_id;
  end if;
  return created_recovery;
end;
$$;

create or replace function public.claim_stripe_payment_adjustment(
  p_order_id uuid,
  p_stripe_adjustment_id text,
  p_event_type text,
  p_amount_cents integer
) returns table(amount_cents integer, is_new boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_adjustment public.stripe_payment_adjustments;
begin
  if p_event_type not in ('refund', 'dispute') then
    raise exception 'Invalid payment adjustment type';
  end if;

  perform 1 from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order % was not found', p_order_id; end if;

  select * into existing_adjustment
  from public.stripe_payment_adjustments
  where stripe_adjustment_id = p_stripe_adjustment_id;
  if found then
    return query select existing_adjustment.amount_cents, false;
    return;
  end if;

  insert into public.stripe_payment_adjustments (
    order_id, stripe_adjustment_id, event_type, amount_cents
  ) values (
    p_order_id, p_stripe_adjustment_id, p_event_type, greatest(0, coalesce(p_amount_cents, 0))
  );

  if p_event_type = 'refund' then
    update public.orders
    set refunded_amount = refunded_amount + (greatest(0, coalesce(p_amount_cents, 0))::numeric / 100),
        payment_status = case
          when refunded_amount + (greatest(0, coalesce(p_amount_cents, 0))::numeric / 100) >= total then 'refunded'
          when payment_status = 'unpaid' then 'paid'
          else payment_status
        end,
        payment_issue_status = case
          when payment_issue_status = 'needs_support' then 'needs_support'
          when refunded_amount + (greatest(0, coalesce(p_amount_cents, 0))::numeric / 100) >= total then 'refunded'
          else 'partially_refunded'
        end
    where id = p_order_id;
  else
    update public.orders
    set disputed_amount = disputed_amount + (greatest(0, coalesce(p_amount_cents, 0))::numeric / 100)
    where id = p_order_id;
  end if;
  return query select greatest(0, coalesce(p_amount_cents, 0)), true;
end;
$$;

create or replace function public.finalize_payout_recovery(
  p_recovery_id uuid,
  p_status text,
  p_stripe_transfer_reversal_id text,
  p_error text
) returns public.payout_recovery_events
language plpgsql
security definer
set search_path = public
as $$
declare
  recovery public.payout_recovery_events;
  recovered_cents integer;
  has_support boolean;
begin
  if p_status not in ('recovered', 'needs_support') then
    raise exception 'Invalid payout recovery status';
  end if;
  select * into recovery from public.payout_recovery_events where id = p_recovery_id for update;
  if not found then raise exception 'Payout recovery % was not found', p_recovery_id; end if;
  perform 1 from public.order_items where id = recovery.order_item_id for update;

  update public.payout_recovery_events
  set status = p_status,
      stripe_transfer_reversal_id = case when p_status = 'recovered' then p_stripe_transfer_reversal_id else stripe_transfer_reversal_id end,
      error = case when p_status = 'recovered' then null else p_error end,
      resolved_at = now()
  where id = p_recovery_id
  returning * into recovery;

  select coalesce(sum(amount_cents), 0) into recovered_cents
  from public.payout_recovery_events
  where order_item_id = recovery.order_item_id and status = 'recovered';
  select exists(
    select 1 from public.payout_recovery_events
    where order_item_id = recovery.order_item_id and status = 'needs_support'
  ) into has_support;
  update public.order_items
  set payout_recovered_amount = recovered_cents::numeric / 100,
      payout_recovered_at = case when p_status = 'recovered' then now() else payout_recovered_at end,
      payout_recovery_status = case when has_support then 'needs_support' when recovered_cents > 0 then 'recovered' else 'none' end,
      payout_recovery_error = case when has_support then p_error else null end
  where id = recovery.order_item_id;
  return recovery;
end;
$$;

create or replace function public.reinstate_payout_recovery(
  p_recovery_id uuid,
  p_stripe_reinstatement_transfer_id text
) returns public.payout_recovery_events
language plpgsql
security definer
set search_path = public
as $$
declare
  recovery public.payout_recovery_events;
  recovered_cents integer;
  has_support boolean;
begin
  select * into recovery from public.payout_recovery_events where id = p_recovery_id for update;
  if not found then raise exception 'Payout recovery % was not found', p_recovery_id; end if;
  perform 1 from public.order_items where id = recovery.order_item_id for update;

  update public.payout_recovery_events
  set status = 'reinstated',
      stripe_reinstatement_transfer_id = p_stripe_reinstatement_transfer_id,
      error = null,
      resolved_at = now()
  where id = p_recovery_id
  returning * into recovery;

  select coalesce(sum(amount_cents), 0) into recovered_cents
  from public.payout_recovery_events
  where order_item_id = recovery.order_item_id and status = 'recovered';
  select exists(
    select 1 from public.payout_recovery_events
    where order_item_id = recovery.order_item_id and status = 'needs_support'
  ) into has_support;
  update public.order_items
  set payout_recovered_amount = recovered_cents::numeric / 100,
      payout_recovery_status = case when has_support then 'needs_support' when recovered_cents > 0 then 'recovered' else 'reinstated' end,
      payout_recovery_error = null
  where id = recovery.order_item_id;
  return recovery;
end;
$$;

create or replace function public.mark_payout_reinstatement_failure(
  p_recovery_id uuid,
  p_error text
) returns public.payout_recovery_events
language plpgsql
security definer
set search_path = public
as $$
declare
  recovery public.payout_recovery_events;
begin
  select * into recovery from public.payout_recovery_events where id = p_recovery_id for update;
  if not found then raise exception 'Payout recovery % was not found', p_recovery_id; end if;
  if recovery.status <> 'recovered' then
    raise exception 'Only recovered payouts can be reinstated';
  end if;
  perform 1 from public.order_items where id = recovery.order_item_id for update;
  update public.payout_recovery_events
  set error = p_error
  where id = p_recovery_id
  returning * into recovery;
  update public.order_items
  set payout_recovery_status = 'needs_support',
      payout_recovery_error = p_error
  where id = recovery.order_item_id;
  return recovery;
end;
$$;

revoke execute on function public.claim_payout_recovery(uuid, uuid, uuid, text, text, text, integer, text) from public, anon, authenticated;
revoke execute on function public.claim_stripe_payment_adjustment(uuid, text, text, integer) from public, anon, authenticated;
revoke execute on function public.finalize_payout_recovery(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.reinstate_payout_recovery(uuid, text) from public, anon, authenticated;
revoke execute on function public.mark_payout_reinstatement_failure(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_payout_recovery(uuid, uuid, uuid, text, text, text, integer, text) to service_role;
grant execute on function public.claim_stripe_payment_adjustment(uuid, text, text, integer) to service_role;
grant execute on function public.finalize_payout_recovery(uuid, text, text, text) to service_role;
grant execute on function public.reinstate_payout_recovery(uuid, text) to service_role;
grant execute on function public.mark_payout_reinstatement_failure(uuid, text) to service_role;

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
  updated_at timestamptz default now(),
  -- Stripe Connect (Express) account used to pay vendors immediately after checkout.
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

-- Safe to re-run: add missing vendor profile fields to pre-existing profiles tables.
alter table public.profiles add column if not exists store_name text;
alter table public.profiles add column if not exists phone_number text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists website text;
alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists updated_at timestamptz default now();

alter table public.profiles enable row level security;

create policy "profiles_public_read" on public.profiles
  for select using (true);

create policy "profiles_own_update" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Profile rows are created by the auth trigger. The role is server-controlled:
-- users can choose it during signup, but cannot later self-promote by rewriting
-- or recreating their profile.
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

-- Auto-create profile on sign-up. Only buyer/vendor are valid self-selected
-- roles; admin access is assigned separately by trusted server-side tooling.
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
  credentials   jsonb not null default '{}', -- legacy only; new credentials use credentials_ciphertext
  credentials_ciphertext text,
  status        text not null default 'pending' check (status in ('pending','connected','error','syncing','disconnected')),
  error_message text,
  last_synced_at timestamptz,
  product_count  int default 0,
  disconnected_at timestamptz,
  last_sync_job_id uuid,
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

alter table public.store_connections
  add constraint store_connections_last_sync_job_id_fkey
  foreign key (last_sync_job_id) references public.store_sync_jobs(id) on delete set null;

alter table public.products
  add column if not exists source_connection_id uuid references public.store_connections(id) on delete set null;

create unique index if not exists products_connection_external_idx
  on public.products(vendor_id, source_connection_id, external_id)
  where source_connection_id is not null and external_id is not null;

create index if not exists products_source_reconcile_idx
  on public.products(source_connection_id, source_last_seen_at)
  where source_connection_id is not null;

create unique index if not exists store_sync_jobs_one_active_idx
  on public.store_sync_jobs(connection_id)
  where status in ('queued','running');

create index if not exists store_sync_jobs_vendor_created_idx
  on public.store_sync_jobs(vendor_id, created_at desc);

alter table public.store_connections enable row level security;
alter table public.store_sync_jobs enable row level security;

create policy "Vendor owns their connections"
  on public.store_connections for all
  using (auth.uid() = vendor_id)
  with check (auth.uid() = vendor_id);

-- Connections and sync jobs are API-only because connection rows contain
-- encrypted secrets and internal reconciliation state.
revoke all on public.store_connections from authenticated, anon;
revoke all on public.store_sync_jobs from authenticated, anon;

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
-- Buyers can leave one review per purchased item per order.
-- rating: 1–5 integer enforced by CHECK constraint.
-- order_item_id links to the specific delivered item (purchase proof).
create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  order_item_id uuid references public.order_items(id) on delete set null,
  rating integer not null check (rating >= 1 and rating <= 5),
  text text,
  created_at timestamptz default now()
);

-- Allow one review per product per order (not one per product globally)
-- so the same product bought in different orders can be reviewed each time.
drop index if exists reviews_user_product_idx;
create unique index if not exists reviews_user_product_order_idx
  on public.reviews(user_id, product_id, coalesce(order_item_id, '00000000-0000-0000-0000-000000000000'::uuid));

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
