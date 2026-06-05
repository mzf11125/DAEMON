/** Role that may use a tenant header different from the session tenant. */
export const PLATFORM_ADMIN_ROLE = "platform-admin";

export function hasPlatformAdmin(roles: readonly string[] | undefined): boolean {
  return roles?.includes(PLATFORM_ADMIN_ROLE) ?? false;
}
