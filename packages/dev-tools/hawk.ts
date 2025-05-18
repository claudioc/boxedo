import { parseBaseUrl, VENDOR_ASSETS, type UrlParts } from 'boxedo-core';
import * as esbuild from 'esbuild';
import { exec, fork, spawn, type ChildProcess } from 'node:child_process';
import { cp, mkdir, rm, watch } from 'node:fs/promises';
import { createServer, type Server, type ServerResponse } from 'node:http';
import { createInterface } from 'node:readline';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

interface SseClient {
  id: number;
  response: ServerResponse;
}

type Target = 'client' | 'server';
type TaskFn = (name: string, arg?: Target) => Promise<boolean>;
type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

const sseClients: SseClient[] = [];

const { BXD_LIVERELOAD_URL, BXD_BASE_INTERNAL_URL, BXD_BASE_EXTERNAL_URL } =
  process.env;
const liveReloadBaseUrl: UrlParts | null = parseBaseUrl(BXD_LIVERELOAD_URL);
const hasLiveReload = liveReloadBaseUrl !== null;
const apiServerBaseUrl: UrlParts | null = parseBaseUrl(BXD_BASE_INTERNAL_URL);
const baseExternalUrl: UrlParts | null = parseBaseUrl(BXD_BASE_EXTERNAL_URL);

let apiServer: ChildProcess | null = null;
let sseServer: Server | null = null;

const killApiServer = async () => {
  if (!apiServer || !apiServer.pid) {
    return;
  }

  return apiServer.kill('SIGKILL');
};

const killSseServer = async () => {
  if (!sseServer) {
    return;
  }

  return new Promise<void>((resolve) => {
    sseServer?.close(() => {
      console.log('[Hawk] SSE server closed');
      sseServer = null;
      resolve();
    });
  });
};

const startApiServer: TaskFn = async (_name) => {
  if (apiServer) {
    console.log('[Hawk] Stopping API server…');
    await killApiServer();
    console.log('[Hawk] Stopped API server…');
  }

  console.log('[Hawk] Starting API server…');

  return new Promise((resolve) => {
    apiServer = fork('./packages/server/dist/app.js', {
      env: { ...process.env, FORCE_COLOR: '2' },
      stdio: ['inherit', 'pipe', 'pipe', 'ipc'],
    });

    if (apiServer.stdout) {
      const stdout = createInterface({ input: apiServer.stdout });
      stdout.on('line', (line) => {
        console.log(`[API Server] ${line}`);
      });
    }

    if (apiServer.stderr) {
      const stderr = createInterface({ input: apiServer.stderr });
      stderr.on('line', (line) => {
        console.error(`[API Server] ${line}`);
      });
    }

    // biome-ignore lint/suspicious/noExplicitAny:
    apiServer.on('error', (err: any) => {
      if (err.code === 'ERR_IPC_CHANNEL_CLOSED') {
        // Ignore IPC channel closure errors during shutdown
        return;
      }
      console.error('[Hawk] API server error:', err);
      resolve(false);
    });

    apiServer.on('exit', (code) => {
      if (code) {
        console.error('[Hawk] API server exited badly');
        apiServer = null;
      }
    });

    apiServer.on('spawn', () => {
      console.log('[Hawk] API server started');
      resolve(true);
    });
  });
};

const clearPort: TaskFn = async () => {
  if (!apiServerBaseUrl) {
    return true;
  }

  const port = apiServerBaseUrl.port;

  try {
    // Check if any process is using the port
    const { stdout } = await execAsync(`lsof -ti :${port}`);

    if (stdout.trim()) {
      console.log(`[Hawk] Found process using port ${port}, killing it…`);
      await execAsync(`kill -9 $(lsof -ti :${port})`);
      // Small delay to ensure port is fully released
      await delay(1000);
      console.log(`[Hawk] Port ${port} cleared`);
    } else {
      console.log(`[Hawk] Port ${port} is already clear`);
    }

    return true;
  } catch (error) {
    // If lsof returns nothing, it will throw an error, but that's fine
    // it just means no process was found
    // biome-ignore lint/suspicious/noExplicitAny:
    if ((error as any).code === 1) {
      console.log(`[Hawk] Port ${port} is already clear`);
      return true;
    }

    console.error(`[Hawk] Error clearing port ${port}:`, error);
    return false;
  }
};

