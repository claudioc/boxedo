import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Command } from '../lib/Command';

/**
 * Categories for organizing commits
 */
interface CommitCategories {
  features: string[];
  fixes: string[];
  docs: string[];
  chore: string[];
  refactor: string[];
  test: string[];
  style: string[];
  other: string[];
}

type VersionType = 'major' | 'minor' | 'patch';

export default class ReleaseCommand extends Command {
  async run() {
    this.ui.createConsole();

    try {
      const nextVersion = await this.createRelease();

      if (!nextVersion) {
        return;
      }

      if (!this.isGitHubCliAvailable()) {
        this.ui.console.info(`
GitHub CLI (gh) is not installed or not available in PATH.
To create GitHub releases, please install the GitHub CLI:
    https://cli.github.com/
You can still release manually from the github web interface.
`);
        return;
      }

      if (
        await this.ui.confirm(`Ready to create a release for GitHub. Proceed?`)
      ) {
        try {
          const changelogContent = fs.readFileSync('CHANGELOG.md', 'utf8');
          await this.createGitHubRelease(nextVersion, changelogContent);
        } catch (error) {
          this.ui.console.error(
            'An error occurred while creating a release on GitHub. Please do it manually.',
            error
          );
          return;
        }
      }
    } catch (error) {
      this.ui.console.error('Unhandled error:', error);
      process.exit(1);
    }
  }

  /**
   * Main function to run the release process
   */
  async createRelease(): Promise<string | null> {
    try {
      const currentVersion = this.getCurrentVersion();
      this.ui.console.info(`Current version: ${currentVersion}`);

      const commits = this.getCommitsSinceLastTag(currentVersion);
      this.ui.console.info(`Found ${commits.length} commits since last tag`);

      if (commits.length === 0) {
        this.ui.console.info('No commits found since last tag. Exiting.');
        return null;
      }

      const categorizedCommits = this.categorizeCommits(commits);

      const hasFeat = categorizedCommits.features.length > 0;
      const hasBreaking = commits.some(
        (commit) => commit.includes('BREAKING CHANGE') || commit.includes('!:')
      );

      this.ui.console.info('Commit summary:');
      if (categorizedCommits.features.length > 0) {
        this.ui.console.info(`Features: ${categorizedCommits.features.length}`);
      }

      if (categorizedCommits.fixes.length > 0) {
        this.ui.console.info(`Fixes: ${categorizedCommits.fixes.length}`);
      }

      if (categorizedCommits.docs.length > 0) {
        this.ui.console.info(`Docs: ${categorizedCommits.docs.length}`);
      }

      const nextVersion: VersionType = hasBreaking
        ? 'major'
        : hasFeat
          ? 'minor'
          : 'patch';

      const answer = await this.ui.confirm(
        `About to release a new ${nextVersion} version. Continue?`
      );

      if (this.isDryRun) {
        this.ui.console.info('Dry run enabled. No changes will be made.');
        return null;
      }

      if (answer) {
        execSync(`npm version ${nextVersion} --no-git-tag-version`);
        const currentVersion = this.getCurrentVersion();

        this.ui.console.info(
          `Updated package.json version to ${currentVersion}`
        );

        this.updateChangelog(categorizedCommits, nextVersion);
        this.ui.console.info('Updated CHANGELOG.md');

        try {
          execSync('git add package.json package-lock.json CHANGELOG.md');
          execSync(`git commit -m "chore(release): ${currentVersion}"`);
          execSync(`git tag v${currentVersion}`);
          execSync(`git push`);
          execSync('git push --tags');

          this.ui.console.info(
            `Successfully committed, tagged, and pushed version ${currentVersion}!`
          );

          return currentVersion;
        } catch (error) {
          if (error instanceof Error) {
            this.ui.console.error('Failed to commit changes:', error.message);
          } else {
            this.ui.console.error(
              'Failed to commit changes with unknown error'
            );
          }
          return null;
        }
      } else {
        this.ui.console.info('Release cancelled');
        return null;
      }
    } catch (error) {
      if (error instanceof Error) {
        this.ui.console.error('Error in release process:', error.message);
      } else {
        this.ui.console.error('Unknown error in release process');
      }
      return null;
    }
  }

  /**
   * Get all commits since the last tag
   */
  getCommitsSinceLastTag(version: string): string[] {
    try {
      // Try getting commits since the last tag
      const command = `git log $(git describe --tags --abbrev=0)..HEAD --pretty=format:%s`;
      return execSync(command).toString().split('\n').filter(Boolean);
    } catch (error) {
      this.ui.console.info(
        'No previous tag found or other Git error. Getting all commits.'
      );
      // If there's no tag yet, get all commits
      const command = `git log --pretty=format:%s`;
      return execSync(command).toString().split('\n').filter(Boolean);
    }
  }

  /**
   * Get the current version from the root package.json
   */
  getCurrentVersion(): string {
    return JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
  }

