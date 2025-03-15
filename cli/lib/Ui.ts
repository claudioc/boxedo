import { confirm, input } from '@inquirer/prompts';
import yoctoSpinner, { Spinner } from 'yocto-spinner';

export class Ui {
  public spinner(text: string) {
    return yoctoSpinner({ text }).start();
  }

  public async prompt(
    message: string,
    options: { required: boolean; validate?: (val: string) => boolean } = {
      required: true,
    }
  ) {
    const answer = await input({
      message,
      required: options.required,
      validate: options.validate,
    });
    return answer;
  }

  public async confirm(message: string) {
    return await confirm({ message, default: false });
  }

  /**
   * A console-like which is spinner aware (stops and restart it) and adds a newline
   */
  public console(spinner: Spinner) {
    const createConsoleMethod = (method: 'log' | 'info' | 'error' | 'warn') => {
      return (...args: any[]) => {
        const wasSpinning = spinner.isSpinning;
        if (wasSpinning) {
          spinner.stop();
        }

        // Insert a newline as the first argument if it's a string
        if (args.length > 0 && typeof args[0] === 'string') {
          args[0] = `\n${args[0]}`;
        } else {
          args.unshift('\n');
        }

        console[method](...args);

        if (wasSpinning) {
          spinner.start();
        }
      };
    };

    return {
      log: createConsoleMethod('log'),
      info: createConsoleMethod('info'),
      error: createConsoleMethod('error'),
      warn: createConsoleMethod('warn'),
    };
  }
}
