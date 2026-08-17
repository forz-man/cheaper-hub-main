-- Admin-curated homepage deals.
-- Run this migration in the Supabase SQL Editor.

alter table public.products
  add column if not exists is_todays_deal boolean not null default false;

create index if not exists products_todays_deal_idx
  on public.products(is_todays_deal)
  where is_todays_deal = true;