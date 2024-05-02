import * as esbuild from 'esbuild';
import { createServer, IncomingMessage, ServerResponse } from 'http';

const esbuildNotifyPlugin = {
  name: 'esbuild-notify-plugin',
  setup(build) {
    const bundle =
      build.initialOptions.platform === 'browser' ? 'client' : 'server';
    build.onEnd((result) => {
      if (result.errors.length > 0) {
        console.error(`${bundle} build failed; not broadcasting message`);
        return;
      }
      broadcastMessage(`${bundle} build finished`);
    });
  },
};

const ctxClient = await esbuild.context({
  entryPoints: ['./client/app.ts'],
  bundle: true,
  sourcemap: process.env.NODE_ENV !== 'production',
  logLevel: 'info',
  platform: 'browser',
  plugins: [esbuildNotifyPlugin],
  entryNames: '[dir]/[name]-[hash]',
  minify: process.env.NODE_ENV === 'production',
  outdir: './dist/client',
});

const ctxServer = await esbuild.context({
  entryPoints: ['./server/app.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  plugins: [esbuildNotifyPlugin],
  logLevel: 'info',
  outdir: './dist/server',
  // This banner is required for a workaround in __dirname/__filename and fastify
  banner: {
    js: 'import { createRequire } from "module";const require = createRequire(import.meta.url);',
  },
});

if (process.env.NODE_ENV === 'production') {
  process.exit(0);
}

await Promise.all([ctxClient.watch(), ctxServer.watch()]);

const clients = [];
const server = createServer(async (req, res) => {
  if (req.url !== '/updates') {
    res.writeHead(404);
    res.end();
  }
  console.log('New client connected');
  const clientId = Date.now();
  const newClient = { id: clientId, response: res };
  clients.push(newClient);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'Origin, X-Requested-With, Content-Type, Accept',
  });

  res.write(': Connected\n\n');

  const keepAliveId = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAliveId);
    clients.splice(clients.indexOf(newClient), 1);
    res.end();
  });
});

export function broadcastMessage(message) {
  const delay = message.startsWith('server') ? 1000 : 0;
  clients.forEach((client) => {
    setTimeout(() => {
      console.log('Broadcasting message:', message);
      client.response.write(`data: ${message}\n\n`);
    }, delay);
  });
}

server.listen(8007, () => {
  console.log('SSE server started on http://localhost:8007/updates');
});
