begin;
alter table public.care_events drop constraint care_events_event_type_check;
alter table public.care_events add constraint care_events_event_type_check check(event_type in ('feeding','diaper','sleep','meal','measurement','checkin'));
alter table public.care_events add constraint instantaneous_journal check(event_type not in ('meal','measurement','checkin') or ended_at is null);
create table public.meal_details (
 event_id uuid primary key references public.care_events(id) on delete cascade,
 food_name text not null check(length(trim(food_name)) between 1 and 120),ingredients text check(length(ingredients)<=1000),
 portion_offered numeric check(portion_offered between 0 and 10000),portion_consumed numeric check(portion_consumed between 0 and 10000),
 portion_unit text not null check(portion_unit in ('g','ml','tsp','tbsp','piece','serving')),
 texture text check(texture in ('puree','mashed','soft_pieces','family_food','other','unknown')),
 first_exposure text check(first_exposure in ('yes','no','unsure')),reaction text check(reaction in ('none_observed','observed','unsure','not_observed')),
 check(portion_consumed<=portion_offered)
);
create table public.event_nutrition (
 event_id uuid primary key references public.care_events(id) on delete cascade,
 source text not null check(length(trim(source)) between 1 and 200),
 calories_kcal numeric check(calories_kcal between 0 and 100000),
 protein_g numeric check(protein_g between 0 and 100000),
 carbs_g numeric check(carbs_g between 0 and 100000),
 fat_g numeric check(fat_g between 0 and 100000),
 fiber_g numeric check(fiber_g between 0 and 100000),
 iron_mg numeric check(iron_mg between 0 and 100000),
 calcium_mg numeric check(calcium_mg between 0 and 100000)
);
create table public.measurement_details (
 event_id uuid primary key references public.care_events(id) on delete cascade,
 weight_kg numeric check(weight_kg>0 and weight_kg<=100),length_cm numeric check(length_cm>0 and length_cm<=200),head_cm numeric check(head_cm>0 and head_cm<=100),
 check(weight_kg is not null or length_cm is not null or head_cm is not null)
);
create table public.checkin_details (
 event_id uuid primary key references public.care_events(id) on delete cascade,baby_id uuid not null references public.babies(id),local_day date not null,timezone_at_entry text not null,
 state text not null check(state in ('draft','completed')),
 overall text not null check(overall in ('usual','different','unsure','not_answered')),
 feeding_vs_usual text not null check(feeding_vs_usual in ('as_usual','less','difficulty','unsure','not_answered')),
 wet_diapers_vs_usual text not null check(wet_diapers_vs_usual in ('as_expected','fewer','unsure','not_answered')),
 sleep_concern text not null check(sleep_concern in ('none_reported','yes','unsure','not_answered')),
 new_symptoms text not null check(new_symptoms in ('none_reported','yes','unsure','not_answered')),parent_concern text check(length(parent_concern)<=2000),
 unique(baby_id,local_day)
);
alter table public.meal_details enable row level security;
create policy meal_details_read on public.meal_details for select to authenticated using(exists(select 1 from public.care_events e where e.id=event_id and public.has_baby_access(e.baby_id)));
revoke all on public.meal_details from anon,authenticated;
grant select on public.meal_details to authenticated;
alter table public.event_nutrition enable row level security;
create policy event_nutrition_read on public.event_nutrition for select to authenticated using(exists(select 1 from public.care_events e where e.id=event_id and public.has_baby_access(e.baby_id)));
revoke all on public.event_nutrition from anon,authenticated;
grant select on public.event_nutrition to authenticated;
alter table public.measurement_details enable row level security;
create policy measurement_details_read on public.measurement_details for select to authenticated using(exists(select 1 from public.care_events e where e.id=event_id and public.has_baby_access(e.baby_id)));
revoke all on public.measurement_details from anon,authenticated;
grant select on public.measurement_details to authenticated;
alter table public.checkin_details enable row level security;
create policy checkin_details_read on public.checkin_details for select to authenticated using(exists(select 1 from public.care_events e where e.id=event_id and public.has_baby_access(e.baby_id)));
revoke all on public.checkin_details from anon,authenticated;
grant select on public.checkin_details to authenticated;
create or replace function public.care_event_json(p_id uuid) returns jsonb language sql stable set search_path='' as $$
  select jsonb_build_object('id',e.id,'baby_id',e.baby_id,'event_type',e.event_type,'occurred_at',e.occurred_at,'ended_at',e.ended_at,
    'recorded_by',e.recorded_by,'server_version',e.server_version,'deleted_at',e.deleted_at,'note',e.note,'sync_status','synced','updated_at',e.updated_at,
    'detail',case e.event_type when 'feeding' then (to_jsonb(f)-'event_id') || case when n.event_id is not null then jsonb_build_object('nutrition',to_jsonb(n)-'event_id') else '{}'::jsonb end when 'diaper' then to_jsonb(d)-'event_id' when 'sleep' then to_jsonb(s)-'event_id' when 'meal' then (to_jsonb(m)-'event_id') || jsonb_build_object('nutrition',case when n.event_id is null then null else to_jsonb(n)-'event_id' end) when 'measurement' then to_jsonb(g)-'event_id' when 'checkin' then to_jsonb(c)-'event_id'-'baby_id' end)
  from public.care_events e left join public.feeding_details f on f.event_id=e.id left join public.diaper_details d on d.event_id=e.id left join public.sleep_details s on s.event_id=e.id left join public.meal_details m on m.event_id=e.id left join public.event_nutrition n on n.event_id=e.id left join public.measurement_details g on g.event_id=e.id left join public.checkin_details c on c.event_id=e.id where e.id=p_id;
