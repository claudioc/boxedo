import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import path, { basename } from 'node:path';
import { loadConfig } from '~/lib/helpers';
import { Command } from '../lib/Command';
import {
  DOCKER_IMAGE_NAME,
  dockerComposeDown,
  dockerComposeUp,
  isDockerAvailable,
  isDockerImageRunning,
} from '../lib/tools';

export default class DbRestoreCommand extends Command {
  async run() {
    const config = loadConfig();
    if (config.BXD_DB_BACKEND !== 'remote') {
      this.ui.console.info(
        `"${config.BXD_DB_BACKEND}" database cannot be restored using the CLI.`
      );
      return;
    }

    if (!isDockerAvailable()) {
      this.ui.console.error(`
❌ Docker is not installed or is not available.
This command only makes sense if you are using a CouchDb database running in a local Docker container.

If your CouchDb database is not running in a Docker container, you have to restore it manually.
If you are not using a CouchDb database (BXD_DB_BACKEND is 'local'), then you just have to restore the database directory.

Please double check the project's README.md and https://docs.docker.com/get-docker/
`);
      return;
    }

    if (!isDockerImageRunning(DOCKER_IMAGE_NAME)) {
      this.ui.console.error(`
❌ The CouchDB container is not running.
Please make sure the CouchDB container is running before trying to restore the database.
`);
      return;
    }

    this.ui.console.info(`
⚠️  This command will trying restoring a CouchDB database from a tgz file that you are providing.
This operation cannot undone and the side-effects are unpredictable.
Use it at your own risk and most importantly, use only if you are trying to restore over an empty database!
`);

    if (!(await this.ui.confirm(`Are you sure you want to continue?`))) {
      this.ui.console.info('Restore aborted.');
      process.exit(0);
    }

    const archiveName = await this.ui.prompt(
      'Which one is the .tgz file that should be restored?',
      {
        required: true,
        validate: (val: string) =>
          (val.endsWith('.tar.gz') || val.endsWith('.tgz')) &&
          val.length > 4 &&
          fs.existsSync(val),
      }
    );

    const spinner = this.ui.spinner('Restoring the remote database…');
    try {
      console.log(
        `docker cp ${path.resolve(archiveName)} ${DOCKER_IMAGE_NAME}:/tmp/`
      );
      execSync(
        `docker cp ${path.resolve(archiveName)} ${DOCKER_IMAGE_NAME}:/tmp/`
      );
      execSync(
        `docker exec ${DOCKER_IMAGE_NAME} tar -xzf /tmp/${basename(archiveName)} -C /opt/couchdb/data`
      );
      dockerComposeDown();
      dockerComposeUp();
    } catch (error: any) {
      this.ui.console.error(error.message || error);
      spinner.stop('❌ Failed to restore the couchdb database.');
      process.exit(1);
    }

    spinner.success(`Remote database restored from ${archiveName}`);
  }
}

DbRestoreCommand.description =
  'Restores a CouchDB tgz into a docker volume. It does nothing for local databases.';
