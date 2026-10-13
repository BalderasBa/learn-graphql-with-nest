import { AuthorsService } from './authors.service.js';
import { createAuthorLoader } from './author.loader.js';

describe('createAuthorLoader', () => {
  it('loads several authors in one batch', async () => {
    const stats = { authorBatches: 0, booksByAuthorBatches: 0 };
    const loader = createAuthorLoader(new AuthorsService(), stats);
    const [hunt, fowler] = await Promise.all([
      loader.load('a1'),
      loader.load('a4'),
    ]);
    expect(hunt.name).toBe('Andrew Hunt');
    expect(fowler.name).toBe('Martin Fowler');
    expect(stats.authorBatches).toBe(1);
  });
});
