import { NextRequest, NextResponse } from 'next/server';
import { db, transaction } from '@/lib/db';
import { requireOperator, HttpError } from '@/lib/auth';
import { failure } from '@/lib/http';
import { effectiveRegistrationMode, type RegistrationMode } from '@/lib/registration';
import { registrationPolicyUpdate } from '@/lib/validation';

type RouteContext={params:Promise<{id:string;product:string}>};
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(req:NextRequest,{params}:RouteContext){
 try {
  await requireOperator(req);
  const {id,product}=await params;
  if(!uuidPattern.test(id))throw new HttpError(400,'Invalid tenant ID');
  const tenant=await db().query('SELECT status FROM tenants WHERE id=$1',[id]);
  if(!tenant.rowCount)throw new HttpError(404,'Tenant not found');
  const productRow=await db().query('SELECT code FROM products WHERE code=$1',[product]);
  if(!productRow.rowCount)throw new HttpError(404,'Product not found');
  const policy=await db().query('SELECT mode, version, updated_at, updated_by FROM tenant_registration_policies WHERE tenant_id=$1 AND product_code=$2',[id,product]);
  const sub=await db().query("SELECT 1 FROM tenant_subscriptions WHERE tenant_id=$1 AND product_code=$2 AND status IN ('active','trial') AND starts_at<=now() AND (ends_at IS NULL OR ends_at>now())",[id,product]);
  const storedMode:RegistrationMode=policy.rows[0]?.mode??'closed';
  return NextResponse.json({tenant_id:id,product,mode:storedMode,effective_mode:effectiveRegistrationMode({mode:storedMode,tenant_status:tenant.rows[0].status,subscribed:!!sub.rowCount}),version:policy.rows[0]?.version??null,updated_at:policy.rows[0]?.updated_at??null});
 }catch(e){return failure(e)}
}

export async function PUT(req:NextRequest,{params}:RouteContext){
 try {
  const actor=await requireOperator(req);
  const {id,product}=await params;
  if(!uuidPattern.test(id))throw new HttpError(400,'Invalid tenant ID');
  const parsed=registrationPolicyUpdate.safeParse(await req.json());
  if(!parsed.success)throw new HttpError(400,'Invalid registration policy');
  const {mode,version}=parsed.data;
  const result=await transaction(async client=>{
   const tenant=await client.query('SELECT status FROM tenants WHERE id=$1 FOR UPDATE',[id]);
   if(!tenant.rowCount)throw new HttpError(404,'Tenant not found');
   if(tenant.rows[0].status==='decommissioned'||tenant.rows[0].status==='decommissioning')throw new HttpError(409,'Cannot modify decommissioning tenant');
   const app=await client.query('SELECT code FROM products WHERE code=$1',[product]);
   if(!app.rowCount)throw new HttpError(404,'Product not found');
   const existing=await client.query('SELECT version FROM tenant_registration_policies WHERE tenant_id=$1 AND product_code=$2 FOR UPDATE',[id,product]);
   if(existing.rowCount && existing.rows[0].version!==version)throw new HttpError(409,'Stale policy version');
   if(!existing.rowCount && version!==null)throw new HttpError(409,'Policy does not exist; version must be null');
   const updated=existing.rowCount
    ?await client.query('UPDATE tenant_registration_policies SET mode=$3,version=version+1,updated_at=now(),updated_by=$4 WHERE tenant_id=$1 AND product_code=$2 RETURNING *',[id,product,mode,actor])
    :await client.query('INSERT INTO tenant_registration_policies(tenant_id,product_code,mode,updated_by) VALUES($1,$2,$3,$4) RETURNING *',[id,product,mode,actor]);
   await client.query('INSERT INTO administrative_actions(actor_subject,operation,target_tenant_id,input,outcome) VALUES($1,$2,$3,$4,$5)',[actor,'registration_policy.update',id,JSON.stringify({product,mode,previous_version:version,new_version:updated.rows[0].version}),'succeeded']);
   return updated.rows[0];
  });
  return NextResponse.json({tenant_id:id,product,mode:result.mode,version:result.version,updated_at:result.updated_at});
 }catch(e){return failure(e)}
}
