-- Run in the Supabase SQL editor after creating the project.
create table if not exists public.progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  coins integer not null default 0 check (coins >= 0),
  sessions integer not null default 0 check (sessions >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  minutes numeric(5,1) not null check (minutes between 0.1 and 180),
  mode text not null check (mode in ('regular', 'hard')),
  display_mode text not null check (display_mode in ('down', 'up')),
  outfit text not null check (outfit in ('blue', 'green', 'red')),
  claimed_at timestamptz,
  completed boolean,
  base_coins integer,
  hard_bonus integer,
  lucky_bonus integer,
  earned integer
);

create unique index if not exists one_open_focus_per_user
  on public.focus_sessions(user_id) where claimed_at is null;

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  rarity text not null check (rarity in ('common', 'rare', 'epic', 'legendary')),
  asset_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists pets_user_created on public.pets(user_id, created_at desc);

alter table public.progress enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.pets enable row level security;

drop policy if exists "Read own progress" on public.progress;
create policy "Read own progress" on public.progress for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Read own focus sessions" on public.focus_sessions;
create policy "Read own focus sessions" on public.focus_sessions for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Read own pets" on public.pets;
create policy "Read own pets" on public.pets for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.create_progress_for_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.progress(user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_focus_farmer on auth.users;
create trigger on_auth_user_created_focus_farmer after insert on auth.users
for each row execute function public.create_progress_for_user();
insert into public.progress(user_id) select id from auth.users on conflict do nothing;

create or replace function public.start_focus(p_minutes numeric, p_mode text, p_display_mode text, p_outfit text)
returns public.focus_sessions language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_session public.focus_sessions;
begin
  if v_user is null then raise exception 'Sign in first'; end if;
  if p_minutes is null or p_minutes < 0.1 or p_minutes > 180 or
     p_minutes <> round(p_minutes, 1) or
     p_mode not in ('regular','hard') or p_display_mode not in ('down','up') or
     p_outfit not in ('blue','green','red') then raise exception 'Invalid focus settings'; end if;
  -- Serializes starts for this user, including two browser tabs.
  perform 1 from public.progress where user_id = v_user for update;
  select * into v_session from public.focus_sessions
    where user_id = v_user and claimed_at is null limit 1;
  if found then return v_session; end if;
  insert into public.focus_sessions(user_id, ends_at, minutes, mode, display_mode, outfit)
  values (v_user, now() + (p_minutes * interval '1 minute'), p_minutes, p_mode, p_display_mode, p_outfit)
  returning * into v_session;
  return v_session;
end;
$$;

create or replace function public.reap_focus(p_session_id uuid)
returns public.focus_sessions language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_session public.focus_sessions; v_base integer; v_hard integer; v_lucky integer;
begin
  if v_user is null then raise exception 'Sign in first'; end if;
  select * into v_session from public.focus_sessions
    where id = p_session_id and user_id = v_user for update;
  if not found then raise exception 'Focus session not found'; end if;
  if v_session.claimed_at is not null then return v_session; end if;
  if now() < v_session.ends_at then
    update public.focus_sessions set claimed_at = now(), completed = false,
      base_coins = 0, hard_bonus = 0, lucky_bonus = 0, earned = 0
      where id = p_session_id returning * into v_session;
  else
    v_base := round(v_session.minutes * 10);
    v_hard := case when v_session.mode = 'hard' then floor(v_base * 0.5) else 0 end;
    v_lucky := case when v_session.mode = 'hard' and random() < 0.3 then 30 else 0 end;
    update public.focus_sessions set claimed_at = now(), completed = true,
      base_coins = v_base, hard_bonus = v_hard, lucky_bonus = v_lucky,
      earned = v_base + v_hard + v_lucky
      where id = p_session_id returning * into v_session;
    update public.progress set coins = coins + v_session.earned,
      sessions = sessions + 1 where user_id = v_user;
  end if;
  return v_session;
end;
$$;

create or replace function public.pull_egg()
returns public.pets language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_roll double precision; v_pet public.pets; v_name text; v_rarity text; v_asset text;
begin
  if v_user is null then raise exception 'Sign in first'; end if;
  update public.progress set coins = coins - 10
    where user_id = v_user and coins >= 10;
  if not found then raise exception 'You need 10 coins to pull an egg'; end if;
  v_roll := random();
  if v_roll < 0.5 then
    v_name := 'Wave Penguin'; v_rarity := 'common'; v_asset := 'wave';
  elsif v_roll < 0.8 then
    v_name := 'Yellow Hat Penguin'; v_rarity := 'rare'; v_asset := 'yellow_hat';
  elsif v_roll < 0.95 then
    v_name := 'Matcha Latte Penguin'; v_rarity := 'epic'; v_asset := 'matcha';
  elsif random() < 0.5 then
    v_name := 'Wizard Penguin'; v_rarity := 'legendary'; v_asset := 'wizard';
  else
    v_name := 'Surfs Up Penguin'; v_rarity := 'legendary'; v_asset := 'surfer';
  end if;
  insert into public.pets(user_id, name, rarity, asset_id)
    values (v_user, v_name, v_rarity, v_asset) returning * into v_pet;
  return v_pet;
end;
$$;

revoke all on function public.start_focus(numeric,text,text,text) from public, anon;
revoke all on function public.reap_focus(uuid) from public, anon;
revoke all on function public.pull_egg() from public, anon;
grant execute on function public.start_focus(numeric,text,text,text) to authenticated;
grant execute on function public.reap_focus(uuid) to authenticated;
grant execute on function public.pull_egg() to authenticated;
grant select on public.progress, public.focus_sessions, public.pets to authenticated;
