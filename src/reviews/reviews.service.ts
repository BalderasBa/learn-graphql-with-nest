import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AddReviewInput } from './add-review.input.js';
import { AddReviewPayload } from './add-review.payload.js';
import { Review } from './review.model.js';

const SEED_REVIEWS: readonly Review[] = [
  {
    id: 'r1',
    bookId: '1',
    rating: 5,
    body: 'Still the book I lend first.',
    reviewerName: 'Amina',
  },
  {
    id: 'r2',
    bookId: '1',
    rating: 4,
    body: 'Practical from the first chapter.',
    reviewerName: 'Samir',
  },
  {
    id: 'r3',
    bookId: '2',
    rating: 5,
    body: 'Changed how I name things.',
    reviewerName: 'Amina',
  },
];

@Injectable()
export class ReviewsService {
  private readonly reviews: Review[] = SEED_REVIEWS.map((review) => ({
    ...review,
  }));

  findByBookId(bookId: string, minRating?: number): Review[] {
    return this.reviews.filter((review) => {
      if (review.bookId !== bookId) {
        return false;
      }
      if (minRating === undefined) {
        return true;
      }
      return review.rating >= minRating;
    });
  }

  count(): number {
    return this.reviews.length;
  }

  add(input: AddReviewInput, reviewerName: string): AddReviewPayload {
    const duplicate = this.reviews.some(
      (review) =>
        review.bookId === input.bookId && review.reviewerName === reviewerName,
    );
    if (duplicate) {
      return {
        review: null,
        userErrors: ['You already reviewed this book'],
      };
    }
    const review: Review = {
      id: randomUUID(),
      bookId: input.bookId,
      rating: input.rating,
      body: input.body,
      reviewerName,
    };
    this.reviews.push(review);
    return { review, userErrors: [] };
  }
}
