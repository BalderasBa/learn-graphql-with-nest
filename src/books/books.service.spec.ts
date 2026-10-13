import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthorsService } from '../authors/authors.service.js';
import { BooksService, encodeCursor } from './books.service.js';

describe('BooksService', () => {
  let service: BooksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BooksService, AuthorsService],
    }).compile();
    service = module.get(BooksService);
  });

  it('returns the seed catalog in id order', () => {
    const actualBooks = service.findMany();
    expect(actualBooks).toHaveLength(6);
    expect(actualBooks[0]?.title).toBe('The Pragmatic Programmer');
    expect(actualBooks[1]?.title).toBe('Clean Code');
  });

  it('filters titles without caring about case', () => {
    const actualBooks = service.findMany('CLEAN');
    expect(actualBooks.map((book) => book.title)).toEqual([
      'Clean Code',
      'Clean Architecture',
    ]);
  });

  it('returns one book by id', () => {
    expect(service.findOne('2').authorId).toBe('a2');
  });

  it('throws when a book does not exist', () => {
    expect(() => service.findOne('missing')).toThrow(NotFoundException);
  });

  it('pages two books at a time', () => {
    const actualPage = service.findPage(2, 2);
    expect(actualPage.totalCount).toBe(6);
    expect(actualPage.totalPages).toBe(3);
    expect(actualPage.items.map((book) => book.id)).toEqual(['3', '4']);
  });

  it('rejects a page size above the cap', () => {
    expect(() => service.findPage(1, 50)).toThrow(BadRequestException);
  });

  it('continues a cursor from the last edge', () => {
    const firstPage = service.findConnection(2);
    const cursor = firstPage.pageInfo.endCursor ?? '';
    const secondPage = service.findConnection(2, cursor);
    expect(secondPage.edges.map((edge) => edge.node.id)).toEqual(['3', '4']);
    expect(encodeCursor('2')).toBe(cursor);
  });

  it('creates a book for a known author', () => {
    const actualBook = service.create({
      title: 'Working Effectively with Legacy Code',
      authorId: 'a2',
      year: 2004,
    });
    expect(actualBook.id).toEqual(expect.any(String));
    expect(service.count()).toBe(7);
  });

  it('rejects an unknown author', () => {
    expect(() =>
      service.create({ title: 'Ghost', authorId: 'missing', year: 2000 }),
    ).toThrow(BadRequestException);
  });

  it('updates only the provided fields', () => {
    const actualBook = service.update('1', { year: 2000 });
    expect(actualBook.year).toBe(2000);
    expect(actualBook.title).toBe('The Pragmatic Programmer');
  });

  it('removes a book', () => {
    expect(service.remove('1')).toBe(true);
    expect(service.count()).toBe(5);
    expect(() => service.findOne('1')).toThrow(NotFoundException);
  });
});
