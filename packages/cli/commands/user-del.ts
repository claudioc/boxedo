import { Command } from '../lib/Command';
import { getAppContext } from '../lib/getAppContext';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default class UserDelCommand extends Command {
  async run() {
    const spinner = this.ui.spinner('Initializing…');
    this.context = await getAppContext(this.ui.createConsole(spinner));
    spinner.stop();
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

    if (result.value.length === 0) {
      this.ui.console.info('No users found');
      return;
    }

    while (await this.delUser());
  }

  async delUser() {
    const repo = await this.context!.getRepositoryFactory().getUserRepository();

    const answers = {
      email: await this.ui.prompt('User email address to delete', {
        required: true,
        validate: (val) => emailRegex.test(val),
      }),
    };

    // Check if the user already exists
    const maybeUser = await repo.getUserByEmail(answers.email);
    if (maybeUser.isErr()) {
      this.ui.console.error(maybeUser.error.message);
      return false;
    }

    if (!maybeUser.value) {
      this.ui.console.error('This user email is not present');
      return true;
    }

    if (!(await this.ui.confirm('Confirm?'))) {
      return false;
    }

    const result = await repo.deleteUser(maybeUser.value._id);

    if (result.isErr()) {
      this.ui.console.error(result.error.message);
      return false;
    }

    this.ui.console.info('User deleted');

    return await this.ui.confirm('Delete another one?');
  }
}

UserDelCommand.description = 'Delete a user from Boxedo database';
