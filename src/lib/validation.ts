import { z } from 'zod';
export const tenantCreate = z.object({slug:z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}$/),display_name:z.string().min(1).max(160), metadata:z.record(z.string(),z.unknown()).default({})}).strict();
export const tenantUpdate = z.object({display_name:z.string().min(1).max(160).optional(),metadata:z.record(z.string(),z.unknown()).optional(),status:z.enum(['active','suspended','decommissioning','decommissioned']).optional(),version:z.number().int().positive()}).strict();
export const entitlementCheck = z.object({tenant_id:z.string().uuid(),product:z.string().min(1),feature:z.string().min(1)}).strict();
export const registrationPolicyUpdate = z.object({
  mode: z.enum(['closed','invitation_only','public']),
  version: z.number().int().positive().nullable().default(null)
}).strict();
