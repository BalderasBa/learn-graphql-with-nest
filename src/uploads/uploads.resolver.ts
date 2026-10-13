import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { LibrarianGuard } from '../common/auth.guards.js';
import { Book } from '../books/book.model.js';
import { BooksService } from '../books/books.service.js';
import { UploadCoverInput } from './upload-cover.input.js';
import { UploadsService } from './uploads.service.js';

@Resolver()
export class UploadsResolver {
  constructor(
    private readonly uploadsService: UploadsService,
    private readonly booksService: BooksService,
  ) {}

  @Mutation(() => Book, {
    description: 'Attach a base64 image. Handy in GraphiQL. Prefer the HTTP upload for real files.',
  })
  @UseGuards(LibrarianGuard)
  uploadBookCover(@Args('input') input: UploadCoverInput): Book {
    const cover = this.uploadsService.saveBase64(
      input.filename,
      input.mimeType,
      input.contentBase64,
    );
    return this.booksService.setCover(input.bookId, cover);
  }

  @Mutation(() => Book, {
    description: 'Link a file previously posted to POST /uploads/covers.',
  })
  @UseGuards(LibrarianGuard)
  attachCover(
    @Args('bookId', { type: () => ID }) bookId: string,
    @Args('uploadId', { type: () => ID }) uploadId: string,
  ): Book {
    const file = this.uploadsService.read(uploadId);
    return this.booksService.setCover(bookId, {
      uploadId: file.uploadId,
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.bytes.length,
      url: `/uploads/covers/${file.uploadId}`,
    });
  }
}
