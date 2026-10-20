import { NextRequest, NextResponse } from 'next/server';
import { requireOperator,HttpError } from '@/lib/auth';
import { db } from '@/lib/db';
import { failure } from '@/lib/http';
import { entitlementCheck } from '@/lib/validation';
export async function POST(req:NextRequest){
 try{
   // V0 restricts checks to Nexus operators. Machine-to-machine authorization is a separate milestone.
   await requireOperator(req);
   const parsed=entitlementCheck.safeParse(await req.json());if(!parsed.success)throw new HttpError(400,'Invalid request');
   const {tenant_id,product,feature}=parsed.data;
   const t=await db().query('SELECT status FROM tenants WHERE id=$1',[tenant_id]);if(!t.rowCount)throw new HttpError(404,'Tenant not found');
   if(t.rows[0].status!=='active')return NextResponse.json({allowed:false,reason:'tenant_inactive'});
   const o=await db().query('SELECT value FROM tenant_entitlement_overrides WHERE tenant_id=$1 AND product_code=$2 AND feature=$3',[tenant_id,product,feature]);
   const s=await db().query(`SELECT pe.value FROM tenant_subscriptions ts JOIN plan_entitlements pe ON pe.plan_id=ts.plan_id
     WHERE ts.tenant_id=$1 AND ts.product_code=$2 AND pe.feature=$3 AND ts.status IN ('active','trial') AND (ts.ends_at IS NULL OR ts.ends_at>now())`,[tenant_id,product,feature]);
   const value=o.rows[0]?.value??s.rows[0]?.value??null;
   // Only explicit boolean true enables a boolean feature. Numerical entitlements are returned as limits.
   return NextResponse.json({allowed:value===true || (typeof value==='number'&&value>0),value,source:o.rowCount?'override':s.rowCount?'plan':'none'});
 }catch(e){return failure(e)}
}
