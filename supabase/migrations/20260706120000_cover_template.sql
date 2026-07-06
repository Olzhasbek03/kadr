-- Invitation card template chosen by the host at event creation.
-- Three fixed designs; the guest join page renders the matching card.
alter table public.events
  add column if not exists cover_template text not null default 'classic'
  check (cover_template in ('classic', 'botanical', 'noir'));
