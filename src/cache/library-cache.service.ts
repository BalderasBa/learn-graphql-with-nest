import { Injectable } from '@nestjs/common';
import { CACHE_TTL_MS } from '../security/limits.js';
import { LibraryStats } from './library-stats.model.js';

type StoredStats = Omit<LibraryStats, 'fromCache'>;

/**
 * Process-local TTL cache. The second call inside the window returns the
 * same counts and computedAt, with fromCache true. It does not survive a
 * restart, and it is shared by every caller of this process.
 */
@Injectable()
export class LibraryCacheService {
  private entry: { value: StoredStats; expiresAt: number } | null = null;

  rememberStats(compute: () => StoredStats): LibraryStats {
    const now = Date.now();
    if (this.entry && this.entry.expiresAt > now) {
      return { ...this.entry.value, fromCache: true };
    }
    const value = compute();
    this.entry = { value, expiresAt: now + CACHE_TTL_MS };
    return { ...value, fromCache: false };
  }
}
