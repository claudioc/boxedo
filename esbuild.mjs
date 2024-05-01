import * as esbuild from 'esbuild';

const ctxClient = await esbuild.context({
  entryPoints: ['./client/app.ts'],
  bundle: true,
  sourcemap: true,
  logLevel: 'info',
  entryNames: '[dir]/[name]-[hash]',
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

await Promise.all([ctxClient.watch(), ctxServer.watch()]);
console.log('Watching…');
