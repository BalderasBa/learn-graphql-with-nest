import { Module } from '@nestjs/common';
import { AuthorsResolver } from '../authors/authors.resolver.js';
import { AuthorsService } from '../authors/authors.service.js';
import { BooksFieldsResolver } from '../books/books.fields.js';
import { BooksResolver } from '../books/books.resolver.js';
import { BooksService } from '../books/books.service.js';
import { LibraryCacheService } from '../cache/library-cache.service.js';
import { ReviewsResolver } from '../reviews/reviews.resolver.js';
import { ReviewsService } from '../reviews/reviews.service.js';
import { UploadsController } from '../uploads/uploads.controller.js';
import { UploadsResolver } from '../uploads/uploads.resolver.js';
import { UploadsService } from '../uploads/uploads.service.js';
import { HealthController } from './health.controller.js';
import { LibraryPubSub } from './library-pub-sub.js';
import { LibraryResolver } from './library.resolver.js';

@Module({
  controllers: [HealthController, UploadsController],
  providers: [
    AuthorsService,
    BooksService,
    ReviewsService,
    UploadsService,
    LibraryCacheService,
    LibraryPubSub,
    AuthorsResolver,
    BooksResolver,
    BooksFieldsResolver,
    ReviewsResolver,
    UploadsResolver,
    LibraryResolver,
  ],
  exports: [AuthorsService, BooksService],
})
export class LibraryModule {}
