import { UserRole, userRoles } from 'boxedo-core/types';
import { capitalize } from 'lib/tools';
import { Command } from '../lib/Command';
import { getAppContext } from '../lib/getAppContext';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default class UserRoleCommand extends Command {
  async run() {
    const spinner = this.ui.spinner('Initializing…');
    this.context = await getAppContext(this.ui.createConsole(spinner));
    spinner.stop();
    if (!this.context) {
      return;
    }

    while (await this.updateRole());
  }

  async updateRole() {
    const repo = await this.context!.getRepositoryFactory().getUserRepository();

    const email = await this.ui.prompt('User email address', {
      required: true,
      validate: (val) => emailRegex.test(val),
    });

    const maybeUser = await repo.getUserByEmail(email);
    if (maybeUser.isErr()) {
      this.ui.console.error(maybeUser.error.message);
      return false;
    }

    if (!maybeUser.value) {
      this.ui.console.error('This user email is not registered');
      return true;
    }

    const user = maybeUser.value;

    const role = await this.ui.select<UserRole>(
      'New user role',
      userRoles.map((role) => {
        return {
          value: role,
          name: capitalize(role),
        };
      }),
      user.role
    );

    if (!(await this.ui.confirm('Confirm?'))) {
      return false;
    }

    user.role = role;
    const result = await repo.updateUser(user);

    if (result.isErr()) {
      this.ui.console.error(result.error.message);
      return false;
    }

    this.ui.console.info('User role updated');

    return await this.ui.confirm('Edit another one?');
  }
}

UserRoleCommand.description = "Change a user's role";
