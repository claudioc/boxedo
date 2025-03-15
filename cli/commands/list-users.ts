import { Command } from '../lib/Command';
import { getAppContext } from '../lib/getAppContext';

export default class ListUsersCommand extends Command {
  async run() {
    const spinner = this.ui.spinner('Running…');

    const context = await getAppContext(this.ui.console(spinner));
    if (!context) {
      return;
    }

    const result = await context
      .getRepositoryFactory()
      .getUserRepository()
      .getAllUsers();

    if (result.isErr()) {
      console.error(result.error.message);
      return;
    }

    spinner.success('Success!');

    console.log('Users:');
    console.log(result.value);
  }
}

ListUsersCommand.description = 'List the users allowed to login to Joongle';
