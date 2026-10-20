import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const sql=fs.readFileSync(new URL('../db/002_registration_policies.sql',import.meta.url),'utf8');
test('policy defaults to closed and keys on tenant/product',()=>{assert.match(sql,/DEFAULT 'closed'/);assert.match(sql,/PRIMARY KEY\(tenant_id, product_code\)/)});
test('policy types include only closed invitation_only public',()=>{assert.match(sql,/CHECK\(mode IN \('closed','invitation_only','public'\)\)/)});
const api=fs.readFileSync(new URL('../src/app/api/v1/tenants/[id]/registration-policies/[product]/route.ts',import.meta.url),'utf8');
test('policy changes are operator-only, audited, and versioned',()=>{assert.match(api,/requireOperator\(req\)/);assert.match(api,/registration_policy.update/);assert.match(api,/Stale policy version/)});
