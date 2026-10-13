import { Field, ObjectType } from '@nestjs/graphql';
import { LibraryRole } from './library-role.js';

@ObjectType({ description: 'The person behind the current request' })
export class LibraryUser {
  @Field()
  name: string;

  @Field(() => LibraryRole)
  role: LibraryRole;
}
