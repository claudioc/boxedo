import yoctoSpinner from 'yocto-spinner';
import { Command } from '../lib/Command';
import { getAppContext } from '../lib/getAppContext';

export default class AddUserCommand extends Command {
  async run() {
    const spinner = yoctoSpinner({ text: 'Loading…' }).start();

    const context = await getAppContext();
    if (!context) {
      return;
    }

    const repo = await context.getRepositoryFactory().getUserRepository();

    spinner.stop();

    const email = await this.ui.prompt('User email address', {
      required: true,
    });
    const name = await this.ui.prompt('User full name', {
      required: true,
    });

    console.log(email, name);

    const yes = await this.ui.confirm('Is this correct?');
    if (!yes) {
      return;
    }
  }
}

AddUserCommand.description = 'Add a user to the Joongle';
