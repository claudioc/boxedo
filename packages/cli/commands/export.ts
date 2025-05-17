import { AnyLogger, PageModel, SettingsModel } from 'boxedo-core/types';
import fs from 'fs/promises';
import path from 'path';
import sanitize from 'sanitize-filename';
import { AppContext } from '~/lib/AppContext';
import { ensurePathExists, extractFileRefsFrom } from '~/lib/helpers';
import { FileRepository } from '~/repositories/FileRepository';
import { RepositoryFactory } from '~/repositories/RepositoryFactory';
import { SettingsRepository } from '~/repositories/SettingsRepository';
import { Command } from '../lib/Command';
import { getAppContext } from '../lib/getAppContext';

export default class ExportCommand extends Command {
  async run() {
    const spinner = this.ui.spinner('Initializing…');

    this.context = await getAppContext(this.ui.createConsole(spinner));
    if (!this.context) {
      return;
    }

    const repoFactory = await this.context.getRepositoryFactory();

    const pageCount = await repoFactory.getPageRepository().countPages();
    if (pageCount.isErr()) {
      this.ui.console.error(pageCount.error.message);
      return;
    }

    const exporter = new PageExporter(
      this.context,
      repoFactory,
      './exported-pages'
    );

    spinner.stop();

    if (
      !(await this.ui.confirm(
        `About to export ${pageCount.value} pages in ./exported-pages. Continue?`
      ))
    ) {
      return;
    }

    spinner.start('Exporting…');

    try {
      await exporter.exportPages();
    } catch (error) {
      this.ui.console.error('Export failed:', error);
      process.exit(1);
    }

    spinner.success('Success!');
  }
}

ExportCommand.description = 'Export all the pages and images as HTML files';

interface Frontmatter
  extends Omit<
    PageModel,
    '_rev' | 'pageSlugs' | 'contentUpdated' | 'pageContent'
  > {}

class PageExporter {
  private filesDir: string;
  private fileRepo!: FileRepository;
  private settingsRepo!: SettingsRepository;
  private settings!: SettingsModel;
  private logger!: AnyLogger;

  constructor(
    private context: AppContext,
    private repoFactory: RepositoryFactory,
    private outputDir: string
  ) {
    this.filesDir = path.join(outputDir, 'files');
    this.fileRepo = this.repoFactory.getFileRepository();
    this.settingsRepo = this.repoFactory.getSettingsRepository();
    this.logger = this.context.getLogger();
  }

  private async ensureDirectories(): Promise<void> {
    await ensurePathExists(this.outputDir, 'export document directory');
    await ensurePathExists(this.filesDir, 'export files directory');
  }

  private createFrontmatter(page: PageModel): string {
    const metadata: Frontmatter = {
      type: 'page',
      _id: page._id,
      parentId: page.parentId,
      pageTitle: page.pageTitle,
      pageSlug: page.pageSlug,
      position: page.position,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
      author: page.author,
    };

    return `<!--
${JSON.stringify(metadata, null, 2)}
-->`;
  }

  private getOutputFilename(page: PageModel): string {
    const filename = `${page.pageSlug}-${page._id.replace('page:', '')}.html`;
    return sanitize(filename);
  }

  private async exportFile(
    fileId: string,
    originalFilename: string
  ): Promise<string> {
    const fileDoc = await this.fileRepo.getFileById(fileId);
    if (fileDoc.isErr()) {
      this.logger.warn(`File metadata not found for ${fileId}`);
      this.logger.error(fileDoc.error.message);
      return '';
    }

    // Get the actual attachment
    const attachment = await this.fileRepo.getFileAttachment(
      fileId,
      originalFilename
    );

    if (attachment.isErr()) {
      this.logger.warn(
        `File attachment not found for ${fileId}/${originalFilename}`
      );
      this.logger.error(attachment.error.message);
      return '';
    }

    if (attachment.value === null) {
      return '';
    }

    // Create a sanitized filename that includes the file ID to ensure uniqueness
    const sanitizedFilename = sanitize(`${fileId}-${originalFilename}`);
    const outputPath = path.join(this.filesDir, sanitizedFilename);

    // Convert Blob/Buffer to Buffer if needed
    const buffer =
      attachment.value instanceof Buffer
        ? attachment.value
        : Buffer.from(await (attachment.value as Blob).arrayBuffer());

    try {
      await fs.writeFile(outputPath, buffer);
      this.logger.info(`Exported file: ${outputPath}`);
    } catch (error) {
      this.logger.error(
        `Failed to export file ${fileId}/${originalFilename}:`,
        error
      );
      return '';
    }
    // Return the relative path from HTML files to the exported file
    return path.join('files', sanitizedFilename);
  }

  private async processPageContent(content: string): Promise<string> {
    // Get all file references from the content
    const fileRefs = extractFileRefsFrom(content);

    let processedContent = content;

    // Process each file reference
    for (const fileId of fileRefs) {
      try {
        const fileDoc = await this.fileRepo.getFileById(fileId);
        if (fileDoc.isErr() || !fileDoc.value) {
          continue;
        }

        // Export the file and get its new local path
        const localPath = await this.exportFile(
          fileId,
          fileDoc.value.originalName
        );
        if (!localPath) continue;

        // Replace all occurrences of the server URL pattern with the local path
        const urlPattern = new RegExp(`/uploads/${fileId}/[^"'\\s]+`, 'g');
        processedContent = processedContent.replace(urlPattern, localPath);
      } catch (error) {
        this.logger.error(`Error processing file ${fileId}: ${error}`);
      }
    }

    return processedContent;
  }

  private async createHtmlDocument(page: PageModel): Promise<string> {
    const frontmatter = this.createFrontmatter(page);
    const processedContent = await this.processPageContent(page.pageContent);

    return `${frontmatter}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="generator" content="${this.settings.siteTitle}">
    <meta name="created" content="${page.createdAt}">
    <meta name="modified" content="${page.updatedAt}">
    <title>${page.pageTitle}</title>
</head>
<body>
  ${processedContent}
</body>
</html>`;
  }

  async exportPages(): Promise<boolean> {
    const settings = await this.settingsRepo.getSettings();
    if (settings.isErr()) {
      this.logger.error('Cannot read Boxedo`s settings');
      return false;
    }

    this.settings = settings.value;

    try {
      await this.ensureDirectories();

      const response = await this.repoFactory.getDb().find({
        selector: {
          type: 'page',
          _id: {
            $regex: '^page:', // Only get documents that start with page:
          },
        },
        // No need to use include_docs with find() as it always includes full docs
      });

      const pages = response.docs;
      this.logger.info(`Found ${pages.length} pages to export.`);

      const exports = pages.map(async (page) => {
        if (!page) return;

        const htmlContent = await this.createHtmlDocument(page as PageModel);
        const outputPath = path.join(
          this.outputDir,
          this.getOutputFilename(page as PageModel)
        );

        await fs.writeFile(outputPath, htmlContent, 'utf8');
        this.logger.info(`Exported: ${outputPath}`);
      });

      await Promise.all(exports);

      this.logger.info('Export completed successfully!');
      return true;
    } catch (error) {
      this.logger.error(`Export failed: ${error}`);
      return false;
    }
  }
}
