import * as esbuild from 'esbuild';

const ctxClient = await esbuild.context({
  entryPoints: ['./client/app.ts'],
  bundle: true,
  sourcemap: true,
  logLevel: 'info',
  platform: 'browser',
  entryNames: '[dir]/[name]-[hash]',
  minify: process.env.NODE_ENV === 'production',
  outdir: './dist/client',
});

const ctxServer = await esbuild.context({
  entryPoints: ['./server/app.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  logLevel: 'info',
  outdir: './dist/server',
  banner: {
    js: 'import { createRequire } from "module";const require = createRequire(import.meta.url);',
  },
});

if (process.env.NODE_ENV === 'production') {
  process.exit(0);
}

await Promise.all([ctxClient.watch(), ctxServer.watch()]);

await ctxClient.serve({
  host: 'localhost',
  port: 8000,
});

await ctxServer.serve({
  host: 'localhost',
  port: 8001,
});
