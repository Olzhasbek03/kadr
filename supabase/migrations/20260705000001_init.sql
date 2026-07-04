-- Kadr v2 — shared disposable camera for events.
-- Schema: events, guests, photos, payments + RLS + private storage bucket.

-- ============================================================ tables

create table public.events (
  id              uuid primary key default gen_random_uuid(),
  host_user_id    uuid not null references auth.users (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 120),
  slug            text not null unique,
  event_date      timestamptz not null,
  end_time        timestamptz not null,
  shots_per_guest int  not null default 10 check (shots_per_guest between 1 and 100),
  max_guests      int  check (max_guests between 1 and 2000),
  reveal_mode     text not null check (reveal_mode in ('instant', 'event_end', 'custom')),
  reveal_at       timestamptz not null,
  filter_preset   text not null default 'original',
  cover_image_url text,
  status          text not null default 'draft' check (status in ('draft', 'active')),
  price           int  not null default 0 check (price >= 0),
  created_at      timestamptz not null default now()
);

create index events_host_idx on public.events (host_user_id, created_at desc);
create index events_slug_idx on public.events (slug);

create table public.guests (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events (id) on delete cascade,
  device_token text not null,
  display_name text check (char_length(display_name) <= 80),
  shots_used   int  not null default 0 check (shots_used >= 0),
  created_at   timestamptz not null default now(),
  unique (event_id, device_token)
);

create index guests_event_idx on public.guests (event_id);

create table public.photos (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events (id) on delete cascade,
  guest_id      uuid not null references public.guests (id) on delete cascade,
  original_path text not null,   -- storage path of the untouched full-res original
  thumb_path    text,            -- storage path of a small preview
  filter        text not null default 'original',  -- display-time film style chosen at capture
  created_at    timestamptz not null default now()
);

create index photos_event_idx on public.photos (event_id, created_at);
create index photos_guest_idx on public.photos (guest_id);

create table public.payments (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  provider    text not null,
  external_id text not null,
  amount      int  not null check (amount >= 0),
  status      text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  created_at  timestamptz not null default now(),
  unique (provider, external_id)
);

create index payments_event_idx on public.payments (event_id);

-- ================================================= atomic shot counter
-- Consumes one shot iff the guest still has film. Returns false when empty,
-- so the upload endpoint can reject without a race between check and insert.

create or replace function public.consume_shot(p_guest_id uuid, p_limit int)
returns boolean
language sql
security definer
set search_path = public
as $$
  update public.guests
     set shots_used = shots_used + 1
   where id = p_guest_id
     and shots_used < p_limit
  returning true;
$$;

revoke all on function public.consume_shot(uuid, int) from public, anon, authenticated;

-- Returns a shot after a failed upload so guests never lose film to errors.
create or replace function public.refund_shot(p_guest_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.guests
     set shots_used = shots_used - 1
   where id = p_guest_id
     and shots_used > 0;
$$;

revoke all on function public.refund_shot(uuid) from public, anon, authenticated;

-- ============================================================ grants
-- RLS filters rows, but Postgres still needs table-level privileges.
-- service_role (used by the guest/webhook API routes) gets full access and
-- bypasses RLS. authenticated hosts get CRUD on events + read on the rest,
-- then RLS scopes every statement to their own rows. anon gets nothing:
-- guests never touch the database directly.

grant all on public.events, public.guests, public.photos, public.payments to service_role;
grant execute on function public.consume_shot(uuid, int) to service_role;
grant execute on function public.refund_shot(uuid) to service_role;

grant select, insert, update, delete on public.events to authenticated;
grant select on public.guests  to authenticated;
grant select on public.photos  to authenticated;
grant select on public.payments to authenticated;

-- ============================================================ RLS
-- Hosts touch their own rows through the authed client. Guests have NO direct
-- database access: every guest interaction goes through server API routes
-- using the service-role key, which enforce shot limits and reveal gating.

alter table public.events   enable row level security;
alter table public.guests   enable row level security;
alter table public.photos   enable row level security;
alter table public.payments enable row level security;

create policy "hosts manage own events"
  on public.events for all
  using (auth.uid() = host_user_id)
  with check (auth.uid() = host_user_id);

create policy "hosts read own guests"
  on public.guests for select
  using (exists (select 1 from public.events e
                 where e.id = event_id and e.host_user_id = auth.uid()));

create policy "hosts read own photos"
  on public.photos for select
  using (exists (select 1 from public.events e
                 where e.id = event_id and e.host_user_id = auth.uid()));

create policy "hosts read own payments"
  on public.payments for select
  using (exists (select 1 from public.events e
                 where e.id = event_id and e.host_user_id = auth.uid()));

-- ============================================================ storage
-- Private bucket: no public reads. All viewing goes through short-lived
-- signed URLs minted server-side after reveal/ownership checks.

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;
