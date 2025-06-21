# Boxedo CLI 🦅

The command-line interface for Boxedo, providing powerful tools for managing users, exporting pages, checking translations, and performing administrative tasks.

## Usage

From the root of the project:

```bash
npx boxedo-cli help
```

Or for debug mode:

```bash
DEBUG=boxedo-cli:* npx boxedo-cli help
```

## Available Commands

For currently available list of commands please just run the help command.

## Requirements

- Node.js 20+
- A configured `.env` file in the project root

## Development

The CLI is built with TypeScript and uses:
- [yargs](https://yargs.js.org/) for argument parsing
- [inquirer](https://github.com/SBoudrias/Inquirer.js) for interactive prompts
- [debug](https://www.npmjs.com/package/debug) for logging

---

📖 **[Back to main documentation](../../README.md)**
