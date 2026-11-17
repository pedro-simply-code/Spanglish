const PROFILE_IMAGES = [
  "/images/profile/user-1.jpg",
  "/images/profile/user-2.jpg",
  "/images/profile/user-3.jpg",
  "/images/profile/user-4.jpg",
  "/images/profile/user-5.jpg",
  "/images/profile/user-6.jpg",
  "/images/profile/user-7.jpg",
  "/images/profile/user-8.jpg",
  "/images/profile/user-9.jpg",
  "/images/profile/user-10.jpg",
] as const;

/** Stable demo avatar per user until profile uploads are persisted. */
export function getAccountAvatarUrl(userId: string): string {
  let hash = 0;
  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) >>> 0;
  }
  return PROFILE_IMAGES[hash % PROFILE_IMAGES.length] ?? PROFILE_IMAGES[0];
}