import { loadConfig } from 'boxedo-server/lib/helpers';
import { Command } from '../lib/Command';
import { dockerComposeUp, isDockerAvailable } from '../lib/tools';

export default class DbUpCommand extends Command {
  async run() {
    const config = loadConfig();
    if (config.BXD_DB_BACKEND !== 'remote') {
      this.ui.console.info(
        `"${config.BXD_DB_BACKEND}" database does not need to be started.`
      );
      return;
    }

    if (!isDockerAvailable()) {
      this.ui.console.error(`
❌ Docker is not installed or is not available.
This command only makes sense if you are using a CouchDb database running in a local Docker container.

If your CouchDb database is not running in a Docker container, you have to start it manually.
If you are not using a CouchDb database (BXD_DB_BACKEND is 'local'), then you don't need to start or stop the database.

Please double check the project's README.md and https://docs.docker.com/get-docker/
`);
      return;
    }

    const spinner = this.ui.spinner('Starting the docker container…');
    this.ui.console.info(`\nRemote database URL: ${config.BXD_DB_REMOTE_URL}`);
    this.ui.console.info(`Remote database name: ${config.BXD_DB_NAME}`);

    try {
      dockerComposeUp();
    } catch (error: any) {
      this.ui.console.error(error.message || error);
      spinner.stop('❌ Failed to start the remote database.');
      return;
    }

    spinner.success('Remote database started.');
  }
}

DbUpCommand.description =
  'Starts the CouchDB database using the provided docker compose. It does nothing for local databases.';
