import { Injectable } from '@nestjs/common';

type Listener = (payload: unknown) => void;

/**
 * In-process publish/subscribe for `bookCreated`.
 * Nest's docs use the `graphql-subscriptions` package for the same idea.
 * Events stay inside this Node process. A second server would not see them.
 * Production code publishes through Redis, Postgres, or a queue.
 */
@Injectable()
export class LibraryPubSub {
  private readonly listeners = new Map<string, Set<Listener>>();

  publish<T>(trigger: string, payload: T): void {
    for (const listener of this.listeners.get(trigger) ?? []) {
      listener(payload);
    }
  }

  asyncIterator<T>(trigger: string): AsyncIterableIterator<T> {
    const queue: T[] = [];
    let waiting: ((value: T) => void) | null = null;
    let closed = false;
    const listeners = this.listeners.get(trigger) ?? new Set<Listener>();
    const push: Listener = (payload: unknown) => {
      const value = payload as T;
      if (waiting) {
        const resolve = waiting;
        waiting = null;
        resolve(value);
        return;
      }
      queue.push(value);
    };
    listeners.add(push);
    this.listeners.set(trigger, listeners);
    const iterator: AsyncIterableIterator<T> = {
      next: () => {
        const queued = queue.shift();
        if (queued !== undefined) {
          return Promise.resolve({ value: queued, done: false });
        }
        if (closed) {
          return Promise.resolve({ value: undefined as T, done: true });
        }
        return new Promise((resolve) => {
          waiting = (value: T) => resolve({ value, done: false });
        });
      },
      return: () => {
        closed = true;
        listeners.delete(push);
        return Promise.resolve({ value: undefined as T, done: true });
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };
    return iterator;
  }
}
