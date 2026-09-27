-- One-time text codes that prove a patient controls the phone number they gave.
-- Phone and code are stored only as keyed hashes; only the server (secret key) can touch this table.
create table public.phone_verifications (
  id uuid primary key default gen_random_uuid(),
  phone_hash text not null,
  code_hash text not null,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  verified_at timestamptz
);
create index phone_verifications_phone on public.phone_verifications (phone_hash, created_at desc);
alter table public.phone_verifications enable row level security;