const clean: TaskFn = async (_, target = 'client') => {
  const dir = `packages/${target}/dist`;
  try {
    console.log(`[Hawk] Cleaning ${dir}`);
    await rm(dir, { recursive: true, force: true });
    return true;
  } catch (error) {
    console.error(`[Hawk] Error cleaning ${dir}:`, error);
    return false;
  }
};

const setupFileWatchers: TaskFn = async (_) => {
  try {
    const watchAssets = async () => {
      const assetsWatcher = watch('packages/server/assets', {
        recursive: true,
      });
      for await (const event of assetsWatcher) {
        if (event.filename?.match(/global\.css$/)) {
          console.log(`[Hawk] Assets change: ${event.filename}`);
          taskManager.run(['notify-client-update']);
        }
      }
    };

    const watchClient = async () => {
      const clientWatcher = watch('packages/client', { recursive: true });
      for await (const event of clientWatcher) {
        if (event.filename?.match(/\.(ts|tsx)$/)) {
          console.log(`[Hawk] Client change: ${event.filename}`);
          taskManager.run([
            'type-check-client',
            'lint-client',
            'clean-client',
            'build-client',
            'notify-client-update',
          ]);
        }
      }
    };

    const watchServer = async () => {
      const serverWatcher = watch('packages/server', { recursive: true });
      for await (const event of serverWatcher) {
        if (event.filename?.match(/\.(ts|tsx)$/)) {
          console.log(`[Hawk] Server change: ${event.filename}`);
          taskManager.run([
            'type-check-server',
            'lint-server',
            'clean-server',
            'build-server',
            'build-css',
            'start-api-server',
            'notify-server-update',
          ]);
        }

        if (event.filename?.match(/(global\.css)$/)) {
          console.log(`[Hawk] Server global css change: ${event.filename}`);
          // The server is rebuilt but the js code is not changing
          // so we don't need to restart the server
          taskManager.run(['build-css', 'notify-server-update']);
        }

        if (event.filename?.match(/\.(json)$/)) {
          console.log(`[Hawk] Server JSON change: ${event.filename}`);
          // Translations: just avoid linting and type-checking
          taskManager.run([
            'clean-server',
            'build-server',
            'build-css',
            'start-api-server',
            'notify-server-update',
          ]);
        }
      }
    };

    const watchRoot = async () => {
      const rootWatcher = watch('.');
      for await (const event of rootWatcher) {
        if (
          ['package.json', '.env', 'packages/dev-tools/hawk.ts'].includes(
            event.filename as string
          )
        ) {
          // A graceful stop is not easy for some reason...
          // At this point if the configuration changes we just exit
          console.warn(`
+-------------------------------+
| Configuration change detected |
| Shutting down, please restart |
--------------------------------+
`);
          await killApiServer();
          await killSseServer();
          process.exit();
        }
      }
    };

    Promise.all([
      watchAssets(),
      watchClient(),
      watchServer(),
      watchRoot(),
    ]).catch((error) => {
      console.error('[Hawk] Watch error:', error);
    });
  } catch (error) {
    console.error('[Hawk] Watch error:', error);
    return false;
  }

  return true;
};

const buildCss: TaskFn = async (_) => {
  try {
    console.log('[Hawk] Building global CSS…');

    return new Promise<boolean>((resolve) => {
      const process = spawn(
        'npx',
        [
          '@tailwindcss/cli',
          '-i',
          './packages/server/views/styles/global.css',
          '-o',
          './packages/server/assets/css/global.css',
        ],
        {
          stdio: 'inherit',
        }
      );

      process.on('error', (err) => {
        console.error('[Hawk] Error building global.css:', err);
        resolve(false);
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          console.error(`[Hawk] global.css build failed with code ${code}`);
          resolve(false);
        }
      });
    });
  } catch (error) {
    console.error('[Hawk] Error in buildCss task:', error);
    return false;
  }
};

const typeCheck: TaskFn = async (_, target = 'client') => {
  return new Promise<boolean>((resolve) => {
    const tsc = spawn('node_modules/.bin/tsc', ['-p', `packages/${target}`], {
      stdio: 'inherit',
    });

    tsc.on('error', (err) => {
      console.error('[Hawk] Error running type checking', err);
      resolve(false);
    });

    tsc.on('close', (code) => resolve(code === 0));
  });
};

