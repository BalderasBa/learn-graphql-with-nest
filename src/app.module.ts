import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { AuthorsService } from './authors/authors.service.js';
import { BooksService } from './books/books.service.js';
import { createGraphqlOptions } from './graphql/graphql.options.js';
import { LibraryModule } from './library/library.module.js';

@Module({
  imports: [
    LibraryModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [LibraryModule],
      inject: [AuthorsService, BooksService],
      useFactory: (authorsService: AuthorsService, booksService: BooksService) =>
        createGraphqlOptions(authorsService, booksService),
    }),
  ],
})
export class AppModule {}
