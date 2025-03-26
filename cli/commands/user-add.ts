import { capitalize } from 'lib/tools';
import { generateIdFor } from '~/lib/helpers';
import { UserRole, userRoles } from '../../types';
import { Command } from '../lib/Command';
import { getAppContext } from '../lib/getAppContext';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default class UserAddCommand extends Command {
  async run() {
    const spinner = this.ui.spinner('Initializing…');
    this.context = await getAppContext(this.ui.createConsole(spinner));
    spinner.stop();
    if (!this.context) {
      return;
    }

    while (await this.addUser());
  }

  async addUser() {
    const repo = await this.context!.getRepositoryFactory().getUserRepository();

    const answers = {
      email: await this.ui.prompt('User email address', {
        required: true,
        validate: (val) => emailRegex.test(val),
      }),
      name: await this.ui.prompt('User full name'),
      role: await this.ui.select<UserRole>(
        'User role',
        userRoles.map((role) => {
          return {
            value: role,
            name: capitalize(role),
          };
        }),
        'author'
      ),
    };

    // Check if the user already exists
    const maybeUser = await repo.getUserByEmail(answers.email);
    if (maybeUser.isErr()) {
      this.ui.console.error(maybeUser.error.message);
      return false;
    }

    if (maybeUser.value) {
      this.ui.console.error('This user email is already present');
      return true;
    }

    if (!(await this.ui.confirm('Confirm?'))) {
      return false;
    }

    const result = await repo.insertUser({
      _id: generateIdFor('user'),
      type: 'user',
      email: answers.email,
      fullname: answers.name,
      role: answers.role,
      createdAt: new Date().toISOString(),
    });

    if (result.isErr()) {
      this.ui.console.error(result.error.message);
      return false;
    }

    this.ui.console.info('User added');

    return await this.ui.confirm('Add another one?');
  }
}

UserAddCommand.description = 'Add a user to the Joongle database';
