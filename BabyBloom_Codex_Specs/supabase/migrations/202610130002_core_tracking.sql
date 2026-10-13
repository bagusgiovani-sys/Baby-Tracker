begin;
create table public.care_events (
  id uuid primary key, client_event_id uuid not null, baby_id uuid not null references public.babies(id),
  event_type text not null check (event_type in ('feeding','diaper','sleep')),
  occurred_at timestamptz not null, ended_at timestamptz,
  recorded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default clock_timestamp(), deleted_at timestamptz,
  server_version bigint not null default 1 check (server_version>0), note text check (length(note)<=1000),
  unique(baby_id,client_event_id), check (ended_at is null or ended_at>=occurred_at),
  check (event_type <> 'diaper' or ended_at is null)
);
create index care_events_timeline on public.care_events(baby_id,occurred_at desc);
create index care_events_pull on public.care_events(baby_id,updated_at,id);
create unique index one_active_sleep_per_baby on public.care_events(baby_id) where event_type='sleep' and ended_at is null and deleted_at is null;
create table public.feeding_details (
  event_id uuid primary key references public.care_events(id) on delete cascade,
  feeding_kind text not null check (feeding_kind in ('direct_breast','expressed_breastmilk_bottle','formula_bottle','mixed_bottle','other_bottle')),
  breast_side text check (breast_side in ('left','right','both','unknown')),
  volume_offered_ml numeric(6,1) check (volume_offered_ml>=0 and volume_offered_ml<2000),
  volume_consumed_ml numeric(6,1) check (volume_consumed_ml>=0),
  check (volume_consumed_ml<=volume_offered_ml),
  check (feeding_kind<>'direct_breast' or (volume_offered_ml is null and volume_consumed_ml is null)),
  check (feeding_kind='direct_breast' or breast_side is null)
);
create table public.diaper_details (
  event_id uuid primary key references public.care_events(id) on delete cascade,
  diaper_kind text not null check (diaper_kind in ('wet','dirty','both','dry')),
  stool_color text check (stool_color in ('yellow','brown','green','black','red','pale_white_grey','other','unknown')),
  stool_consistency text check (stool_consistency in ('watery','soft','pasty','formed','hard','unknown')),
  stool_amount text check (stool_amount in ('small','medium','large','unknown')),
  blood_seen text check (blood_seen in ('yes','no','unsure','not_observed')),
  mucus_seen text check (mucus_seen in ('yes','no','unsure','not_observed')),
  urine_unusual text check (urine_unusual in ('yes','no','unsure')),
  rash_present text check (rash_present in ('yes','no','unsure')),
  check (diaper_kind in ('dirty','both') or (stool_color is null and stool_consistency is null and stool_amount is null and blood_seen is null and mucus_seen is null)),
  check (diaper_kind in ('wet','both') or urine_unusual is null)
);
create table public.sleep_details (
  event_id uuid primary key references public.care_events(id) on delete cascade,
  sleep_kind text check (sleep_kind in ('nap','night','unspecified')),
  interruptions_count smallint check (interruptions_count between 0 and 30)
);
create table public.mutation_receipts (
  mutation_id uuid primary key, actor_id uuid not null references auth.users(id), baby_id uuid not null references public.babies(id),
  event_id uuid not null references public.care_events(id), fingerprint text not null, accepted_version bigint not null, accepted_at timestamptz not null default now()
);
create table public.daily_checkins (
  id uuid primary key default gen_random_uuid(), baby_id uuid not null references public.babies(id),
  local_day date not null, timezone_at_entry text not null,
  state text not null check (state in ('draft','completed')),
  overall text check (overall in ('usual','different','unsure','not_answered')),
  feeding_vs_usual text check (feeding_vs_usual in ('as_usual','less','difficulty','unsure','not_answered')),
  wet_diapers_vs_usual text check (wet_diapers_vs_usual in ('as_expected','fewer','unsure','not_answered')),
  sleep_concern text check (sleep_concern in ('none_reported','yes','unsure','not_answered')),
  new_symptoms text check (new_symptoms in ('none_reported','yes','unsure','not_answered')),
  parent_concern text check (length(parent_concern)<=2000), recorded_by uuid not null references auth.users(id),
  server_version bigint not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(baby_id,local_day)
);
alter table public.care_events enable row level security;
alter table public.feeding_details enable row level security;
alter table public.diaper_details enable row level security;
alter table public.sleep_details enable row level security;
alter table public.mutation_receipts enable row level security;
alter table public.daily_checkins enable row level security;
create policy events_read on public.care_events for select to authenticated using (public.has_baby_access(baby_id));
create policy feeding_read on public.feeding_details for select to authenticated using (exists(select 1 from public.care_events e where e.id=event_id and public.has_baby_access(e.baby_id)));
create policy diaper_read on public.diaper_details for select to authenticated using (exists(select 1 from public.care_events e where e.id=event_id and public.has_baby_access(e.baby_id)));
create policy sleep_read on public.sleep_details for select to authenticated using (exists(select 1 from public.care_events e where e.id=event_id and public.has_baby_access(e.baby_id)));
create policy checkin_read on public.daily_checkins for select to authenticated using (public.has_baby_access(baby_id));
-- Receipts are internal. Check-in writes arrive in Sprint 2.
revoke all on public.care_events,public.feeding_details,public.diaper_details,public.sleep_details,public.daily_checkins,public.mutation_receipts from anon, authenticated;
grant select on public.care_events,public.feeding_details,public.diaper_details,public.sleep_details,public.daily_checkins to authenticated;

