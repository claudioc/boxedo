import createDebug from 'debug';
import type { Argv as Yargs } from 'yargs';
import yargs from 'yargs';

import { commandMap } from '../commands';

const debug = createDebug('boxedo-cli:bootstrap');

// Ensure if any promises aren't handled correctly then they get logged
process.on('unhandledRejection', (reason, promise) => {
  console.warn('A promise was rejected but did not have a .catch() handler:');
  // @ts-ignore
  console.warn(reason?.stack || reason || promise);
  throw reason;
});

export const bootstrap = {
  /**
   * Configure a single command
   */
  async loadCommand(commandName: string, argParser: Yargs): Promise<void> {
    commandMap[commandName].configure(commandName, argParser);
  },

  /**
   * Kicks off the Boxedo CLI.
   */
  async run() {
    const argv = process.argv.slice(2);
    debug('Starting bootstrap process');

    const argParser = yargs();
    argParser.usage(`
Usage: boxedo <command> [options]

This is Boxedo CLI.`);

    // Get the first argument so we can not load all the commands at once
    const firstArg = argv.shift();

    // Special-case `help` because we only want to configure all the commands
    // for this one case
    if (firstArg === 'help' || firstArg === '--help') {
      debug('running help command, requiring and configuring every command');
      for (const [commandName, _] of Object.entries(commandMap)) {
        await bootstrap.loadCommand(commandName, argParser);
      }
      argv.unshift('help');
      // biome-ignore lint:
    } else if (commandMap[firstArg!]) {
      // biome-ignore lint:
      const commandName = firstArg!;
      await bootstrap.loadCommand(commandName, argParser);
      // biome-ignore lint:
      argv.unshift(commandName!);
    } else {
      // Command not found :( Error and exit
      console.error(
        `Unrecognized command: '${firstArg}'. Run \`boxedo help\` for usage.`
      );
      process.exit(1);
    }

    argParser
      .scriptName('boxedo')
      .wrap(Math.min(150, argParser.terminalWidth()))
      .epilogue('For more information, see our docs.')
      .group('help', 'Global Options:')
      .option('n', {
        alias: 'dry-run',
        describe: "Execute the command but don't apply any change",
        type: 'boolean',
        group: 'Global Options:',
      })
      .version(false)
      .parse(argv);
  },
};
