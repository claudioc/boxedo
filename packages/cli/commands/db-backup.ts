import { loadConfig } from 'boxedo-server/lib/helpers';
import { execSync } from 'node:child_process';
import { Command } from '../lib/Command';
import {
  DOCKER_IMAGE_NAME,
  generateBackupFilename,
  isDockerAvailable,
  isDockerImageRunning,
} from '../lib/tools';

export default class DbBackupCommand extends Command {
  async run() {
    const config = loadConfig();
    if (config.BXD_DB_BACKEND !== 'remote') {
      this.ui.console.info(
        `"${config.BXD_DB_BACKEND}" database cannot be backed up using the CLI.`
      );
      return;
    }

    if (!isDockerAvailable()) {
      this.ui.console.error(`
❌ Docker is not installed or is not available.
This command only makes sense if you are using a CouchDb database running in a local Docker container.

If your CouchDb database is not running in a Docker container, you have to backup it manually.
If you are not using a CouchDb database (BXD_DB_BACKEND is 'local'), then you just have to backup the database directory.

Please double check the project's README.md and https://docs.docker.com/get-docker/
`);
      return;
    }

    if (!isDockerImageRunning(DOCKER_IMAGE_NAME)) {
      this.ui.console.error(`
❌ The CouchDB container is not running.
Please make sure the CouchDB container is running before trying to backup the database.
`);
      return;
    }

    const spinner = this.ui.spinner('Backing the remote database up…');
    const localBackupFilename = generateBackupFilename('couchdb-backup', 'tgz');
    try {
      execSync(
        `docker exec ${DOCKER_IMAGE_NAME} tar -czf /tmp/couchdb-backup.tar.gz -C /opt/couchdb/data .`
      );

      execSync(
        `docker cp ${DOCKER_IMAGE_NAME}:/tmp/couchdb-backup.tar.gz ./${localBackupFilename}`
      );
    } catch (error: any) {
      this.ui.console.error(error.message || error);
      spinner.stop('❌ Failed to backup the couchdb database.');
      return;
    }

    spinner.success(`Remote database backed up into ./${localBackupFilename}`);
  }
}

DbBackupCommand.description =
  'Backups the CouchDB docker volume into a tgz. It does nothing for local databases.';
