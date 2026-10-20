import { NextResponse } from 'next/server';
import { HttpError } from './auth';
export function failure(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({error:error.message},{status:error.status});
  if (typeof error === 'object' && error && 'code' in error) {
    if (error.code === '23505') return NextResponse.json({error:'Conflict'},{status:409});
    if (error.code === '23503') return NextResponse.json({error:'Referenced record not found'},{status:400});
  }
  console.error('Nexus request failed', error);
  return NextResponse.json({error:'Internal error'},{status:500});
}
