import { UnauthorizedException, UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { LibraryAuthGuard } from '../common/auth.guards.js';
import type { GraphqlContext } from '../common/graphql-context.js';
import { BooksService } from '../books/books.service.js';
import { AddReviewInput } from './add-review.input.js';
import { AddReviewPayload } from './add-review.payload.js';
import { ReviewsService } from './reviews.service.js';

@Resolver()
export class ReviewsResolver {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly booksService: BooksService,
  ) {}

  @Mutation(() => AddReviewPayload, {
    description: 'Expected problems come back in userErrors. The reviewer name is the signed-in user.',
  })
  @UseGuards(LibraryAuthGuard)
  addReview(
    @Args('input') input: AddReviewInput,
    @Context() context: GraphqlContext,
  ): AddReviewPayload {
    if (!context.user) {
      throw new UnauthorizedException('Sign in to review a book');
    }
    const book = this.booksService.findById(input.bookId);
    if (!book) {
      return {
        review: null,
        userErrors: [`Book "${input.bookId}" was not found`],
      };
    }
    return this.reviewsService.add(input, context.user.name);
  }
}
