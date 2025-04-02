import * as http from 'http';
import { IncomingMessage, ServerResponse } from 'http'; // Use specific types
import * as httpProxy from 'http-proxy';
import { Command } from '../lib/Command';

// Consider renaming the command class if it's just for this proxy
export default class PipsProxyCommand extends Command {
  async run() {
    const targetServer = 'http://localhost:3000'; // Your Fastify server
    const proxyPort = 8080;
    const proxyPathPrefix = '/pips'; // The prefix we want to listen for

    this.ui.console.info(`Setting up reverse proxy:`);
    this.ui.console.info(`  Listening on: http://localhost:${proxyPort}`);
    this.ui.console.info(`  Proxying path: ${proxyPathPrefix}/*`);
    this.ui.console.info(`  Forwarding to: ${targetServer}`);

    const proxy = httpProxy.default.createProxyServer({
      target: targetServer,
      changeOrigin: true, // Changes the Host header to the target's
    });

    // --- IMPORTANT: Handle Proxy Errors ---
    // Listen for errors from the proxy connection (e.g., target server down)
    proxy.on('error', (err, req: any, res: any) => {
      console.error(
        `Proxy error for ${req.method} ${req.originalUrl || req.url}:`,
        err.message
      );
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' }); // 502 Bad Gateway
      }
      // Check if the response stream is still writable before ending
      if (res.writable && !res.writableEnded) {
        res.end('Bad Gateway: Could not connect to the target service.');
      }
    });

    const server = http.createServer(
      (req: IncomingMessage, res: ServerResponse) => {
        // Store original URL for logging in case of error
        (req as any).originalUrl = req.url;

        if (req.url && req.url.startsWith(proxyPathPrefix)) {
          const originalUrl = req.url;

          // Rewrite the URL: Remove the prefix.
          // Examples:
          // /pips          -> /
          // /pips/         -> /
          // /pips/users    -> /users
          // /pips/users?a=1 -> /users?a=1
          req.url = req.url.substring(proxyPathPrefix.length);
          // Ensure the rewritten path starts with a slash if it's not empty
          if (!req.url.startsWith('/')) {
            req.url = '/' + req.url;
          }

          this.ui.console.info(
            `Proxying: ${req.method} ${originalUrl} -> ${targetServer}${req.url}`
          );
          proxy.web(req, res); // Forward the request with the modified URL
        } else {
          // If the path doesn't start with /pips, return 404
          this.ui.console.info(`Path not proxied: ${req.method} ${req.url}`);
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        }
      }
    );

    // --- Start the Server and Handle Server Errors ---
    server.listen(proxyPort, () => {
      this.ui.console.info(
        `✅ Reverse proxy active on http://localhost:${proxyPort}`
      );
    });

    // Handle server startup errors (like port already in use)
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(
          `❌ Error: Port ${proxyPort} is already in use. Cannot start proxy.`
        );
      } else {
        console.error('❌ Server error:', err);
      }
      process.exit(1); // Exit if the server can't start
    });
  }
}
