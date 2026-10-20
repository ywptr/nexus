BEGIN;
-- Policies govern joining an existing application tenant, not creating IS identities.
CREATE TABLE IF NOT EXISTS tenant_registration_policies (
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 product_code text NOT NULL REFERENCES products(code),
 mode text NOT NULL DEFAULT 'closed' CHECK(mode IN ('closed','invitation_only','public')),
 version integer NOT NULL DEFAULT 1 CHECK(version > 0),
 updated_by text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id, product_code)
);
COMMIT;
