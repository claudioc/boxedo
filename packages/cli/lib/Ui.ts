import { confirm, input, select } from '@inquirer/prompts';
import { AnyLogger } from 'boxedo-core/types';
import yoctoSpinner, { Spinner } from 'yocto-spinner';

export class Ui {
  private _console!: AnyLogger;

  public spinner(text: string) {
    return yoctoSpinner({ text }).start();
  }

  public async select<T>(
    message: string,
    choices: { name: string; value: T }[],
    def: T
  ): Promise<T> {
    try {
      const answer = await select({
        message,
        choices,
        default: def,
      });
      return answer;
    } catch (error) {
      this.checkCtrlC(error);
      process.exit(1);
    }
  }

  public async prompt(
    message: string,
    options: {
      default?: string;
      required: boolean;
      validate?: (val: string) => boolean;
    } = {
      required: true,
    }
  ): Promise<string> {
    try {
      const answer = await input({
        message,
        default: options.default,
        required: options.required,
        validate: options.validate,
      });
      return answer;
    } catch (error) {
      this.checkCtrlC(error);
      process.exit(1);
    }
  }

  public async confirm(message: string): Promise<boolean> {
    try {
      return await confirm({ message, default: false });
    } catch (error) {
      this.checkCtrlC(error);
      process.exit(1);
    }
  }

  /**
   * A console-like which is spinner aware (stops and restart it) and adds a newline
   */
  public createConsole(spinner?: Spinner): AnyLogger {
    const createConsoleMethod = (method: 'log' | 'info' | 'error' | 'warn') => {
      return (...args: any[]) => {
        const wasSpinning = spinner && spinner.isSpinning;
        if (wasSpinning) {
          spinner.stop();
        }

        // Insert a newline as the first argument if it's a string
        if (wasSpinning) {
          if (args.length > 0 && typeof args[0] === 'string') {
            args[0] = `\n${args[0]}`;
          } else {
            args.unshift('\n');
          }
        }

        console[method](...args);

        if (wasSpinning) {
          spinner.start();
        }
      };
    };

    this._console = {
      info: createConsoleMethod('info'),
      error: createConsoleMethod('error'),
      warn: createConsoleMethod('warn'),
    };

    return this._console;
  }

  get console() {
    return this._console ?? console;
  }

  private checkCtrlC(error: any): void {
    if (error instanceof Error && error.name === 'ExitPromptError') {
      console.log('👋 until next time!');
      process.exit(0);
    }
  }
}
