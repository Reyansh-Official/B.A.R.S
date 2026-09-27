-- B.A.R.S. (Bill Accessibility & Relief System) schema. Run once in the Supabase SQL editor (or `supabase db push`).

-- Which hospital each counselor account belongs to. Accounts without a row here have no access.
create table public.counselors (
  user_id uuid primary key references auth.users (id) on delete cascade,
  hospital_id text not null,
  created_at timestamptz not null default now()
);

alter table public.counselors enable row level security;

create policy "Counselors can read their own row"
  on public.counselors for select to authenticated
  using (user_id = (select auth.uid()));

-- Looks up the signed-in counselor's hospital for the policies below.
create function public.my_hospital() returns text
  language sql stable security definer set search_path = ''
  as $$ select hospital_id from public.counselors where user_id = (select auth.uid()) $$;

revoke execute on function public.my_hospital() from public, anon;
grant execute on function public.my_hospital() to authenticated;

-- Applications. Patients never query this table directly; the server checks their private key
-- (only its SHA-256 hash is stored) and acts for them with the secret key.
create table public.applications (
  id text primary key,
  hospital_id text not null,
  status text not null check (status in ('submitted', 'info_requested', 'responded', 'in_review')),
  sample boolean not null default false,
  access_token_hash text,
  data jsonb not null,
  submitted_at timestamptz not null,
  updated_at timestamptz not null
);

create index applications_hospital_submitted on public.applications (hospital_id, submitted_at desc);

alter table public.applications enable row level security;

create policy "Counselors read their hospital's applications"
  on public.applications for select to authenticated
  using (hospital_id = (select public.my_hospital()));

create policy "Counselors update their hospital's applications"
  on public.applications for update to authenticated
  using (hospital_id = (select public.my_hospital()))
  with check (hospital_id = (select public.my_hospital()));

create policy "Counselors add sample applications for their hospital"
  on public.applications for insert to authenticated
  with check (hospital_id = (select public.my_hospital()) and sample);

create policy "Counselors remove their hospital's sample applications"
  on public.applications for delete to authenticated
  using (hospital_id = (select public.my_hospital()) and sample);
