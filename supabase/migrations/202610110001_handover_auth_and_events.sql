-- Additive initial schema for Hand Over. Apply only after reviewing the target Supabase project.
do $$
begin
  if to_regclass('public.user_profiles') is not null
    or to_regclass('public.handover_events') is not null
    or to_regclass('public.handover_event_updates') is not null then
    raise exception 'Hand Over tables already exist. Review the existing schema before applying this migration.';
  end if;
end;
$$;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create function public.create_handover_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'مستخدم')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_handover_profile
  after insert on auth.users
  for each row execute procedure public.create_handover_profile();

insert into public.user_profiles (id, display_name)
select id,
  coalesce(nullif(trim(raw_user_meta_data ->> 'full_name'), ''), nullif(split_part(coalesce(email, ''), '@', 1), ''), 'مستخدم')
from auth.users
on conflict (id) do nothing;

create table if not exists public.handover_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 180),
  event_date date not null,
  details text not null check (char_length(trim(details)) between 1 and 5000),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.handover_event_updates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.handover_events(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete restrict,
  body text not null check (char_length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create function public.update_handover_event(
  p_event_id uuid,
  p_title text,
  p_event_date date,
  p_details text,
  p_status text,
  p_body text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.handover_events
  set title = p_title,
      event_date = p_event_date,
      details = p_details,
      status = p_status,
      updated_at = now()
  where id = p_event_id and created_by = (select auth.uid());

  if not found then
    return false;
  end if;

  insert into public.handover_event_updates (event_id, author_id, body)
  values (p_event_id, (select auth.uid()), p_body);
  return true;
end;
$$;

create function public.create_handover_event(
  p_title text,
  p_event_date date,
  p_details text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_event_id uuid;
begin
  insert into public.handover_events (title, event_date, details, created_by)
  values (p_title, p_event_date, p_details, (select auth.uid()))
  returning id into new_event_id;

  insert into public.handover_event_updates (event_id, author_id, body)
  values (new_event_id, (select auth.uid()), p_details);

  return new_event_id;
end;
$$;

create index if not exists handover_events_created_at_idx
  on public.handover_events (created_at desc);
create index if not exists handover_event_updates_event_created_idx
  on public.handover_event_updates (event_id, created_at asc);

alter table public.user_profiles enable row level security;
alter table public.handover_events enable row level security;
alter table public.handover_event_updates enable row level security;

revoke all on public.user_profiles, public.handover_events, public.handover_event_updates from anon;
grant select on public.user_profiles to authenticated;
grant select, insert, update, delete on public.handover_events to authenticated;
grant select, insert on public.handover_event_updates to authenticated;
revoke all on function public.update_handover_event(uuid, text, date, text, text, text) from public, anon;
grant execute on function public.update_handover_event(uuid, text, date, text, text, text) to authenticated;
revoke all on function public.create_handover_event(text, date, text) from public, anon;
grant execute on function public.create_handover_event(text, date, text) to authenticated;

create policy "Authenticated users can view profiles"
  on public.user_profiles for select to authenticated
  using ((select auth.uid()) is not null);

create policy "Authenticated users can view handover events"
  on public.handover_events for select to authenticated
  using ((select auth.uid()) is not null);

create policy "Authenticated users can create handover events"
  on public.handover_events for insert to authenticated
  with check ((select auth.uid()) = created_by);

create policy "Creators can update their handover events"
  on public.handover_events for update to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);

create policy "Creators can delete their handover events"
  on public.handover_events for delete to authenticated
  using ((select auth.uid()) = created_by);

create policy "Authenticated users can view event updates"
  on public.handover_event_updates for select to authenticated
  using ((select auth.uid()) is not null);

create policy "Users can add their own event updates"
  on public.handover_event_updates for insert to authenticated
  with check (
    (select auth.uid()) = author_id
    and exists (select 1 from public.handover_events e where e.id = event_id)
  );
