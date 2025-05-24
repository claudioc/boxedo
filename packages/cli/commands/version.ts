import fs from 'node:fs';
import path from 'node:path';
import { Command } from '../lib/Command';

export default class VersionCommand extends Command {
  async run() {
    const spinner = this.ui.spinner('Getting version information...');

    try {
      // Get the root package.json first
      const rootPackagePath = path.join(process.cwd(), 'package.json');
      const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, 'utf8'));

      spinner.stop();

      this.ui.console.info(
        `Boxedo version: ${rootPackage.version}\n\nPackages:`
      );

      const packagesDir = path.join(process.cwd(), 'packages');
      const packageDirs = fs.readdirSync(packagesDir);

      // Read each package's package.json and get its version
      for (const packageDir of packageDirs) {
        const packageJsonPath = path.join(
          packagesDir,
          packageDir,
          'package.json'
        );

        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(
            fs.readFileSync(packageJsonPath, 'utf8')
          );
          this.ui.console.info(
            `  - ${packageJson.name}: ${packageJson.version}`
          );
        }
      }
    } catch (error) {
      spinner.stop();
      this.ui.console.error(`Error retrieving version information: ${error}`);
    }
  }
}

VersionCommand.description =
  'Shows the current version of all the packages in this monorepo.';
