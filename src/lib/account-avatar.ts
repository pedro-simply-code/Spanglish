/**
 * Photo URL for an account. There are no stock photos: without an uploaded
 * picture this is empty and avatars show the person's initial.
 */
export function getAccountAvatarUrl(_userId: string, image?: string | null): string {
  return image ?? "";
}
