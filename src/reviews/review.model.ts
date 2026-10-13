import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'A short opinion about one book' })
export class Review {
  @Field(() => ID)
  id: string;

  @Field(() => Int)
  rating: number;

  @Field()
  body: string;

  @Field({ description: 'Taken from the signed-in user, not from the input' })
  reviewerName: string;

  /** Parent key for the book. Not selected by clients. */
  bookId: string;
}