const lint: TaskFn = async (_, target = 'client') => {
  return new Promise<boolean>((resolve) => {
    const tsc = spawn(
      'node_modules/.bin/biome',
      ['lint', `packages/${target}`],
      {
        stdio: 'inherit',
      }
    );

    tsc.on('error', (err) => {
      console.error('[Hawk] Error running biome linter', err);
      resolve(false);
    });

    tsc.on('close', (code) => resolve(code === 0));
  });
};

const buildClient: TaskFn = async (_) => {
  await esbuild.build({
    entryPoints: [
      './packages/client/app.ts',
      './packages/client/editor.ts',
      './packages/client/appMini.ts',
    ],
    bundle: true,
    sourcemap: process.env.NODE_ENV !== 'production',
    logLevel: 'info',
    define: {
      BXD_LIVERELOAD_URL: JSON.stringify(
        BXD_LIVERELOAD_URL ? `${BXD_LIVERELOAD_URL}/updates` : ''
      ),
      BXD_BASE_PATH: JSON.stringify(baseExternalUrl?.pathname ?? ''),
    },
    platform: 'browser',
    entryNames: '[dir]/[name]-[hash]',
    minify: process.env.NODE_ENV === 'production',
    outdir: './packages/client/dist',
  });

  return true;
};

const copyClientBuild: TaskFn = async (_) => {
  try {
    console.log('[Hawk] Copying client build to server assets');
    const targetDir = 'packages/server/assets/js';
    await mkdir(targetDir, { recursive: true });
    await rm(targetDir, { recursive: true, force: true });
    await cp('packages/client/dist', targetDir, {
      recursive: true,
    });

    return true;
  } catch (error) {
    console.error('[Hawk] Error copying client build:', error);
    return false;
  }
};

const copyClientVendor: TaskFn = async (_) => {
  try {
    console.log('[Hawk] Copying vendor assets to server');
    const targetDir = 'packages/server/assets/vendor';
    await mkdir(targetDir, { recursive: true });

    VENDOR_ASSETS.forEach(async (asset) => {
      await cp(
        `./node_modules/${asset.packagePath}/${asset.file}`,
        `${targetDir}/${asset.file}`
      );
    });

    return true;
  } catch (error) {
    console.error('[Hawk] Error copying vendor assets:', error);
    return false;
  }
};

const buildServer: TaskFn = async (_) => {
  await esbuild.build({
    entryPoints: ['./packages/server/app.ts'],
    bundle: true,
    platform: 'node',
    sourcemap: process.env.NODE_ENV !== 'production',
    format: 'esm',
    logLevel: 'info',
    outdir: './packages/server/dist',
    // This banner is required for a workaround in __dirname/__filename and fastify
    banner: {
      js: `
      import { createRequire } from "module";
      const require = createRequire(import.meta.url);
      import { fileURLToPath } from 'url';
      const __filename = fileURLToPath(import.meta.url);
      import { dirname } from 'path';
      const __dirname = dirname(__filename);`,
    },
    external: ['pouchdb-adapter-leveldb'],
  });
  return true;
};

const notifyUpdates: TaskFn = async (_, target = 'client') => {
  const delay = target === 'server' ? 1000 : 0;
  sseClients.forEach((client) => {
    setTimeout(() => {
      client.response.write(`data: ${target} updated.\n\n`);
    }, delay);
  });

  return true;
};

const startSseServer: TaskFn = async () => {
  if (!hasLiveReload) {
    console.log('[Hawk] SSE server not configured');
    return true;
  }

  sseServer = createServer(async (req, res) => {
    if (req.url !== '/updates') {
      res.writeHead(404);
      res.end();
    }

    const clientId = Date.now();
    const newClient: SseClient = { id: clientId, response: res };
    sseClients.push(newClient);
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
      sseClients.splice(sseClients.indexOf(newClient), 1);
      res.end();
    });
  });

  sseServer.listen(liveReloadBaseUrl.port, liveReloadBaseUrl.hostname, () => {
    console.log(`[Hawk] SSE server started on ${BXD_LIVERELOAD_URL}`);
  });

  return true;
};

