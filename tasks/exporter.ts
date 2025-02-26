import fs from 'fs/promises';
import path from 'path';
import sanitize from 'sanitize-filename';
import { extractFileRefsFrom, loadConfig } from '../server/lib/helpers';
import { DbService, dbService } from '../server/services/dbService';
import { FileModel, PageModel } from '../types';

interface Frontmatter
  extends Omit<
    PageModel,
    '_rev' | 'pageSlugs' | 'contentUpdated' | 'pageContent'
  > {}

class PageExporter {
  private outputDir: string;
  private filesDir: string;
  private dbs: DbService;

  constructor(outputDir: string, dbs: DbService) {
    this.outputDir = outputDir;
    this.filesDir = path.join(outputDir, 'files');
    this.dbs = dbs;
  }

  static async create(outputDir: string): Promise<PageExporter> {
    const config = loadConfig();
    const dbClient = await dbService.init({
      logger: console,
      backend: config.DB_BACKEND,
      dbName: config.DB_NAME,
      localPath: config.DB_LOCAL_PATH,
      serverUrl: config.DB_REMOTE_URL,
      username: config.DB_REMOTE_USER,
      password: config.DB_REMOTE_PASSWORD,
      env: config.NODE_ENV,
    });

    return new PageExporter(outputDir, dbService(dbClient));
  }

  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.mkdir(this.filesDir, { recursive: true });
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
    try {
      // Get file metadata
      const fileDoc = await this.dbs.db.get<FileModel>(fileId);
      if (!fileDoc) {
        console.warn(`File metadata not found for ${fileId}`);
        return '';
      }

      // Get the actual attachment
      const attachment = await this.dbs.db.getAttachment(
        fileId,
        originalFilename
      );
      if (!attachment) {
        console.warn(
          `File attachment not found for ${fileId}/${originalFilename}`
        );
        return '';
      }

      // Create a sanitized filename that includes the file ID to ensure uniqueness
      const sanitizedFilename = sanitize(`${fileId}-${originalFilename}`);
      const outputPath = path.join(this.filesDir, sanitizedFilename);

      // Convert Blob/Buffer to Buffer if needed
      const buffer =
        attachment instanceof Buffer
          ? attachment
          : Buffer.from(await (attachment as Blob).arrayBuffer());

      // Write the file
      await fs.writeFile(outputPath, buffer);
      console.log(`Exported file: ${outputPath}`);

      // Return the relative path from HTML files to the exported file
      return path.join('files', sanitizedFilename);
    } catch (error) {
      console.error(
        `Failed to export file ${fileId}/${originalFilename}:`,
        error
      );
      return '';
    }
  }

  private async processPageContent(content: string): Promise<string> {
    // Get all file references from the content
    const fileRefs = extractFileRefsFrom(content);

    let processedContent = content;

    // Process each file reference
    for (const fileId of fileRefs) {
      try {
        // Get file metadata from the document
        const fileDoc = await this.dbs.db.get<FileModel>(fileId);
        if (!fileDoc) continue;

        // Export the file and get its new local path
        const localPath = await this.exportFile(fileId, fileDoc.originalName);
        if (!localPath) continue;

        // Replace all occurrences of the server URL pattern with the local path
        const urlPattern = new RegExp(`/uploads/${fileId}/[^"'\\s]+`, 'g');
        processedContent = processedContent.replace(urlPattern, localPath);
      } catch (error) {
        console.error(`Error processing file ${fileId}:`, error);
      }
    }

    return processedContent;
  }

  private async createHtmlDocument(page: PageModel): Promise<string> {
    const frontmatter = this.createFrontmatter(page);
    const processedContent = await this.processPageContent(page.pageContent);
    const settingsResult = await this.dbs.getSettings();
    const settings = settingsResult.match(
      (settings) => settings,
      () => ({})
    );

    return `${frontmatter}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="generator" content="${settings.siteTitle}">
    <meta name="created" content="${page.createdAt}">
    <meta name="modified" content="${page.updatedAt}">
    <title>${page.pageTitle}</title>
</head>
<body>
  ${processedContent}
</body>
</html>`;
  }

  async exportPages(): Promise<void> {
    try {
      // Ensure output directories exist
      await this.ensureDirectories();

      // Fetch all pages using find() instead of list()
      const response = await this.dbs.db.find({
        selector: {
          type: 'page',
          _id: {
            $regex: '^page:', // Only get documents that start with page:
          },
        },
        // No need to use include_docs with find() as it always includes full docs
      });

      const pages = response.docs;
      console.log(`Found ${pages.length} pages to export.`);

      // Process each page
      const exports = pages.map(async (page) => {
        if (!page) return;

        const htmlContent = await this.createHtmlDocument(page as PageModel);
        const outputPath = path.join(
          this.outputDir,
          this.getOutputFilename(page as PageModel)
        );

        await fs.writeFile(outputPath, htmlContent, 'utf8');
        console.log(`Exported: ${outputPath}`);
      });

      // Wait for all exports to complete
      await Promise.all(exports);

      console.log('Export completed successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }
}

// Usage example
async function main() {
  const exporter = await PageExporter.create('./exportedPages');

  try {
    await exporter.exportPages();
  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  }
}

main();
