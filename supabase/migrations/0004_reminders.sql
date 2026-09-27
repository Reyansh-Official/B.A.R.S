-- Text-message reminders. Phone numbers and status links are stored encrypted by the app server;
-- no policies are defined, so only the server (secret key) can read or write these tables.

create table public.reminder_contacts (
  application_id text primary key references public.applications (id) on delete cascade,
  phone_encrypted text not null,
  phone_last4 text not null,
  link_encrypted text not null,
  consent_text text not null,
  consented_at timestamptz not null default now(),
  opted_out_at timestamptz
);
alter table public.reminder_contacts enable row level security;

-- Every message ever queued; dedupe_key makes each reminder send at most once.
create table public.outbox_messages (
  id uuid primary key default gen_random_uuid(),
  application_id text references public.applications (id) on delete cascade,
  dedupe_key text not null unique,
  kind text not null,
  to_last4 text not null,
  body text not null,
  status text not null check (status in ('queued', 'sent', 'logged', 'failed')),
  provider_id text,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index outbox_messages_created on public.outbox_messages (created_at desc);
alter table public.outbox_messages enable row level security;
create policy "Admins read the outbox" on public.outbox_messages for select to authenticated using ((select public.is_admin()));
