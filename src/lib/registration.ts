/** Tenant/application admission policy. Missing policy always means closed. */
export type RegistrationMode = 'closed' | 'invitation_only' | 'public';
export type PolicyRow = { mode: RegistrationMode; tenant_status: string; subscribed: boolean };
export function effectiveRegistrationMode(row?: PolicyRow | null): RegistrationMode {
  if (!row || row.tenant_status !== 'active' || !row.subscribed) return 'closed';
  return row.mode;
}
