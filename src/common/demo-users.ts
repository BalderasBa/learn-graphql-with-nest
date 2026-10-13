import { LibraryRole } from './library-role.js';
import { LibraryUser } from './library-user.model.js';

/**
 * Classroom tokens. Send one as `Authorization: Bearer <token>`.
 * These are not secrets and they are not authentication. They only let you
 * see how a guard reads an identity that some earlier layer already checked.
 */
export const READER_TOKEN = 'reader-token';
export const LIBRARIAN_TOKEN = 'librarian-token';

const DEMO_USERS: Record<string, LibraryUser> = {
  [READER_TOKEN]: { name: 'Amina', role: LibraryRole.READER },
  [LIBRARIAN_TOKEN]: { name: 'Samir', role: LibraryRole.LIBRARIAN },
};

export function userFromAuthorizationHeader(
  header?: string,
): LibraryUser | null {
  if (!header) {
    return null;
  }
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }
  return DEMO_USERS[token] ?? null;
}
