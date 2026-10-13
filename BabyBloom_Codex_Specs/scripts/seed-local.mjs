import { randomUUID } from 'node:crypto';
// Server-side development helper. Never import this script into the client.
const origin=process.env.SUPABASE_LOCAL_URL ?? 'http://127.0.0.1:54321';
const url=new URL(origin);
if (!['127.0.0.1','localhost'].includes(url.hostname) || url.port!=='54321') throw new Error('Only local Supabase on port 54321 may be seeded.');
const admin=process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY;
const anon=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!admin || !anon) throw new Error('Set local server and public keys in the process environment.');
async function request(path,key,token,body) {
  const response=await fetch(origin+path,{ method:'POST',headers:{ apikey:key,Authorization:`Bearer ${token}`,'Content-Type':'application/json' },body:JSON.stringify(body) });
  if (!response.ok) throw new Error(`Local seed request failed (${response.status}).`);
  return response.json();
}
const email=`synthetic-${Date.now()}@babybloom.example`;
const password=randomUUID()+randomUUID();
await request('/auth/v1/admin/users',admin,admin,{ email,password,email_confirm:true });
const session=await request('/auth/v1/token?grant_type=password',anon,anon,{ email,password });
const born=new Date(Date.now()-60*86400000).toISOString().slice(0,10);
const baby=await request('/rest/v1/rpc/create_baby',anon,session.access_token,{ p_input:{ nickname:'Synthetic Sprout',date_of_birth:born,timezone:'Asia/Jakarta',gestation_weeks:null,gestation_days:null,growth_reference_sex:null,guardian_confirmed:true,policy_version:'2026-10-draft' } });
const event={ id:randomUUID(),baby_id:baby.id,event_type:'feeding',occurred_at:new Date(Date.now()-3600000).toISOString(),ended_at:null,note:'Synthetic demo only',detail:{ feeding_kind:'expressed_breastmilk_bottle',breast_side:null,volume_offered_ml:90,volume_consumed_ml:70 } };
await request('/rest/v1/rpc/save_care_event',anon,session.access_token,{ p_event:event,p_mutation_id:randomUUID(),p_expected_version:0,p_operation:'create',p_future_confirmed:false });
console.log(`Synthetic local dataset created. Sign in by email OTP as ${email}; read the code in local Mailpit.`);
