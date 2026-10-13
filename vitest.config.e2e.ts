import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Keep `graphql` as a real Node import. Vite must not bundle a second copy,
    // or GraphQL's `instanceof` checks reject the schema Nest just built.
    server: {
      deps: {
        external: ['graphql'],
      },
    },
  },
});
