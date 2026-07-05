-- Hosts can restrict which film styles guests may shoot with.
-- NULL means every style is allowed (the default and the common case).

alter table public.events
  add column allowed_styles text[]
  check (allowed_styles is null or array_length(allowed_styles, 1) >= 1);
