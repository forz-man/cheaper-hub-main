-- ═══════════════════════════════════════════════════════════════════════════════
-- ADMIN: Product Approval, Activity Log & Settings — Production Migration
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Settings: change value to jsonb, add description ──────────────────────
alter table public.settings add column if not exists description text;
alter table public.settings alter column value type jsonb using to_jsonb(value);
alter table public.settings alter column value set not null;
alter table public.settings alter column value set default '""'::jsonb;

-- Add new settings keys
insert into public.settings (key, value, description) values
  ('site_name', '"Cheaper"', 'Display name of the platform'),
  ('allow_vendor_registration', '"true"', 'Allow new vendor registrations'),
  ('allow_product_submission', '"true"', 'Allow vendors to submit products')
on conflict (key) do nothing;

-- Update existing settings descriptions
update public.settings set description = 'Display name of the platform' where key = 'platform_name';
update public.settings set description = 'Commission rate charged to vendors (percentage)' where key = 'commission_rate';
update public.settings set description = 'Additional platform fee per order' where key = 'platform_fee';
update public.settings set description = 'Default currency for the platform' where key = 'currency';
update public.settings set description = 'Support contact email' where key = 'support_email';
update public.settings set description = 'Contact phone number' where key = 'contact_number';
update public.settings set description = 'Enable maintenance mode (blocks public access)' where key = 'maintenance_mode';
update public.settings set description = 'Tax rate applied to orders (percentage)' where key = 'tax_rate';
update public.settings set description = 'Flat shipping rate per order' where key = 'shipping_flat_rate';
update public.settings set description = 'Orders above this amount get free shipping' where key = 'free_shipping_threshold';

-- ── Activity logs: add entity_type index ────────────────────────────────────
create index if not exists activity_logs_entity_type_idx on public.activity_logs(entity_type);

-- ── Remove product approval columns (they should NOT exist per requirements) ──
-- These columns were added in a previous migration but should not exist.
-- We drop them to comply with the spec: only approval_status on products.
alter table public.products drop column if exists approved_at;
alter table public.products drop column if exists approved_by;
alter table public.products drop column if exists rejected_at;
alter table public.products drop column if exists rejected_by;
alter table public.products drop column if exists rejection_reason;

-- ── Update settings value to jsonb and add description (safe to re-run) ──────
-- These are idempotent; if already run, they do nothing.
do $$
begin
  -- Change value column to jsonb if it's still text
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'settings' and column_name = 'value'
    and data_type = 'text'
  ) then
    alter table public.settings alter column value type jsonb using to_jsonb(value);
    alter table public.settings alter column value set not null;
    alter table public.settings alter column value set default '""'::jsonb;
  end if;
end $$;

-- Add description column if not exists
alter table public.settings add column if not exists description text;

-- Update descriptions for all settings
update public.settings set description = 'Display name of the platform' where key = 'platform_name';
update public.settings set description = 'Support contact email address' where key = 'support_email';
update public.settings set description = 'Commission rate charged to vendors (percentage)' where key = 'commission_rate';
update public.settings set description = 'Additional platform fee per order' where key = 'platform_fee';
update public.settings set description = 'Default currency code (e.g. USD, EUR)' where key = 'currency';
update public.settings set description = 'Contact phone number displayed on site' where key = 'contact_number';
update public.settings set description = 'Enable maintenance mode (blocks public access)' where key = 'maintenance_mode';
update public.settings set description = 'Tax rate applied to orders (percentage)' where key = 'tax_rate';
update public.settings set description = 'Flat shipping rate per order' where key = 'shipping_flat_rate';
update public.settings set description = 'Orders above this amount get free shipping' where key = 'free_shipping_threshold';
update public.settings set description = 'Display name of the platform' where key = 'site_name';
update public.settings set description = 'Allow new vendor registrations' where key = 'allow_vendor_registration';
update public.settings set description = 'Allow vendors to submit products for approval' where key = 'allow_product_submission';

-- ── Activity logs: add entity_type index ─────────────────────────────────────
create index if not exists activity_logs_entity_type_idx on public.activity_logs(entity_type);</think>Now let me update the product PATCH route to remove the extra approval columns:

<｜DSML｜tool_calls>
<｜DSML｜invoke name="edit">
<｜DSML｜parameter name="filePath" string="true">E:\Cheaper\cheaper-hub-main\app\api\admin\products\route.js