BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','decommissioning','decommissioned')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS platform_operators (
  subject text PRIMARY KEY, enabled boolean NOT NULL DEFAULT true,
  granted_by text NOT NULL, granted_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS products (
  code text PRIMARY KEY, display_name text NOT NULL
);
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_code text NOT NULL REFERENCES products(code),
  code text NOT NULL, display_name text NOT NULL, UNIQUE(product_code,code)
);
CREATE TABLE IF NOT EXISTS plan_entitlements (
  plan_id uuid NOT NULL REFERENCES plans(id), feature text NOT NULL,
  value jsonb NOT NULL, PRIMARY KEY(plan_id,feature)
);
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  product_code text NOT NULL REFERENCES products(code), plan_id uuid NOT NULL REFERENCES plans(id),
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('trial','active','past_due','suspended','cancelled')),
  starts_at timestamptz NOT NULL DEFAULT now(), ends_at timestamptz,
  UNIQUE(tenant_id,product_code)
);
CREATE TABLE IF NOT EXISTS tenant_entitlement_overrides (
  tenant_id uuid NOT NULL REFERENCES tenants(id), product_code text NOT NULL REFERENCES products(code),
  feature text NOT NULL, value jsonb NOT NULL, reason text NOT NULL,
  updated_by text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id,product_code,feature)
);
CREATE TABLE IF NOT EXISTS administrative_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_subject text NOT NULL,
  operation text NOT NULL, target_tenant_id uuid, input jsonb NOT NULL DEFAULT '{}'::jsonb,
  outcome text NOT NULL CHECK(outcome IN ('succeeded','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_action_tenant_idx ON administrative_actions(target_tenant_id,created_at DESC);
INSERT INTO products(code, display_name) VALUES
 ('ig','IG'),('sandcastle','Sandcastle'),('axtor','Axtor') ON CONFLICT DO NOTHING;
COMMIT;
