-- Photos are unlimited per guest. The old constraint capped shots_per_guest
-- at 100; raise the ceiling so the app's "unlimited" sentinel (100000) fits.
-- The column stays NOT NULL and the atomic consume_shot RPC keeps working
-- unchanged (it just never reaches the sentinel at a real event).
alter table public.events
  drop constraint if exists events_shots_per_guest_check;

alter table public.events
  add constraint events_shots_per_guest_check
  check (shots_per_guest between 1 and 1000000);
