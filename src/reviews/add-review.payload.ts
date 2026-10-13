import { Field, ObjectType } from '@nestjs/graphql';
import { Review } from './review.model.js';

/**
 * An expected failure (duplicate review, missing book) comes back here as
 * `userErrors`, with `review` set to null. The HTTP status stays 200.
 * Authentication failures are different: the guard throws, and GraphQL
 * returns an `errors` entry instead of this payload.
 */
@ObjectType()
export class AddReviewPayload {
  @Field(() => Review, { nullable: true })
  review: Review | null;

  @Field(() => [String])
  userErrors: string[];
}
