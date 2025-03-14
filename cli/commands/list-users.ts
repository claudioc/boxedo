import { Command } from '../lib/Command';

export default class ListUsersCommand extends Command {
  async run() {
    console.log('Run');
  }
}

ListUsersCommand.description = 'View running ghost processes';
