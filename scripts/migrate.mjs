import pg from 'pg';
import fs from 'node:fs/promises';
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL required');
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
try{
 await client.connect();
 const migrations=['001_init.sql','002_registration_policies.sql'];
 for(const name of migrations){
  const sql=await fs.readFile(new URL('../db/'+name,import.meta.url),'utf8');
  await client.query(sql);
  console.log('Applied idempotent migration:',name);
 }
} finally {await client.end()}
