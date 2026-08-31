-- Run in the external Supabase SQL editor before using unified account settings.
alter table public.profiles
  add column if not exists email_notifications boolean not null default true;

alter table public.profiles
  add column if not exists sms_notifications boolean not null default false;