  /**
   * Categorize commits by type
   */
  categorizeCommits(commits: string[]): CommitCategories {
    const categories: CommitCategories = {
      features: [],
      fixes: [],
      docs: [],
      chore: [],
      refactor: [],
      test: [],
      style: [],
      other: [],
    } as const;

    for (const commit of commits) {
      const trimmedCommit = commit.trim();
      if (!trimmedCommit) continue;

      if (
        trimmedCommit.startsWith('feat:') ||
        trimmedCommit.startsWith('feat(')
      ) {
        categories.features.push(trimmedCommit);
      } else if (
        trimmedCommit.startsWith('fix:') ||
        trimmedCommit.startsWith('fix(')
      ) {
        categories.fixes.push(trimmedCommit);
      } else if (
        trimmedCommit.startsWith('docs:') ||
        trimmedCommit.startsWith('docs(')
      ) {
        categories.docs.push(trimmedCommit);
      } else if (
        trimmedCommit.startsWith('chore:') ||
        trimmedCommit.startsWith('chore(')
      ) {
        categories.chore.push(trimmedCommit);
      } else if (
        trimmedCommit.startsWith('refactor:') ||
        trimmedCommit.startsWith('refactor(')
      ) {
        categories.refactor.push(trimmedCommit);
      } else if (
        trimmedCommit.startsWith('test:') ||
        trimmedCommit.startsWith('test(')
      ) {
        categories.test.push(trimmedCommit);
      } else if (
        trimmedCommit.startsWith('style:') ||
        trimmedCommit.startsWith('style(')
      ) {
        categories.style.push(trimmedCommit);
      } else {
        categories.other.push(trimmedCommit);
      }
    }

    return categories;
  }

  /**
   * Update the changelog with the new version and commits
   */
  updateChangelog(
    categorizedCommits: CommitCategories,
    newVersion: string
  ): void {
    const changelogPath = 'CHANGELOG.md';

    let changelog = '# Changelog\n\n';
    if (!this.isDryRun) {
      if (!fs.existsSync(changelogPath)) {
        fs.writeFileSync(changelogPath, changelog);
      }
    }

    if (!this.isDryRun) {
      changelog = fs.readFileSync(changelogPath, 'utf8');
    }
    const date = new Date().toISOString().split('T')[0];

    let newEntries = `## [${newVersion}] - ${date}\n\n`;

    // Add features
    if (categorizedCommits.features.length > 0) {
      newEntries += '### Features\n\n';
      categorizedCommits.features.forEach((commit) => {
        newEntries += `- ${commit.replace(/^feat(\([^)]+\))?:\s*/, '')}\n`;
      });
      newEntries += '\n';
    }

    // Add fixes
    if (categorizedCommits.fixes.length > 0) {
      newEntries += '### Bug Fixes\n\n';
      categorizedCommits.fixes.forEach((commit) => {
        newEntries += `- ${commit.replace(/^fix(\([^)]+\))?:\s*/, '')}\n`;
      });
      newEntries += '\n';
    }

    // Add docs
    if (categorizedCommits.docs.length > 0) {
      newEntries += '### Documentation\n\n';
      categorizedCommits.docs.forEach((commit) => {
        newEntries += `- ${commit.replace(/^docs(\([^)]+\))?:\s*/, '')}\n`;
      });
      newEntries += '\n';
    }

    // Add other changes if there are any
    if (
      categorizedCommits.chore.length +
        categorizedCommits.refactor.length +
        categorizedCommits.test.length +
        categorizedCommits.style.length +
        categorizedCommits.other.length >
      0
    ) {
      newEntries += '### Other Changes\n\n';

      [
        ...categorizedCommits.chore,
        ...categorizedCommits.refactor,
        ...categorizedCommits.test,
        ...categorizedCommits.style,
        ...categorizedCommits.other,
      ].forEach((commit) => {
        // Remove the prefix like chore:, refactor:, etc.
        const cleanCommit = commit.replace(
          /^(chore|refactor|test|style)(\([^)]+\))?:\s*/,
          ''
        );
        newEntries += `- ${cleanCommit}\n`;
      });
      newEntries += '\n';
    }

    // Combine new entries with existing changelog, preserving the title
    const updatedChangelog = changelog.replace(
      '# Changelog\n\n',
      `# Changelog\n\n${newEntries}`
    );

    if (!this.isDryRun) {
      fs.writeFileSync(changelogPath, updatedChangelog);
    } else {
      this.ui.console.info(updatedChangelog);
    }
  }

  /**
   * Check if the GitHub CLI is installed and available
   */
  isGitHubCliAvailable(): boolean {
    try {
      execSync('gh --version', { stdio: 'ignore' });
      return true;
    } catch (error) {
      return false;
    }
  }

  async createGitHubRelease(
    version: string,
    changelogContent: string
  ): Promise<void> {
    try {
      this.ui.console.info('Creating GitHub release…');

      // Extract the changelog section for just this version to use as release notes
      const releaseNotesRegex = new RegExp(
        `## \\[${version}\\][\\s\\S]*?(?=## \\[|$)`,
        'm'
      );
      const match = changelogContent.match(releaseNotesRegex);
      const releaseNotes = match ? match[0].trim() : `Release ${version}`;

      const tempFile = path.join(os.tmpdir(), `release-notes-${version}.md`);
      fs.writeFileSync(tempFile, releaseNotes);

      execSync(
        `gh release create --draft v${version} --title "Release v${version}" --notes-file "${tempFile}"`
      );

      fs.unlinkSync(tempFile);

      this.ui.console.info(
        `GitHub DRAFT release v${version} created successfully!`
      );
    } catch (error) {
      if (error instanceof Error) {
        this.ui.console.error(
          'Failed to create GitHub release:',
          error.message
        );
      } else {
        this.ui.console.error(
          'Failed to create GitHub release with unknown error'
        );
      }
    }
  }
}

ReleaseCommand.description =
  'Creates a new release of the project (internal use only)';
