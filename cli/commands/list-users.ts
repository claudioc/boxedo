import { Command } from '../lib/Command';
import { getAppContext } from '../lib/getAppContext';

export default class ListUsersCommand extends Command {
  async run() {
    const spinner = this.ui.spinner('Initializing…');

    this.context = await getAppContext(this.ui.createConsole(spinner));
    if (!this.context) {
      return;
    }

    const result = await this.context
      .getRepositoryFactory()
      .getUserRepository()
      .getAllUsers();

    if (result.isErr()) {
      this.ui.console.error(result.error.message);
      return;
    }

    spinner.stop();

    this.ui.console.info('Users:');
    this.ui.console.info(JSON.stringify(result.value, undefined, 2));
  }
}

ListUsersCommand.description = 'List the users allowed to login to Joongle';