const ready: TaskFn = async (_) => {
  return new Promise((res) => {
    setTimeout(() => {
      console.log('[Hawk] 🦅 READY 🫡');
      res(true);
    }, 1000);
  });
};

class Task {
  public status: TaskStatus = 'pending';
  private startTime = 0;
  private duration = 0;

  constructor(
    public name: string,
    private fn: TaskFn,
    private arg?: Target
  ) {}

  async run() {
    this.status = 'running';
    this.startTime = Date.now();
    try {
      const result = await this.fn(this.name, this.arg);
      this.status = result ? 'completed' : 'failed';
      this.duration = Date.now() - this.startTime;
      console.log(`[Hawk] ${this.name} ${this.status} (${this.duration}ms)`);
      return result;
    } catch (error) {
      this.status = 'failed';
      this.duration = Date.now() - this.startTime;
      console.error(
        `[Hawk] ${this.name} failed after ${this.duration}ms:`,
        error
      );
      return false;
    }
  }

  getDuration() {
    return this.duration;
  }
}

class TaskQueue {
  constructor(
    public taskNames: string[],
    private tasks: Map<string, Task>
  ) {}

  async run() {
    for await (const name of this.taskNames) {
      const success = await this.runTask(name);
      if (!success) {
        return false;
      }
    }
    return true;
  }

  async runTask(name: string): Promise<boolean> {
    const task = this.tasks.get(name);
    if (!task) {
      console.error(`[Hawk] Task ${name} not found`);
      return false;
    }

    return (async () => {
      return await task.run();
    })();
  }
}

class TaskManager {
  private tasks = new Map<string, Task>();
  private stats = {
    totalRuns: 0,
    startTime: Date.now(),
  };

  async run(taskNames: string[], exitOnFailure = false): Promise<boolean> {
    this.stats.totalRuns++;
    const queue = new TaskQueue(taskNames, this.tasks);

    const success = await queue.run();
    if (!success && exitOnFailure) {
      console.error('[Hawk] Exiting due to a task failure');
      process.exit(1);
    }

    return success;
  }

  registerTask(name: string, fn: TaskFn, fnArg?: Target) {
    if (this.tasks.has(name)) {
      throw new Error(`[Hawk] Task "${name}" is already registered`);
    }

    this.tasks.set(name, new Task(name, fn, fnArg));
  }

  logStats() {
    const uptime = Math.floor((Date.now() - this.stats.startTime) / 1000);
    console.log(`
[Hawk] Statistics:
- Uptime: ${uptime}s
- Total task runs: ${this.stats.totalRuns}
    `);
  }
}

const taskManager = new TaskManager();

taskManager.registerTask('clear-port', clearPort);
taskManager.registerTask('clean-client', clean, 'client');
taskManager.registerTask('clean-server', clean, 'server');
taskManager.registerTask('type-check-client', typeCheck, 'client');
taskManager.registerTask('type-check-server', typeCheck, 'server');
taskManager.registerTask('lint-client', lint, 'client');
taskManager.registerTask('lint-server', lint, 'server');
taskManager.registerTask('build-client', buildClient);
taskManager.registerTask('build-server', buildServer);
taskManager.registerTask('start-sse-server', startSseServer);
taskManager.registerTask('setup-file-watchers', setupFileWatchers);
taskManager.registerTask('start-api-server', startApiServer);
taskManager.registerTask('ready', ready);
taskManager.registerTask('notify-client-update', notifyUpdates, 'client');
taskManager.registerTask('notify-server-update', notifyUpdates, 'server');
taskManager.registerTask('build-css', buildCss, 'server');
taskManager.registerTask('copy-client', copyClientBuild);
taskManager.registerTask('copy-vendor', copyClientVendor);

if (process.env.NODE_ENV === 'production') {
  taskManager.run(
    [
      'clean-client',
      'clean-server',
      'build-client',
      'copy-client',
      'copy-vendor',
      'build-server',
      'build-css',
    ],
    true
  );
} else {
  taskManager.run(
    [
      'clear-port',
      'clean-client',
      'clean-server',
      'type-check-client',
      'lint-client',
      'build-client',
      'copy-client',
      'copy-vendor',
      'type-check-server',
      'lint-server',
      'build-server',
      'build-css',
      'start-sse-server',
      'setup-file-watchers',
      'start-api-server',
      'ready',
    ],
    true
  );
}
