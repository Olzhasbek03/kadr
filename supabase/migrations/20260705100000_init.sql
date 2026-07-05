-- Kormem — shared disposable camera for any celebration.
-- Clean consolidated schema (payments removed; photo + video + voice media).
-- Tables: events, guests, media. RLS + private storage bucket.
--
-- Cost-control notes (Supabase free tier: 1 GB storage / 5 GB egress):
--   photo ≈ 0.45 MB (client-resized 2000px JPEG q0.8)
--   video ≈ 3.3 MB (720p, ≤10 s, ~2.5 Mbps)  → per-guest sub-cap 3
--   voice ≈ 0.4 MB (AAC/Opus 48 kbps, ≤60 s) → per-guest sub-cap 1
-- All three share the per-guest shot budget (events.shots_per_guest).

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
  -- Every event is live from creation; the host may end one early.
  status          text not null default 'active' check (status in ('active', 'ended')),
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
  video_count  int  not null default 0 check (video_count >= 0),
  audio_count  int  not null default 0 check (audio_count >= 0),
  created_at   timestamptz not null default now(),
  unique (event_id, device_token)
);

create index guests_event_idx on public.guests (event_id);

create table public.media (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events (id) on delete cascade,
  guest_id     uuid not null references public.guests (id) on delete cascade,
  media_type   text not null check (media_type in ('photo', 'video', 'audio')),
  -- {event_id}/{guest_id}/{media_id}.{ext} in the private 'media' bucket
  storage_path text not null,
  -- photo thumbnail or video poster frame; null for audio
  thumb_path   text,
  mime_type    text not null,
  size_bytes   int  not null check (size_bytes > 0),
  -- video/audio duration; also serves players because MediaRecorder output
  -- often lacks a duration header
  duration_s   numeric,
  -- display-time film style chosen at capture (never baked into the file)
  filter       text not null default 'original',
  created_at   timestamptz not null default now()
);

create index media_event_idx on public.media (event_id, created_at);
create index media_guest_idx on public.media (guest_id, created_at desc);

-- ================================================= atomic shot counter
-- Consumes one shot iff the guest still has budget for this media type:
-- the shared shot budget AND the per-type sub-cap are checked in a single
-- UPDATE, so parallel uploads can never exceed either limit.

create or replace function public.consume_shot(
  p_guest_id uuid,
  p_media_type text,
  p_shot_limit int,
  p_video_cap int,
  p_audio_cap int
)
returns boolean
language sql
security definer
set search_path = public
as $$
  update public.guests
     set shots_used  = shots_used + 1,
         video_count = video_count + (p_media_type = 'video')::int,
         audio_count = audio_count + (p_media_type = 'audio')::int
   where id = p_guest_id
     and shots_used < p_shot_limit
     and (p_media_type <> 'video' or video_count < p_video_cap)
     and (p_media_type <> 'audio' or audio_count < p_audio_cap)
  returning true;
$$;

revoke all on function public.consume_shot(uuid, text, int, int, int) from public, anon, authenticated;

-- Returns a shot after a failed upload so guests never lose film to errors.
create or replace function public.refund_shot(p_guest_id uuid, p_media_type text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.guests
     set shots_used  = greatest(0, shots_used - 1),
         video_count = greatest(0, video_count - (p_media_type = 'video')::int),
         audio_count = greatest(0, audio_count - (p_media_type = 'audio')::int)
   where id = p_guest_id
     and shots_used > 0;
$$;

revoke all on function public.refund_shot(uuid, text) from public, anon, authenticated;

-- ============================================================ grants
-- RLS filters rows, but Postgres still needs table-level privileges.
-- service_role (used by the guest API routes) gets full access and bypasses
-- RLS. authenticated hosts get CRUD on events, read on guests, read+delete
-- on media (moderation); RLS scopes every statement to their own rows.
-- anon gets nothing: guests never touch the database directly.

grant all on public.events, public.guests, public.media to service_role;
grant execute on function public.consume_shot(uuid, text, int, int, int) to service_role;
grant execute on function public.refund_shot(uuid, text) to service_role;

grant select, insert, update, delete on public.events to authenticated;
grant select on public.guests to authenticated;
grant select, delete on public.media to authenticated;

-- ============================================================ RLS
-- Hosts touch their own rows through the authed client. Guests have NO
-- direct database access: every guest interaction goes through server API
-- routes using the service-role key, which enforce shot limits, sub-caps
-- and reveal gating.

alter table public.events enable row level security;
alter table public.guests enable row level security;
alter table public.media  enable row level security;

create policy "hosts manage own events"
  on public.events for all
  using (auth.uid() = host_user_id)
  with check (auth.uid() = host_user_id);

create policy "hosts read own guests"
  on public.guests for select
  using (exists (select 1 from public.events e
                 where e.id = event_id and e.host_user_id = auth.uid()));

create policy "hosts read own media"
  on public.media for select
  using (exists (select 1 from public.events e
                 where e.id = event_id and e.host_user_id = auth.uid()));

-- Moderation: hosts may remove any guest capture from their own events
-- before (or after) the reveal.
create policy "hosts delete own media"
  on public.media for delete
  using (exists (select 1 from public.events e
                 where e.id = event_id and e.host_user_id = auth.uid()));

-- ============================================================ storage
-- Private bucket: no public reads. All viewing goes through short-lived
-- signed URLs minted server-side after reveal/ownership checks.

insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;
