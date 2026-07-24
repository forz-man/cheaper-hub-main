-- ═══════════════════════════════════════════════════════════════════════════
-- Product Approval Workflow — migration
-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Adds approval_status column (pending / approved / rejected)
-- 2. Sets existing products to approved (backfill)
-- 3. Drops old RLS policies, creates granular ones
-- 4. Revokes UPDATE of approval_status from client sessions
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Step 1: New column ────────────────────────────────────────────────────
alter table public.products
  add column if not exists approval_status text
  not null default 'pending'
  check (approval_status in ('pending', 'approved', 'rejected'));

-- ── Step 2: Backfill — existing products are considered approved ──────────
update public.products
  set approval_status = 'approved'
  where approval_status is null;

-- ── Step 3: Index for filtering ───────────────────────────────────────────
create index if not exists products_approval_status_idx
  on public.products(approval_status);

-- ── Step 4: Drop old policies ─────────────────────────────────────────────
drop policy if exists "vendors_manage_own" on public.products;
drop policy if exists "public_read_active" on public.products;

-- ── Step 5: New policies ──────────────────────────────────────────────────

-- Vendor: insert own products (approval_status forced to 'pending' by default)
create policy "vendor_insert_own" on public.products
  for insert to authenticated
  with check (auth.uid() = vendor_id);

-- Vendor: select own products (any approval_status)
create policy "vendor_select_own" on public.products
  for select to authenticated
  using (auth.uid() = vendor_id);

-- Vendor: update own products (approval_status protected by column privilege)
create policy "vendor_update_own" on public.products
  for update to authenticated
  using (auth.uid() = vendor_id)
  with check (auth.uid() = vendor_id);

-- Vendor: delete own products
create policy "vendor_delete_own" on public.products
  for delete to authenticated
  using (auth.uid() = vendor_id);

-- Public (anon + authenticated buyers): only see approved + active products
-- Vendors can also see their own products via the vendor_select_own policy.
create policy "public_read_approved" on public.products
  for select
  using (approval_status = 'approved' and status = 'active');

-- ── Step 6: Column-level security — only service_role can UPDATE approval_status ──
revoke update on public.products from authenticated;
grant update (
  vendor_name, name, description, category, price, original_price,
  stock, status, features, specs, images,
  external_id, source_platform, source_url, updated_at
) on public.products to authenticated;
