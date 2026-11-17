export const STAFF_GUEST_IDENTITY_PREFIX = "guest-staff-";

export function isStaffGuestIdentity(identity: string): boolean {
  return identity.startsWith(STAFF_GUEST_IDENTITY_PREFIX);
}