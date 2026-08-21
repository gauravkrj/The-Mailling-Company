import { User } from '@mailpersonalize/shared';

export const AVATARS = [
  '/assets/Avatar1.png',
  '/assets/Avatar2.png',
  '/assets/Avatar3.png',
  '/assets/Avatar4.png',
  '/assets/Avatar5.png',
  '/assets/Avatar6.png',
  '/assets/Avatar7.png',
];

export const HERO_AVATAR = '/assets/Avatar1.png';

/**
 * Get avatar image URL for a user.
 * If user.avatar_url exists, return it.
 * Otherwise, return a deterministic avatar based on user ID or email.
 */
export function getUserAvatar(user?: Partial<User> | null | { id?: string; email?: string; avatar_url?: string | null }): string {
  if (!user) return HERO_AVATAR;
  if (user.avatar_url) return user.avatar_url;

  const key = user.id || user.email || 'default';
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATARS.length;
  return AVATARS[index];
}
