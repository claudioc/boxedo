import nano from 'nano';
import fs from 'fs/promises';
import path from 'path';
import sanitize from 'sanitize-filename';
import { PageModel } from '../types';

interface Frontmatter
  extends Omit<
    PageModel,
    '_rev' | 'pageSlugs' | 'contentUpdated' | 'pageContent'
  > {}

class PageExporter {
  private outputDir: string;
  private couchdb: nano.ServerScope;
  private db: nano.DocumentScope<PageModel>;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
    this.couchdb = nano({
      url: process.env.COUCHDB_URL ?? '',
      requestDefaults: {
        auth: {
          username: process.env.DB_USER ?? '',
          password: process.env.DB_PASSWORD ?? '',
        },
      },
    });

    this.db = this.couchdb.use('pages');
  }

  private createFrontmatter(page: PageModel): string {
    // Create a metadata object with all relevant fields
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

  private createHtmlDocument(page: PageModel): string {
    const frontmatter = this.createFrontmatter(page);

    return `${frontmatter}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="generator" content="CouchDB Page Exporter">
    <meta name="created" content="${page.createdAt}">
    <meta name="modified" content="${page.updatedAt}">
    <title>${page.pageTitle}</title>
</head>
<body>
  ${page.pageContent}
</body>
</html>`;
  }

  private getOutputFilename(page: PageModel): string {
    // Combine slug and ID for unique filename
    const filename = `${page.pageSlug}-${page._id.replace('page:', '')}.html`;
    return sanitize(filename);
  }

  async exportPages(): Promise<void> {
    try {
      // Create output directory if it doesn't exist
      await fs.mkdir(this.outputDir, { recursive: true });

      // Fetch all pages in bulk
      // Using include_docs: true to get full documents in one request
      const response = await this.db.list({ include_docs: true });

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

        const htmlContent = this.createHtmlDocument(page);
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
