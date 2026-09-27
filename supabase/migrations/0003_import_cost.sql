-- Keep what discovery found so retries skip the web search, and record measured API usage per import.
alter table public.policy_imports add column discovered jsonb;
alter table public.policy_imports add column usage jsonb not null default '{}';
