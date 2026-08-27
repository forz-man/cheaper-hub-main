-- Vendor verification workflow
-- Run this file in the external Supabase SQL Editor before enabling the UI.

alter table public.profiles
  add column if not exists seller_type text;

alter table public.profiles
  add column if not exists verification_status text not null default 'not_submitted';

alter table public.profiles
  add column if not exists verified_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_seller_type_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_seller_type_check
      check (seller_type is null or seller_type in ('individual', 'business'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_verification_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_verification_status_check
      check (verification_status in ('not_submitted', 'pending', 'approved', 'declined'));
  end if;
end $$;

create table if not exists public.vendor_verification_submissions (
  id uuid default gen_random_uuid() primary key,
  vendor_id uuid not null unique references public.profiles(id) on delete cascade,
  seller_type text not null check (seller_type in ('individual', 'business')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  full_name text not null,
  phone_number text not null,
  location text not null,
  store_name text,
  business_category text,
  business_registration_details text,
  business_description text,
  website text,
  additional_notes text,
  identity_document_path text not null,
  identity_document_name text not null,
  identity_document_type text not null,
  identity_document_size integer not null check (identity_document_size > 0),
  decline_reason text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists vendor_verifications_status_type_idx
  on public.vendor_verification_submissions(status, seller_type, submitted_at desc);

alter table public.vendor_verification_submissions enable row level security;
revoke all on public.vendor_verification_submissions from anon, authenticated;
grant all on public.vendor_verification_submissions to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vendor-verification-documents',
  'vendor-verification-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.submit_vendor_verification(
  p_vendor_id uuid,
  p_seller_type text,
  p_full_name text,
  p_phone_number text,
  p_location text,
  p_store_name text,
  p_business_category text,
  p_business_registration_details text,
  p_business_description text,
  p_website text,
  p_additional_notes text,
  p_identity_document_path text,
  p_identity_document_name text,
  p_identity_document_type text,
  p_identity_document_size integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission_id uuid;
  v_existing_status text;
begin
  select status into v_existing_status
  from public.vendor_verification_submissions
  where vendor_id = p_vendor_id
  for update;

  if v_existing_status in ('pending', 'approved') then
    raise exception 'Pending or approved vendor verification cannot be resubmitted';
  end if;

  insert into public.vendor_verification_submissions (
    vendor_id, seller_type, status, full_name, phone_number, location,
    store_name, business_category, business_registration_details,
    business_description, website, additional_notes,
    identity_document_path, identity_document_name,
    identity_document_type, identity_document_size,
    decline_reason, submitted_at, reviewed_at, reviewed_by, updated_at
  )
  values (
    p_vendor_id, p_seller_type, 'pending', p_full_name, p_phone_number, p_location,
    nullif(p_store_name, ''), nullif(p_business_category, ''),
    nullif(p_business_registration_details, ''), nullif(p_business_description, ''),
    nullif(p_website, ''), nullif(p_additional_notes, ''),
    p_identity_document_path, p_identity_document_name,
    p_identity_document_type, p_identity_document_size,
    null, now(), null, null, now()
  )
  on conflict (vendor_id) do update set
    seller_type = excluded.seller_type,
    status = 'pending',
    full_name = excluded.full_name,
    phone_number = excluded.phone_number,
    location = excluded.location,
    store_name = excluded.store_name,
    business_category = excluded.business_category,
    business_registration_details = excluded.business_registration_details,
    business_description = excluded.business_description,
    website = excluded.website,
    additional_notes = excluded.additional_notes,
    identity_document_path = excluded.identity_document_path,
    identity_document_name = excluded.identity_document_name,
    identity_document_type = excluded.identity_document_type,
    identity_document_size = excluded.identity_document_size,
    decline_reason = null,
    submitted_at = now(),
    reviewed_at = null,
    reviewed_by = null,
    updated_at = now()
  where public.vendor_verification_submissions.status = 'declined'
  returning id into v_submission_id;

  if v_submission_id is null then
    raise exception 'Pending or approved vendor verification cannot be resubmitted';
  end if;

  update public.profiles
  set
    seller_type = p_seller_type,
    verification_status = 'pending',
    verified_at = null,
    full_name = p_full_name,
    phone_number = p_phone_number,
    phone = p_phone_number,
    location = p_location,
    store_name = case when p_seller_type = 'business' then nullif(p_store_name, '') else store_name end,
    bio = case when p_seller_type = 'business' then nullif(p_business_description, '') else bio end,
    website = case when p_seller_type = 'business' then nullif(p_website, '') else website end,
    updated_at = now()
  where id = p_vendor_id and role = 'vendor';

  if not found then
    raise exception 'Vendor profile not found';
  end if;

  return v_submission_id;
end;
$$;

drop function if exists public.review_vendor_verification(uuid, text, uuid, text);

create or replace function public.review_vendor_verification(
  p_submission_id uuid,
  p_decision text,
  p_admin_id uuid,
  p_decline_reason text,
  p_expected_updated_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission public.vendor_verification_submissions%rowtype;
begin
  if p_decision not in ('approved', 'declined') then
    raise exception 'Invalid verification decision';
  end if;

  select * into v_submission
  from public.vendor_verification_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Verification submission not found';
  end if;

  if v_submission.status <> 'pending' then
    raise exception 'Verification submission is no longer pending';
  end if;

  if v_submission.updated_at <> p_expected_updated_at then
    raise exception 'Verification submission changed; reload before review';
  end if;

  if p_decision = 'declined' and nullif(trim(p_decline_reason), '') is null then
    raise exception 'A decline reason is required';
  end if;

  update public.vendor_verification_submissions
  set
    status = p_decision,
    decline_reason = case when p_decision = 'declined' then trim(p_decline_reason) else null end,
    reviewed_at = now(),
    reviewed_by = p_admin_id,
    updated_at = now()
  where id = p_submission_id;

  update public.profiles
  set
    seller_type = v_submission.seller_type,
    verification_status = p_decision,
    verified_at = case when p_decision = 'approved' then now() else null end,
    updated_at = now()
  where id = v_submission.vendor_id and role = 'vendor';
end;
$$;

revoke all on function public.submit_vendor_verification(
  uuid, text, text, text, text, text, text, text, text, text, text,
  text, text, text, integer
) from public, anon, authenticated;
grant execute on function public.submit_vendor_verification(
  uuid, text, text, text, text, text, text, text, text, text, text,
  text, text, text, integer
) to service_role;

revoke all on function public.review_vendor_verification(uuid, text, uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.review_vendor_verification(uuid, text, uuid, text, timestamptz)
  to service_role;