$$;
revoke all on function public.care_event_json(uuid) from public, anon, authenticated;

create or replace function public.save_care_event(p_event jsonb,p_mutation_id uuid,p_expected_version bigint,p_operation text,p_future_confirmed boolean default false)
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
    if v_type is null or v_type not in ('feeding','diaper','sleep','meal','measurement','checkin') or jsonb_typeof(v_detail) is distinct from 'object' then raise exception 'validation'; end if;
    if exists(select 1 from jsonb_object_keys(p_event) k where k not in ('id','baby_id','event_type','occurred_at','ended_at','note','detail')) then raise exception 'validation'; end if;
    if not p_future_confirmed and (v_start>now()+interval '5 minutes' or v_end>now()+interval '5 minutes') then raise exception 'future_confirmation'; end if;
    if v_existing.id is null then
      insert into public.care_events(id,client_event_id,baby_id,event_type,occurred_at,ended_at,note,recorded_by) values(v_id,v_id,v_baby,v_type,v_start,v_end,p_event->>'note',v_actor);
    else
      update public.care_events set occurred_at=v_start,ended_at=v_end,note=p_event->>'note',updated_at=clock_timestamp(),server_version=server_version+1 where id=v_id;
    end if;
    if v_type='feeding' then
      if exists(select 1 from jsonb_object_keys(v_detail) k where k not in ('feeding_kind','breast_side','volume_offered_ml','volume_consumed_ml','nutrition')) then raise exception 'validation'; end if;
      if (v_detail->>'volume_offered_ml')::numeric <> round((v_detail->>'volume_offered_ml')::numeric,1) or (v_detail->>'volume_consumed_ml')::numeric <> round((v_detail->>'volume_consumed_ml')::numeric,1) then raise exception 'validation'; end if;
      insert into public.feeding_details(event_id,feeding_kind,breast_side,volume_offered_ml,volume_consumed_ml)
      values(v_id,v_detail->>'feeding_kind',v_detail->>'breast_side',(v_detail->>'volume_offered_ml')::numeric,(v_detail->>'volume_consumed_ml')::numeric)
      on conflict(event_id) do update set feeding_kind=excluded.feeding_kind,breast_side=excluded.breast_side,volume_offered_ml=excluded.volume_offered_ml,volume_consumed_ml=excluded.volume_consumed_ml;
    elsif v_type='diaper' then
      if exists(select 1 from jsonb_object_keys(v_detail) k where k not in ('diaper_kind','stool_color','stool_consistency','stool_amount','blood_seen','mucus_seen','urine_unusual','rash_present')) then raise exception 'validation'; end if;
      insert into public.diaper_details(event_id,diaper_kind,stool_color,stool_consistency,stool_amount,blood_seen,mucus_seen,urine_unusual,rash_present)
      values(v_id,v_detail->>'diaper_kind',v_detail->>'stool_color',v_detail->>'stool_consistency',v_detail->>'stool_amount',v_detail->>'blood_seen',v_detail->>'mucus_seen',v_detail->>'urine_unusual',v_detail->>'rash_present')
      on conflict(event_id) do update set diaper_kind=excluded.diaper_kind,stool_color=excluded.stool_color,stool_consistency=excluded.stool_consistency,stool_amount=excluded.stool_amount,blood_seen=excluded.blood_seen,mucus_seen=excluded.mucus_seen,urine_unusual=excluded.urine_unusual,rash_present=excluded.rash_present;
    elsif v_type='sleep' then
      if exists(select 1 from jsonb_object_keys(v_detail) k where k not in ('sleep_kind','interruptions_count')) then raise exception 'validation'; end if;
      insert into public.sleep_details(event_id,sleep_kind,interruptions_count) values(v_id,v_detail->>'sleep_kind',(v_detail->>'interruptions_count')::smallint)
      on conflict(event_id) do update set sleep_kind=excluded.sleep_kind,interruptions_count=excluded.interruptions_count;
    elsif v_type='meal' then
      if exists(select 1 from jsonb_object_keys(v_detail) k where k not in ('food_name','ingredients','portion_offered','portion_consumed','portion_unit','texture','first_exposure','reaction','nutrition')) then raise exception 'validation'; end if;
      insert into public.meal_details(event_id,food_name,ingredients,portion_offered,portion_consumed,portion_unit,texture,first_exposure,reaction) values(v_id,(v_detail->>'food_name'),(v_detail->>'ingredients'),(v_detail->>'portion_offered')::numeric,(v_detail->>'portion_consumed')::numeric,(v_detail->>'portion_unit'),(v_detail->>'texture'),(v_detail->>'first_exposure'),(v_detail->>'reaction')) on conflict(event_id) do update set food_name=excluded.food_name,ingredients=excluded.ingredients,portion_offered=excluded.portion_offered,portion_consumed=excluded.portion_consumed,portion_unit=excluded.portion_unit,texture=excluded.texture,first_exposure=excluded.first_exposure,reaction=excluded.reaction;
    elsif v_type='measurement' then
      if exists(select 1 from jsonb_object_keys(v_detail) k where k not in ('weight_kg','length_cm','head_cm')) then raise exception 'validation'; end if;
      insert into public.measurement_details(event_id,weight_kg,length_cm,head_cm) values(v_id,(v_detail->>'weight_kg')::numeric,(v_detail->>'length_cm')::numeric,(v_detail->>'head_cm')::numeric) on conflict(event_id) do update set weight_kg=excluded.weight_kg,length_cm=excluded.length_cm,head_cm=excluded.head_cm;
    elsif v_type='checkin' then
      if exists(select 1 from jsonb_object_keys(v_detail) k where k not in ('local_day','timezone_at_entry','state','overall','feeding_vs_usual','wet_diapers_vs_usual','sleep_concern','new_symptoms','parent_concern')) then raise exception 'validation'; end if;
      if not exists(select 1 from pg_catalog.pg_timezone_names where name=v_detail->>'timezone_at_entry') then raise exception 'invalid_timezone'; end if;
      if (v_start at time zone (v_detail->>'timezone_at_entry'))::date is distinct from (v_detail->>'local_day')::date then raise exception 'validation'; end if;
      insert into public.checkin_details(event_id,baby_id,local_day,timezone_at_entry,state,overall,feeding_vs_usual,wet_diapers_vs_usual,sleep_concern,new_symptoms,parent_concern) values(v_id,v_baby,(v_detail->>'local_day')::date,(v_detail->>'timezone_at_entry'),(v_detail->>'state'),(v_detail->>'overall'),(v_detail->>'feeding_vs_usual'),(v_detail->>'wet_diapers_vs_usual'),(v_detail->>'sleep_concern'),(v_detail->>'new_symptoms'),(v_detail->>'parent_concern')) on conflict(event_id) do update set local_day=excluded.local_day,timezone_at_entry=excluded.timezone_at_entry,state=excluded.state,overall=excluded.overall,feeding_vs_usual=excluded.feeding_vs_usual,wet_diapers_vs_usual=excluded.wet_diapers_vs_usual,sleep_concern=excluded.sleep_concern,new_symptoms=excluded.new_symptoms,parent_concern=excluded.parent_concern;
    end if;
    if v_type in ('feeding','meal') then
      if v_detail->'nutrition' is not null and v_detail->'nutrition'<>'null'::jsonb then
        if jsonb_typeof(v_detail->'nutrition') is distinct from 'object' then raise exception 'validation'; end if;
        if exists(select 1 from jsonb_object_keys(v_detail->'nutrition') k where k not in ('source','calories_kcal','protein_g','carbs_g','fat_g','fiber_g','iron_mg','calcium_mg')) then raise exception 'validation'; end if;
        if (v_type='feeding' and ((v_detail->>'feeding_kind')='direct_breast' or v_detail->>'volume_consumed_ml' is null)) or (v_type='meal' and v_detail->>'portion_consumed' is null) then raise exception 'validation'; end if;
        insert into public.event_nutrition(event_id,source,calories_kcal,protein_g,carbs_g,fat_g,fiber_g,iron_mg,calcium_mg) values(v_id,v_detail->'nutrition'->>'source',(v_detail->'nutrition'->>'calories_kcal')::numeric,(v_detail->'nutrition'->>'protein_g')::numeric,(v_detail->'nutrition'->>'carbs_g')::numeric,(v_detail->'nutrition'->>'fat_g')::numeric,(v_detail->'nutrition'->>'fiber_g')::numeric,(v_detail->'nutrition'->>'iron_mg')::numeric,(v_detail->'nutrition'->>'calcium_mg')::numeric) on conflict(event_id) do update set source=excluded.source,calories_kcal=excluded.calories_kcal,protein_g=excluded.protein_g,carbs_g=excluded.carbs_g,fat_g=excluded.fat_g,fiber_g=excluded.fiber_g,iron_mg=excluded.iron_mg,calcium_mg=excluded.calcium_mg;
      else delete from public.event_nutrition where event_id=v_id;
      end if;
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

create function public.journal_schema_version() returns integer language sql stable set search_path='' as $$ select 3 $$;
revoke all on function public.journal_schema_version() from public,anon,authenticated;
grant execute on function public.journal_schema_version() to authenticated;
-- Bound paid AI calls across serverless instances; users cannot reset this counter.
create table public.report_limits(actor_id uuid not null references auth.users(id),utc_day date not null,calls integer not null check(calls between 1 and 5),primary key(actor_id,utc_day));
alter table public.report_limits enable row level security;
revoke all on public.report_limits from anon,authenticated;
create function public.claim_report_request(p_baby_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare v_calls integer;
begin
 if not public.has_baby_access(p_baby_id) then raise exception 'unauthorized'; end if;
 insert into public.report_limits(actor_id,utc_day,calls) values(auth.uid(),(now() at time zone 'UTC')::date,1)
 on conflict(actor_id,utc_day) do update set calls=public.report_limits.calls+1 where public.report_limits.calls<5 returning calls into v_calls;
 return v_calls is not null;
end; $$;
revoke all on function public.claim_report_request(uuid) from public,anon,authenticated;
grant execute on function public.claim_report_request(uuid) to authenticated;
commit;
