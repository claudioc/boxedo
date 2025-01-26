import nano from 'nano';
import fs from 'fs/promises';
import path from 'path';
import sanitize from 'sanitize-filename';
import { PageModel, FileModel } from '../types';
import { extractFileRefsFrom } from '../server/lib/helpers';

interface Frontmatter
  extends Omit<
    PageModel,
    '_rev' | 'pageSlugs' | 'contentUpdated' | 'pageContent'
  > {}

class PageExporter {
  private outputDir: string;
  private filesDir: string;
  private couchdb: nano.ServerScope;
  private pagesDb: nano.DocumentScope<PageModel>;
  private filesDb: nano.DocumentScope<FileModel>;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
    this.filesDir = path.join(outputDir, 'files');

    this.couchdb = nano({
      url: process.env.COUCHDB_URL ?? '',
      requestDefaults: {
        auth: {
          username: process.env.COUCHDB_USER ?? '',
          password: process.env.COUCHDB_PASSWORD ?? '',
        },
      },
    });

    this.pagesDb = this.couchdb.use('pages');
    this.filesDb = this.couchdb.use('files');
  }

  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.mkdir(this.filesDir, { recursive: true });
  }

  private createFrontmatter(page: PageModel): string {
    const metadata: Frontmatter = {
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
      const fileDoc = await this.filesDb.get(fileId);
      if (!fileDoc) {
        console.warn(`File metadata not found for ${fileId}`);
        return '';
      }

      // Get the actual attachment
      const attachment = await this.filesDb.attachment.get(
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

      // Write the file
      await fs.writeFile(outputPath, attachment);
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
        // Get file metadata to find the original filename
        const fileDoc = await this.filesDb.get(fileId);
        if (!fileDoc) continue;

        // Export the file and get its new local path
        const localPath = await this.exportFile(fileId, fileDoc.originalName);
        if (!localPath) continue;

        // Replace all occurrences of the CouchDB URL pattern with the local path
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

    return `${frontmatter}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="generator" content="Joongle Page Exporter">
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

      // Fetch all pages in bulk
      const response = await this.pagesDb.list({ include_docs: true });
      const regularDocs = response.rows.filter(
        (row) => !row.id.startsWith('_design/')
      );

      console.log(
        `Found ${regularDocs.length} pages to export (excluding design documents).`
      );

      // Process each page
      const exports = regularDocs.map(async (row) => {
        const page = row.doc;
        if (!page) return;

        const htmlContent = await this.createHtmlDocument(page);
        const outputPath = path.join(
          this.outputDir,
          this.getOutputFilename(page)
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
  const exporter = new PageExporter('./exportedPages');

  try {
    await exporter.exportPages();
  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  }
}

main();
