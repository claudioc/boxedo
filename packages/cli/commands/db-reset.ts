import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import path from 'node:path';
import { Command } from '../lib/Command';
import { getAppContext } from '../lib/getAppContext';
import {
  DOCKER_IMAGE_NAME,
  dockerComposeDown,
  dockerComposeUp,
  isDockerAvailable,
  isDockerImageRunning,
  waitForService,
} from '../lib/tools';

export default class DbResetCommand extends Command {
  async run() {
    const spinner = this.ui.spinner('Initializing…');
    this.context = await getAppContext(this.ui.createConsole(spinner));
    spinner.stop();
    if (!this.context) {
      return;
    }

    const config = this.context.getConfig();
    if (
      !(await this.ui.confirm(
        `Are you sure you want to reset the ${config.BXD_DB_BACKEND} database? This will destroy all data in the current database!`
      ))
    ) {
      this.ui.console.info('Aborted.');
      process.exit(0);
    }

    switch (config.BXD_DB_BACKEND) {
      case 'local':
        if (await this.destroyLocalDatabase()) {
          this.ui.console.info('Success.');
        }
        process.exit(0);
        break;

      case 'remote':
        if (await this.destroyRemoteDatabase()) {
          this.ui.console.info('Success.');
        }
        process.exit(0);
        break;

      default:
        this.ui.console.info(
          `The backend "${config.BXD_DB_BACKEND}" cannot be reset.`
        );
        process.exit(1);
    }
  }

  async destroyLocalDatabase(): Promise<boolean> {
    // biome-ignore lint:
    const config = this.context!.getConfig();

    const dbLocalPath = config.BXD_DB_LOCAL_PATH;

    if (!dbLocalPath || dbLocalPath === '/' || dbLocalPath === '~') {
      this.ui.console.error(
        `❌ Invalid BXD_DB_LOCAL_PATH (${dbLocalPath}). Cannot reset database.`
      );
      return false;
    }

    if (!fs.existsSync(dbLocalPath)) {
      this.ui.console.error(
        `⚠️ Database directory "${dbLocalPath}" does not exist. Nothing to reset.`
      );
      return false;
    }

    if (!fs.existsSync(path.join(dbLocalPath, `${config.BXD_DB_NAME}.db`))) {
      this.ui.console.error(
        `⚠️ Database file "${config.BXD_DB_NAME}.db" does not exist in "${dbLocalPath}". Nothing to reset.`
      );
      return false;
    }

    const dbFullPath = path.resolve(dbLocalPath);

    this.ui.console.warn(
      `About to delete your database by nuking the directory ${dbFullPath}\n⚠️  We are going to run "rm -rf" on it.`
    );

    await this.ui.prompt(
      'To confirm, please write down the name of the directory (or Ctrl+C):',
      {
        required: true,
        validate: (val: string) => val === dbFullPath,
      }
    );

    if (this.isDryRun) {
      this.ui.console.info(`Dry run: would have deleted ${dbFullPath} by now.`);
      return true;
    }

    // For Windows compatibility, use fs.rmSync instead of rm -rf
    // (note that we don't generally support Windows, but this test was given for free by Claude, so we keep it)
    try {
      if (process.platform === 'win32') {
        fs.rmSync(dbFullPath, { recursive: true, force: true });
      } else {
        execSync(`rm -rf ${dbFullPath}`, { stdio: 'inherit' });
      }
      // biome-ignore lint:
    } catch (error: any) {
      this.ui.console.error(error.message || error);
      this.ui.console.error(
        `❌ Failed to delete the database directory ${dbFullPath}.`
      );
      return false;
    }

    return true;
  }

  async destroyRemoteDatabase(): Promise<boolean> {
    // biome-ignore lint:
    const config = this.context!.getConfig();

    if (!isDockerAvailable()) {
      this.ui.console.error(`
❌ Docker is not installed or is not available.
This command only makes sense if you are using a CouchDb database running in a local Docker container.

If your CouchDb database is not running in a Docker container, you have to reset it manually.

Please double check the project's README.md and https://docs.docker.com/get-docker/
`);
      return false;
    }

    if (!isDockerImageRunning(DOCKER_IMAGE_NAME)) {
      this.ui.console.error(`
❌ The CouchDB container is not running.
Please make sure the CouchDB container is running before trying to reset the database.
`);
      return false;
    }

    if (!config.BXD_DB_REMOTE_URL) {
      this.ui.console.error('❌ BXD_DB_REMOTE_URL not found in .env file');
      return false;
    }

    let volumeName: string;
    try {
      const composeConfigOutput = execSync(
        'docker compose config --format json',
        { encoding: 'utf8' }
      );
      const config = JSON.parse(composeConfigOutput);
      const volumes = Object.keys(config.volumes || {});

      if (!volumes.length) {
        this.ui.console.error('❌ Could not determine docker volume name');
        return false;
      }

      volumeName = volumes[0];
    } catch (error) {
      this.ui.console.error(
        '❌ Error getting volume name:',
        error instanceof Error ? error.message : String(error)
      );
      return false;
    }

    const projectName = path.basename(process.cwd());
    const fullVolumeName = `${projectName}_${volumeName}`;

    this.ui.console.warn(
      `About to delete your database by nuking docker volume ${fullVolumeName}.`
    );

    await this.ui.prompt(
      'To confirm, please write down the name of the volume as shown here above (or Ctrl+C to abort):',
      {
        required: true,
        validate: (val: string) => val === fullVolumeName,
      }
    );

    if (this.isDryRun) {
      this.ui.console.info(
        `Dry run: would have deleted ${fullVolumeName} by now.`
      );
      return true;
    }

    this.ui.console.info('Stopping containers…');
    try {
      dockerComposeDown();
      // biome-ignore lint:
    } catch (error) {
      this.ui.console.error('❌ Failed to stop containers');
      return false;
    }

    this.ui.console.info(`Removing volume ${fullVolumeName}…`);
    try {
      execSync(`docker volume rm "${fullVolumeName}"`, { stdio: 'inherit' });
    } catch {
      this.ui.console.error('❌ Failed to remove volume');
      return false;
    }

    this.ui.console.info('Starting containers…');
    try {
      dockerComposeUp();
    } catch {
      this.ui.console.error('Failed to start containers');
      return false;
    }

    // Wait for CouchDB to be ready
    const spinner = this.ui
      .spinner('Waiting for CouchDB to be available…')
      .start();
    const serviceReady = await waitForService(config.BXD_DB_REMOTE_URL);
    if (!serviceReady) {
      spinner.stop();
      this.ui.console.error('❌ Timeout waiting for CouchDB to be ready');
      return false;
    }

    // Create _users database
    this.ui.console.info('Creating _users database…');

    const url = `${config.BXD_DB_REMOTE_URL}/_users`;

    try {
      await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization:
            // biome-ignore lint:
            'Basic ' +
            Buffer.from(
              `${config.BXD_DB_REMOTE_USER}:${config.BXD_DB_REMOTE_PASSWORD}`
            ).toString('base64'),
        },
      });
      // biome-ignore lint:
    } catch (error: any) {
      this.ui.console.error(
        '❌ Failed to create CouchDb _users database',
        error.message || error
      );
      return false;
    }

    return true;
  }
}

DbResetCommand.description =
  'Destroys the current database! For remote databases, it only works if docker is available';
