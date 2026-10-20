import { NextRequest, NextResponse } from 'next/server';
import { requireOperator,HttpError } from '@/lib/auth';
import { db,transaction } from '@/lib/db';
import { failure } from '@/lib/http';
import { tenantUpdate } from '@/lib/validation';
type Params={params:Promise<{id:string}>};
export async function GET(req:NextRequest,{params}:Params){
  try{ await requireOperator(req);const {id}=await params;const {rows}=await db().query('SELECT * FROM tenants WHERE id=$1',[id]);if(!rows.length)throw new HttpError(404,'Tenant not found');return NextResponse.json(rows[0]); }
  catch(e){return failure(e)}
}
export async function PATCH(req:NextRequest,{params}:Params){
  try {
    const actor=await requireOperator(req), {id}=await params;
    const parsed=tenantUpdate.safeParse(await req.json());if(!parsed.success)throw new HttpError(400,'Invalid tenant update');
    const {version,...patch}=parsed.data;
    if (Object.keys(patch).length===0) throw new HttpError(400,'No changes provided');
    const row=await transaction(async c=>{
      const old=await c.query('SELECT * FROM tenants WHERE id=$1 FOR UPDATE',[id]);
      if(!old.rowCount)throw new HttpError(404,'Tenant not found');
      if(old.rows[0].version!==version)throw new HttpError(409,'Stale tenant version');
      const status=patch.status??old.rows[0].status;
      if(old.rows[0].status==='decommissioned' && status!=='decommissioned')throw new HttpError(409,'Decommissioned tenant cannot be reactivated');
      const r=await c.query('UPDATE tenants SET display_name=$2, metadata=$3, status=$4, version=version+1,updated_at=now() WHERE id=$1 RETURNING *',[id,patch.display_name??old.rows[0].display_name,JSON.stringify(patch.metadata??old.rows[0].metadata),status]);
      await c.query('INSERT INTO administrative_actions(actor_subject,operation,target_tenant_id,input,outcome) VALUES($1,$2,$3,$4,$5)',[actor,'tenant.update',id,JSON.stringify(patch),'succeeded']);
      return r.rows[0];
    });return NextResponse.json(row);
  }catch(e){return failure(e)}
}
