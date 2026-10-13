import { LibraryPubSub } from './library-pub-sub.js';

describe('LibraryPubSub', () => {
  it('delivers a payload to a subscriber', async () => {
    const pubSub = new LibraryPubSub();
    const iterator = pubSub.asyncIterator<{ bookCreated: { title: string } }>(
      'bookCreated',
    );
    const pending = iterator.next();
    pubSub.publish('bookCreated', { bookCreated: { title: 'New' } });
    await expect(pending).resolves.toEqual({
      value: { bookCreated: { title: 'New' } },
      done: false,
    });
    await iterator.return?.();
  });
});
