import createDebug from 'debug';
import fs from 'node:fs';
import path from 'node:path';
import type { Argv as Yargs } from 'yargs';
import yargs from 'yargs';

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
   * Discovers any commands inside of the commands folder
   */
  discoverCommands(
    commands: Record<string, string>,
    dir: string
  ): Record<string, string> {
    const commandsDir = path.join(dir, 'commands');

    // No commands here if commands dir doesn't exist
    if (!fs.existsSync(commandsDir)) {
      return commands;
    }

    // Read the directory and find the commands
    fs.readdirSync(commandsDir)
      .filter(
        (command) =>
          path.extname(command) === '.ts' ||
          fs.existsSync(path.join(commandsDir, command, `${command}.ts`))
      )
      .forEach((command) => {
        const basename = path.basename(command, '.ts');
        const commandName = basename;
        commands[commandName] = path.resolve(commandsDir, basename);
      });

    return commands;
  },

  /**
   * Configure a single command
   */
  async loadCommand(
    commandName: string,
    commandPath: string,
    argParser: Yargs
  ): Promise<void> {
    const module = await import(commandPath);
    const CommandClass = module.default || module;
    CommandClass.configure(commandName, argParser);
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

    const commands = bootstrap.discoverCommands({}, './packages/cli');

    debug(`Discovered commands: ${Object.keys(commands).join(', ')}`);

    // Get the first argument so we can not load all the commands at once
    const firstArg = argv.shift();

    // Special-case `help` because we only want to configure all the commands
    // for this one case
    if (firstArg === 'help' || firstArg === '--help') {
      debug('running help command, requiring and configuring every command');
      for (const [commandName, commandPath] of Object.entries(commands)) {
        await bootstrap.loadCommand(commandName, commandPath, argParser);
      }
      argv.unshift('help');
      // biome-ignore lint:
    } else if (commands[firstArg!]) {
      // biome-ignore lint:
      const commandName = firstArg!;
      // biome-ignore lint:
      const commandPath = commands[firstArg!];
      await bootstrap.loadCommand(commandName, commandPath, argParser);
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
