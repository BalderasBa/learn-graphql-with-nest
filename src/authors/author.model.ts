import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'A person who wrote one or more books' })
export class Author {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;
}
