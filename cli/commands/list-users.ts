import { AppContext } from '~/lib/AppContext';
import { loadConfig } from '~/lib/helpers';
import { Command } from '../lib/Command';

export default class ListUsersCommand extends Command {
  async run() {
    const config = loadConfig();

    const contextResult = await AppContext.create({
      config,
      logger: console,
    });

    if (contextResult.isErr()) {
      console.error(contextResult.error.message);
      return;
    }

    const context = contextResult.value;

    const userRepo = context.getRepositoryFactory().getUserRepository();

    const result = await userRepo.getAllUsers();

    if (result.isErr()) {
      console.error(result.error.message);
      return;
    }

    console.log('Users:');
    console.log(result.value);
  }
}

ListUsersCommand.description = 'List the users allowed to login to Joongle';
