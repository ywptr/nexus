import { NextResponse } from 'next/server';
export async function GET() { return NextResponse.json({status:'ok',service:'nexus',version:'0.1.0'}); }