create function public.care_event_json(p_id uuid) returns jsonb language sql stable set search_path='' as $$
  select jsonb_build_object('id',e.id,'baby_id',e.baby_id,'event_type',e.event_type,'occurred_at',e.occurred_at,'ended_at',e.ended_at,
    'recorded_by',e.recorded_by,'server_version',e.server_version,'deleted_at',e.deleted_at,'note',e.note,'sync_status','synced','updated_at',e.updated_at,
    'detail',case e.event_type when 'feeding' then to_jsonb(f)-'event_id' when 'diaper' then to_jsonb(d)-'event_id' when 'sleep' then to_jsonb(s)-'event_id' end)
  from public.care_events e left join public.feeding_details f on f.event_id=e.id left join public.diaper_details d on d.event_id=e.id left join public.sleep_details s on s.event_id=e.id where e.id=p_id;
$$;
revoke all on function public.care_event_json(uuid) from public, anon, authenticated;

create function public.save_care_event(p_event jsonb,p_mutation_id uuid,p_expected_version bigint,p_operation text,p_future_confirmed boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_id uuid := (p_event->>'id')::uuid; v_baby uuid := (p_event->>'baby_id')::uuid; v_actor uuid := auth.uid();
  v_existing public.care_events; v_receipt public.mutation_receipts; v_detail jsonb := p_event->'detail';
  v_type text := p_event->>'event_type'; v_fingerprint text := md5(jsonb_build_array(p_event,p_expected_version,p_operation,p_future_confirmed)::text);
  v_start timestamptz := (p_event->>'occurred_at')::timestamptz; v_end timestamptz := (p_event->>'ended_at')::timestamptz;
begin
  if not public.has_baby_access(v_baby,true) then raise exception 'unauthorized'; end if;
  -- Serialize per baby: first-create races and active timer collisions are atomic.
  perform 1 from public.babies where id=v_baby for update;
  select * into v_receipt from public.mutation_receipts where mutation_id=p_mutation_id;
  if found then
    if v_receipt.actor_id<>v_actor or v_receipt.baby_id<>v_baby or v_receipt.fingerprint<>v_fingerprint then raise exception 'validation'; end if;
    return jsonb_build_object('ok',true,'accepted_version',v_receipt.accepted_version,'event',public.care_event_json(v_receipt.event_id));
  end if;
  select * into v_existing from public.care_events where id=v_id and baby_id=v_baby for update;
  if v_existing.id is not null then
    if v_existing.deleted_at is not null then return jsonb_build_object('ok',false,'kind','conflict','current',public.care_event_json(v_id)); end if;
    if p_expected_version is distinct from v_existing.server_version then return jsonb_build_object('ok',false,'kind','conflict','current',public.care_event_json(v_id)); end if;
    if p_operation not in ('update','delete') or v_type<>v_existing.event_type then raise exception 'validation'; end if;
  elsif p_operation is distinct from 'create' or p_expected_version is distinct from 0 then raise exception 'validation';
  end if;
  if p_operation='delete' then
    update public.care_events set deleted_at=now(),updated_at=clock_timestamp(),server_version=server_version+1 where id=v_id;
  else
    if v_type is null or v_type not in ('feeding','diaper','sleep') or jsonb_typeof(v_detail) is distinct from 'object' then raise exception 'validation'; end if;
    if exists(select 1 from jsonb_object_keys(p_event) k where k not in ('id','baby_id','event_type','occurred_at','ended_at','note','detail')) then raise exception 'validation'; end if;
    if not p_future_confirmed and (v_start>now()+interval '5 minutes' or v_end>now()+interval '5 minutes') then raise exception 'future_confirmation'; end if;
    if v_existing.id is null then
      insert into public.care_events(id,client_event_id,baby_id,event_type,occurred_at,ended_at,note,recorded_by) values(v_id,v_id,v_baby,v_type,v_start,v_end,p_event->>'note',v_actor);
    else
      update public.care_events set occurred_at=v_start,ended_at=v_end,note=p_event->>'note',updated_at=clock_timestamp(),server_version=server_version+1 where id=v_id;
    end if;
    if v_type='feeding' then
      if exists(select 1 from jsonb_object_keys(v_detail) k where k not in ('feeding_kind','breast_side','volume_offered_ml','volume_consumed_ml')) then raise exception 'validation'; end if;
      if (v_detail->>'volume_offered_ml')::numeric <> round((v_detail->>'volume_offered_ml')::numeric,1) or (v_detail->>'volume_consumed_ml')::numeric <> round((v_detail->>'volume_consumed_ml')::numeric,1) then raise exception 'validation'; end if;
      insert into public.feeding_details(event_id,feeding_kind,breast_side,volume_offered_ml,volume_consumed_ml)
      values(v_id,v_detail->>'feeding_kind',v_detail->>'breast_side',(v_detail->>'volume_offered_ml')::numeric,(v_detail->>'volume_consumed_ml')::numeric)
      on conflict(event_id) do update set feeding_kind=excluded.feeding_kind,breast_side=excluded.breast_side,volume_offered_ml=excluded.volume_offered_ml,volume_consumed_ml=excluded.volume_consumed_ml;
    elsif v_type='diaper' then
      if exists(select 1 from jsonb_object_keys(v_detail) k where k not in ('diaper_kind','stool_color','stool_consistency','stool_amount','blood_seen','mucus_seen','urine_unusual','rash_present')) then raise exception 'validation'; end if;
      insert into public.diaper_details(event_id,diaper_kind,stool_color,stool_consistency,stool_amount,blood_seen,mucus_seen,urine_unusual,rash_present)
      values(v_id,v_detail->>'diaper_kind',v_detail->>'stool_color',v_detail->>'stool_consistency',v_detail->>'stool_amount',v_detail->>'blood_seen',v_detail->>'mucus_seen',v_detail->>'urine_unusual',v_detail->>'rash_present')
      on conflict(event_id) do update set diaper_kind=excluded.diaper_kind,stool_color=excluded.stool_color,stool_consistency=excluded.stool_consistency,stool_amount=excluded.stool_amount,blood_seen=excluded.blood_seen,mucus_seen=excluded.mucus_seen,urine_unusual=excluded.urine_unusual,rash_present=excluded.rash_present;
    else
      if exists(select 1 from jsonb_object_keys(v_detail) k where k not in ('sleep_kind','interruptions_count')) then raise exception 'validation'; end if;
      insert into public.sleep_details(event_id,sleep_kind,interruptions_count) values(v_id,v_detail->>'sleep_kind',(v_detail->>'interruptions_count')::smallint)
      on conflict(event_id) do update set sleep_kind=excluded.sleep_kind,interruptions_count=excluded.interruptions_count;
    end if;
  end if;
  insert into public.mutation_receipts(mutation_id,actor_id,baby_id,event_id,fingerprint,accepted_version) values(p_mutation_id,v_actor,v_baby,v_id,v_fingerprint,(select server_version from public.care_events where id=v_id));
  insert into public.audit_events(actor_id,baby_id,resource_type,resource_id,action,request_id,change_summary_safe)
  values(v_actor,v_baby,'care_event',v_id,p_operation,p_mutation_id,jsonb_build_object('server_version',(select server_version from public.care_events where id=v_id)));
  return jsonb_build_object('ok',true,'accepted_version',(select server_version from public.care_events where id=v_id),'event',public.care_event_json(v_id));
exception when unique_violation then
  if exists(select 1 from public.care_events where baby_id=v_baby and event_type='sleep' and ended_at is null and deleted_at is null) and v_type='sleep' then raise exception 'active_sleep_conflict'; end if;
  raise exception 'validation';
end;
$$;
revoke all on function public.save_care_event(jsonb,uuid,bigint,text,boolean) from public, anon, authenticated;
grant execute on function public.save_care_event(jsonb,uuid,bigint,text,boolean) to authenticated;

create function public.list_events(p_baby_id uuid,p_after timestamptz default null,p_after_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.has_baby_access(p_baby_id) then raise exception 'unauthorized'; end if;
  return coalesce((select jsonb_agg(public.care_event_json(e.id) order by e.updated_at,e.id) from (
    select id,updated_at from public.care_events where baby_id=p_baby_id and (p_after is null or (updated_at,id)>(p_after,coalesce(p_after_id,'00000000-0000-0000-0000-000000000000'::uuid))) order by updated_at,id limit 500
  ) e),'[]'::jsonb);
end;
$$;
revoke all on function public.list_events(uuid,timestamptz,uuid) from public, anon, authenticated;
grant execute on function public.list_events(uuid,timestamptz,uuid) to authenticated;
commit;
