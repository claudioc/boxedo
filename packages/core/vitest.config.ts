import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // Only run in watch mode if explicitly requested
    watch: process.env.VITEST_WATCH === 'true',
  },
});
