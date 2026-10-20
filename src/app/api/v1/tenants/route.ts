import { NextRequest, NextResponse } from 'next/server';
import { requireOperator, HttpError } from '@/lib/auth';
import { transaction,db } from '@/lib/db';
import { failure } from '@/lib/http';
import { tenantCreate } from '@/lib/validation';
export async function GET(req:NextRequest) {
  try { await requireOperator(req); const {rows}=await db().query('SELECT * FROM tenants ORDER BY created_at DESC LIMIT 100');return NextResponse.json({items:rows}); }
  catch(e){return failure(e)}
}
export async function POST(req:NextRequest) {
  try {
    const actor=await requireOperator(req); const body=tenantCreate.safeParse(await req.json());
    if(!body.success) throw new HttpError(400,'Invalid tenant payload');
    const row=await transaction(async c=>{
      const r=await c.query('INSERT INTO tenants(slug,display_name,metadata) VALUES($1,$2,$3) RETURNING *',[body.data.slug,body.data.display_name,JSON.stringify(body.data.metadata)]);
      await c.query('INSERT INTO administrative_actions(actor_subject,operation,target_tenant_id,input,outcome) VALUES($1,$2,$3,$4,$5)',[actor,'tenant.create',r.rows[0].id,JSON.stringify(body.data),'succeeded']);
      return r.rows[0];
    }); return NextResponse.json(row,{status:201});
  } catch(e){return failure(e)}
}
