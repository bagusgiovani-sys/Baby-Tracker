begin;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (length(display_name) <= 80),
  locale text not null default 'id-ID' check (locale in ('id-ID','en')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.babies (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (length(trim(nickname)) between 1 and 80),
  date_of_birth date not null,
  timezone text not null,
  gestation_weeks smallint check (gestation_weeks between 1 and 45),
  gestation_days smallint check (gestation_days between 0 and 6),
  growth_reference_sex text check (growth_reference_sex in ('female','male')),
  estimated_due_date date, solids_started_on date,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  check (gestation_days is null or gestation_weeks is not null)
);
create table public.baby_memberships (
  baby_id uuid not null references public.babies(id), user_id uuid not null references auth.users(id),
  role text not null check (role in ('owner','editor','viewer')),
  status text not null default 'active' check (status in ('active','revoked')),
  created_at timestamptz not null default now(), revoked_at timestamptz,
  primary key (baby_id,user_id)
);
create index memberships_by_user on public.baby_memberships(user_id,baby_id) where status='active';
create table public.guardian_consents (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
  baby_id uuid not null references public.babies(id), policy_version text not null,
  purpose_code text not null check (purpose_code='care_diary'),
  guardian_confirmed boolean not null check (guardian_confirmed),
  consented_at timestamptz not null default now(), revoked_at timestamptz,
  method text not null default 'explicit_checkbox'
);
create table public.audit_events (
  id uuid primary key default gen_random_uuid(), actor_id uuid not null references auth.users(id),
  baby_id uuid references public.babies(id), resource_type text not null, resource_id uuid not null,
  action text not null, at timestamptz not null default now(),
  change_summary_safe jsonb not null default '{}'::jsonb, request_id uuid
);
create table public.baby_invitations (
  id uuid primary key default gen_random_uuid(), baby_id uuid not null references public.babies(id),
  inviter_id uuid not null references auth.users(id), invitee_email_hash text not null,
  role text not null check (role in ('editor','viewer')), token_digest text not null unique,
  expires_at timestamptz not null, accepted_at timestamptz, revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create function public.has_baby_access(p_baby uuid, p_write boolean default false, p_owner boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.baby_memberships m join public.babies b on b.id=m.baby_id
    where m.baby_id=p_baby and m.user_id=auth.uid() and m.status='active' and b.deleted_at is null
    and (not p_write or m.role in ('owner','editor')) and (not p_owner or m.role='owner')
  );
$$;
revoke all on function public.has_baby_access(uuid,boolean,boolean) from public, anon, authenticated;
grant execute on function public.has_baby_access(uuid,boolean,boolean) to authenticated;

alter table public.profiles enable row level security;
alter table public.babies enable row level security;
alter table public.baby_memberships enable row level security;
alter table public.guardian_consents enable row level security;
alter table public.audit_events enable row level security;
alter table public.baby_invitations enable row level security;
create policy profiles_read on public.profiles for select to authenticated using (user_id=auth.uid());
create policy profiles_insert on public.profiles for insert to authenticated with check (user_id=auth.uid());
create policy profiles_update on public.profiles for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy babies_read on public.babies for select to authenticated using (public.has_baby_access(id));
create policy memberships_read on public.baby_memberships for select to authenticated using (
  public.has_baby_access(baby_id) and (user_id=auth.uid() or public.has_baby_access(baby_id,false,true))
);
create policy consent_read on public.guardian_consents for select to authenticated using (user_id=auth.uid() and public.has_baby_access(baby_id));
create policy audit_read on public.audit_events for select to authenticated using (public.has_baby_access(baby_id,false,true));
create policy invitations_read on public.baby_invitations for select to authenticated using (public.has_baby_access(baby_id,false,true));
-- Supabase's default privileges can grant table DML to API roles; remove them explicitly.
revoke all on public.profiles,public.babies,public.baby_memberships,public.guardian_consents,public.audit_events,public.baby_invitations from anon, authenticated;
grant select,insert,update on public.profiles to authenticated;
grant select on public.babies,public.baby_memberships,public.guardian_consents,public.audit_events,public.baby_invitations to authenticated;
-- All family mutations go through audited, authorized RPCs. No direct DML grants.

create function public.create_baby(p_input jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_baby public.babies; v_actor uuid := auth.uid(); v_timezone text := p_input->>'timezone';
begin
  if v_actor is null then raise exception 'unauthorized'; end if;
  if (p_input->>'guardian_confirmed')::boolean is distinct from true or p_input->>'policy_version' is distinct from '2026-10-draft' then raise exception 'consent_required'; end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name=v_timezone) then raise exception 'invalid_timezone'; end if;
  if (p_input->>'date_of_birth')::date > (now() at time zone v_timezone)::date then raise exception 'birth_in_future'; end if;
  if exists (select 1 from jsonb_object_keys(p_input) k where k not in ('nickname','date_of_birth','timezone','gestation_weeks','gestation_days','growth_reference_sex','guardian_confirmed','policy_version')) then raise exception 'validation'; end if;
  insert into public.profiles(user_id) values(v_actor) on conflict do nothing;
  insert into public.babies(nickname,date_of_birth,timezone,gestation_weeks,gestation_days,growth_reference_sex,created_by)
  values(trim(p_input->>'nickname'),(p_input->>'date_of_birth')::date,v_timezone,(p_input->>'gestation_weeks')::smallint,(p_input->>'gestation_days')::smallint,p_input->>'growth_reference_sex',v_actor)
  returning * into v_baby;
  insert into public.baby_memberships(baby_id,user_id,role) values(v_baby.id,v_actor,'owner');
  insert into public.guardian_consents(user_id,baby_id,policy_version,purpose_code,guardian_confirmed) values(v_actor,v_baby.id,'2026-10-draft','care_diary',true);
  insert into public.audit_events(actor_id,baby_id,resource_type,resource_id,action) values(v_actor,v_baby.id,'baby',v_baby.id,'create');
  return to_jsonb(v_baby) || jsonb_build_object('role','owner');
end;
$$;
revoke all on function public.create_baby(jsonb) from public, anon, authenticated;
grant execute on function public.create_baby(jsonb) to authenticated;

create function public.list_babies() returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(to_jsonb(b) || jsonb_build_object('role',m.role) order by b.created_at),'[]'::jsonb)
  from public.babies b join public.baby_memberships m on m.baby_id=b.id
  where m.user_id=auth.uid() and m.status='active' and b.deleted_at is null;
$$;
revoke all on function public.list_babies() from public, anon, authenticated;
grant execute on function public.list_babies() to authenticated;
commit;
