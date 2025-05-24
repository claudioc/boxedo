import type { AppContext } from 'boxedo-server/lib/AppContext';
import createDebug from 'debug';
import type { Argv as Yargs, Options as YargsOptions } from 'yargs';
import { Ui } from './Ui';

const debug = createDebug('boxedo-cli:bootstrap');

/**
 * Represents a command of the `boxedo` CLI.
 */
export abstract class Command {
  /**
   * The name of the command
   */
  public static commandName: string;

  /**
   * Description of what the command does. Displayed when the root help message prints
   */
  public static description = '';

  /**
   * Positional params for this command. Should follow yargs syntax for positional params
   */
  public static params = '';

  /**
   * An object whose keys are flag names, and values are yargs.option settings
   */
  public static flags: { [flagName: string]: YargsOptions } = {};

  public ui!: Ui;

  protected context: AppContext | null = null;

  protected isDryRun = false;

  // biome-ignore lint:
  public static async _run(argv: any): Promise<void> {
    // biome-ignore lint:
    const command: Command = new (<any>this)();
    command.ui = new Ui();
    command.isDryRun = !!argv.dryRun;

    // biome-ignore lint:
    debug(`invoking '${this.commandName}' command`);
    try {
      await command.run(argv);
    } catch (err) {
      // biome-ignore lint:
      console.error(`"${this.commandName}" command failed`);
      throw err;
    }
  }

  /**
   * Accepts the global yargs object, gives the command a chance to define its interface.
   */
  public static configure(commandName: string, yargs: Yargs): Yargs {
    let command = commandName;
    // biome-ignore lint:
    if (this.params) {
      // biome-ignore lint:
      command += ` ${this.params}`;
    }

    debug(`configuring command: ${command}`);

    return yargs.command(
      command,
      // biome-ignore lint:
      this.description,
      () => {},
      (args) => {
        // biome-ignore lint:
        this._run(args).catch((e) => {
          const stack = e.stack;
          console.error(stack);
        });
      }
    );
  }

  /**
   * Run the command. Can be omitted for pure-subcommand only
   */
  // biome-ignore lint:
  public async run(argv: any): Promise<void> {
    /* noop */
  }
}
