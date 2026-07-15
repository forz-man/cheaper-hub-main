"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, Copy, ExternalLink } from "lucide-react";

const SQL = `-- Products table
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
  images jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.products add column if not exists images jsonb default '[]'::jsonb;
alter table public.products enable row level security;
create policy "vendors_manage_own" on public.products
  for all to authenticated using (auth.uid() = vendor_id)
  with check (auth.uid() = vendor_id);
create policy "public_read_active" on public.products
  for select using (status = 'active' or auth.uid() = vendor_id);

-- Orders table
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
  created_at timestamptz default now()
);
alter table public.orders enable row level security;
create policy "orders_buyer_select" on public.orders
  for select to authenticated using (auth.uid() = buyer_id);
create policy "orders_buyer_insert" on public.orders
  for insert to authenticated with check (auth.uid() = buyer_id);

-- Order items table
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
  for select to authenticated using (
    exists (select 1 from public.orders where id = order_id and buyer_id = auth.uid())
  );
create policy "order_items_vendor" on public.order_items
  for select to authenticated using (vendor_id = auth.uid());
create policy "order_items_insert" on public.order_items
  for insert to authenticated with check (
    exists (select 1 from public.orders where id = order_id and buyer_id = auth.uid())
  );`;

export default function SetupPage() {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f5f3ef] flex items-center justify-center px-4 py-12" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <div className="w-full max-w-2xl">
        <div className="mb-6">
          <Link href="/" className="flex items-center gap-2 mb-8 w-fit">
            <div className="w-7 h-7 rounded-md bg-[#111] flex items-center justify-center">
              <span className="text-white font-bold text-xs" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>C</span>
            </div>
            <span className="font-bold text-base" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>Cheaper</span>
          </Link>
          <h1 className="text-2xl font-bold text-[#111] mb-2" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>
            One-time database setup
          </h1>
          <p className="text-sm text-[#888]">
            Run this SQL in your Supabase dashboard to create all required tables. Only needs to be done once.
          </p>
        </div>

        <div className="bg-white border border-[#e2ddd6] rounded-2xl overflow-hidden mb-5">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#e2ddd6]">
            <span className="text-xs font-semibold text-[#888] uppercase tracking-wide">SQL</span>
            <button
              onClick={copy}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#4648d4] hover:underline"
            >
              {copied ? <CheckCircle size={13} className="text-emerald-500" /> : <Copy size={13} />}
              {copied ? "Copied!" : "Copy all"}
            </button>
          </div>
          <pre className="p-5 text-xs text-[#555] overflow-x-auto leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">{SQL}</pre>
        </div>

        <div className="bg-white border border-[#e2ddd6] rounded-2xl p-6 mb-5">
          <h2 className="text-sm font-bold text-[#111] mb-4">Steps</h2>
          <div className="space-y-3">
            {[
              "Open your Supabase dashboard",
              "Go to SQL Editor → New query",
              "Paste the SQL above and click Run",
              "Come back — products and orders are now live",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#111] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-[10px] font-bold">{i + 1}</span>
                </div>
                <span className="text-sm text-[#555]">{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#111] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#333] transition-colors"
          >
            Open Supabase <ExternalLink size={14} />
          </a>
          <Link href="/dashboard/vendor" className="flex items-center gap-2 border border-[#e2ddd6] text-[#555] px-5 py-2.5 rounded-lg text-sm font-semibold hover:border-[#999] transition-colors">
            Vendor dashboard
          </Link>
          <Link href="/dashboard/buyer" className="flex items-center gap-2 border border-[#e2ddd6] text-[#555] px-5 py-2.5 rounded-lg text-sm font-semibold hover:border-[#999] transition-colors">
            Buyer dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
