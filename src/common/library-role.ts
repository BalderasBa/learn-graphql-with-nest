import { registerEnumType } from '@nestjs/graphql';

/**
 * Who is calling. A reader can review books. A librarian can change the catalog.
 * A real app would load this from a session or an identity provider.
 */
export enum LibraryRole {
  READER = 'READER',
  LIBRARIAN = 'LIBRARIAN',
}

registerEnumType(LibraryRole, {
  name: 'LibraryRole',
  description: 'What the signed-in person is allowed to do',
});
