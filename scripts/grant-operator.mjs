import pg from 'pg';
const subject=process.argv[2];if(!subject||!process.env.DATABASE_URL)throw new Error('Usage: DATABASE_URL=... npm run admin:grant -- <IS_SUBJECT>');
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
try{await client.connect();await client.query('INSERT INTO platform_operators(subject,granted_by) VALUES($1,$2) ON CONFLICT(subject) DO UPDATE SET enabled=true',[subject,'trusted-bootstrap']);console.log('Operator enabled:',subject)}finally{await client.end()}
