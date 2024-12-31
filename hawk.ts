import { watch, rm } from 'node:fs/promises';
import * as esbuild from 'esbuild';
import { type ChildProcess, spawn } from 'node:child_process';
import { createServer, type Server, type ServerResponse } from 'node:http';
import { createInterface } from 'node:readline';

interface SseClient {
  id: number;
  response: ServerResponse;
}

type Target = 'client' | 'server';
type TaskFn = (name: string, arg?: Target) => Promise<boolean>;
type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

const sseClients: SseClient[] = [];

let longTaskCount = 0;

const parsePort = (input: string | undefined): string | undefined => {
  if (!input?.trim()) return;
  const port = Number.parseInt(input.trim(), 10);
  return Number.isNaN(port) ? undefined : String(port);
};

let { LIVERELOAD_PORT, LIVERELOAD_ADDRESS } = process.env;

LIVERELOAD_ADDRESS = LIVERELOAD_ADDRESS?.trim();
LIVERELOAD_PORT = parsePort(LIVERELOAD_PORT);

const hasLiveReload = LIVERELOAD_ADDRESS && LIVERELOAD_PORT;
const LIVERELOAD_URL = hasLiveReload
  ? `http://${LIVERELOAD_ADDRESS}:${LIVERELOAD_PORT}/updates`
  : '';

let apiServer: ChildProcess | null = null;
let sseServer: Server | null = null;

const spawnWithPrefix = (command: string, args: string[], prefix: string) => {
  const proc = spawn(command, args, {
    env: { ...process.env, FORCE_COLOR: '2' },
    stdio: ['inherit', 'pipe', 'pipe'],
    detached: false,
  });

  const stdout = createInterface({ input: proc.stdout });
  stdout.on('line', (line) => {
    console.log(`[${prefix}] ${line}`);
  });

  const stderr = createInterface({ input: proc.stderr });
  stderr.on('line', (line) => {
    console.error(`[${prefix}] ${line}`);
  });

  return proc;
};

const killApiServer = async () => {
  if (apiServer) {
    apiServer.kill('SIGKILL');
    // Wait for the API server to fully terminate
    await new Promise<void>((resolve) => {
      apiServer?.on('exit', () => {
        apiServer = null;
        console.log('[Hawk] API server terminated');
        resolve();
      });
    });
  }
};

const killSseServer = async () => {
  if (sseServer) {
    await new Promise<void>((resolve) => {
      sseServer?.close(() => {
        console.log('[Hawk] SSE server closed');
        sseServer = null;
        resolve();
      });
    });
  }
};

const startApiServer: TaskFn = async (name) => {
  if (apiServer) {
    await killApiServer();
  }

  console.log('[Hawk] Starting API server...');
  return new Promise((resolve) => {
    apiServer = spawnWithPrefix(
      'node',
      ['--env-file=.env', './dist/server/app.js'],
      name
    );

    apiServer.on('error', (err) => {
      console.error('[Hawk] API server error:', err);
      resolve(false);
    });

    apiServer.on('spawn', (_) => {
      resolve(true);
    });
  });
};

const clean: TaskFn = async (_, target = 'client') => {
  try {
    console.log(`[Hawk] Cleaning dist/${target}`);
    await rm(`dist/${target}`, { recursive: true, force: true });
    return true;
  } catch (error) {
    console.error(`[Hawk] Error cleaning dist/${target}:`, error);
    return false;
  }
};

const setupFileWatchers: TaskFn = async (_) => {
  try {
    const watchClient = async () => {
      const clientWatcher = watch('client', { recursive: true });
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
      const serverWatcher = watch('server', { recursive: true });
      for await (const event of serverWatcher) {
        if (event.filename?.match(/\.(ts|tsx|css)$/)) {
          console.log(`[Hawk] Server change: ${event.filename}`);
          taskManager.run([
            'type-check-server',
            'lint-server',
            'clean-server',
            'build-server',
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
          ['package.json', '.env', 'hawk.ts'].includes(event.filename as string)
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

          /*
          const proc = spawn('npm', ['run', 'dev'], {
            stdio: 'inherit',
            env: process.env,
            detached: false,
          });

          process.on('SIGINT', () => {
            proc.kill('SIGINT');
          });
          process.on('SIGTERM', () => {
            proc.kill('SIGTERM');
          });

          proc.on('exit', (code) => {
            process.exit(code);
          });
          */
        }
      }
    };

    Promise.all([watchClient(), watchServer(), watchRoot()]).catch((error) => {
      console.error('[Hawk] Watch error:', error);
    });
  } catch (error) {
    console.error('[Hawk] Watch error:', error);
    return false;
  }

  return true;
};

const typeCheck: TaskFn = async (_, target = 'client') => {
  return new Promise<boolean>((resolve) => {
    const tsc = spawn('node_modules/.bin/tsc', ['-p', target], {
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
    const tsc = spawn('node_modules/.bin/biome', ['lint', target], {
      stdio: 'inherit',
    });

    tsc.on('error', (err) => {
      console.error('[Hawk] Error running biome linter', err);
      resolve(false);
    });

    tsc.on('close', (code) => resolve(code === 0));
  });
};

const buildClient: TaskFn = async (_) => {
  await esbuild.build({
    entryPoints: ['./client/app.ts', './client/editor.ts'],
    bundle: true,
    sourcemap: process.env.NODE_ENV !== 'production',
    logLevel: 'info',
    define: {
      LIVERELOAD_URL: JSON.stringify(LIVERELOAD_URL),
    },
    platform: 'browser',
    entryNames: '[dir]/[name]-[hash]',
    minify: process.env.NODE_ENV === 'production',
    outdir: './dist/client',
  });

  return true;
};

const buildServer: TaskFn = async (_) => {
  await esbuild.build({
    entryPoints: ['./server/app.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    logLevel: 'info',
    outdir: './dist/server',
    // This banner is required for a workaround in __dirname/__filename and fastify
    banner: {
      js: 'import { createRequire } from "module";const require = createRequire(import.meta.url);',
    },
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

  sseServer.listen(Number(LIVERELOAD_PORT), LIVERELOAD_ADDRESS, () => {
    console.log(`[Hawk] SSE server started on ${LIVERELOAD_URL}`);
  });

  return true;
};

const ready: TaskFn = async (_) => {
  return new Promise((res) => {
    setTimeout(() => {
      console.log('[Hawk] -=> READY <=-');
      res(true);
    }, 1000);
  });
};

const longTask: TaskFn = async () => {
  return new Promise((res) => {
    const runId = ++longTaskCount;
    console.log(`[Hawk LONG TASK] #${runId} started`);
    setTimeout(() => {
      console.log(`[Hawk LONG TASK] #${runId} finished`);
      res(true);
    }, 5000);
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

    // this.logStats();

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
taskManager.registerTask('long-task', longTask);
taskManager.registerTask('notify-client-update', notifyUpdates, 'client');
taskManager.registerTask('notify-server-update', notifyUpdates, 'server');

if (process.env.NODE_ENV === 'production') {
  taskManager.run(
    ['type-check-client', 'build-client', 'type-check-server', 'build-server'],
    true
  );
} else {
  taskManager.run(
    [
      'clean-client',
      'clean-server',
      'type-check-client',
      'lint-client',
      'build-client',
      'type-check-server',
      'lint-server',
      'build-server',
      'start-sse-server',
      'setup-file-watchers',
      'start-api-server',
      'ready',
    ],
    true
  );
}
