import { load } from 'cheerio';
import fs from 'fs';
import slugify from 'slugify';
import { loadConfig } from '../server/lib/helpers';
import { DbService, dbService } from '../server/services/dbService';
import { PageModel } from '../types';

type ExistingPage = {
  _id: string;
  pageSlug: string;
};

class BulkLoader {
  private dbs: DbService;
  private pages: PageModel[] = [];
  private existingPages: ExistingPage[] = [];

  constructor(dbs: DbService) {
    this.dbs = dbs;
  }

  static async create(): Promise<BulkLoader> {
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

    return new BulkLoader(dbService(dbClient));
  }

  getRandomElement<T>(arr: T[]): T {
    const index = Math.floor(Math.random() * arr.length);
    return arr[index];
  }

  generateUniqueSlug = (title: string) => {
    let slug = slugify(title.trim(), { lower: true });
    let uniqueSlugFound = false;
    let counter = 1;

    while (!uniqueSlugFound) {
      const slugAlreadyInUse = this.existingPages.find(
        (page) => page.pageSlug === slug
      );

      if (slugAlreadyInUse) {
        slug = `${slugify(title.trim(), { lower: true })}-${counter++}`;
      } else {
        uniqueSlugFound = true;
      }
    }

    return slug;
  };

  async generatePages(numPages: number): Promise<void> {
    const html = fs.readFileSync('data/roman-empire.html', 'utf-8');
    const $ = load(html);
    const pElements = $('p:not(.foot)')
      .filter(function () {
        return $(this).text().length > 100;
      })
      .toArray();

    const h2sWithChap = $('h2')
      .filter(function () {
        return $(this).find('a[id^="chap"]').length > 0;
      })
      .toArray();

    for (let i = 0; i < numPages; i++) {
      const randomH2 = this.getRandomElement(h2sWithChap);
      const pageTitle = $(randomH2)
        .text()
        .replaceAll('.', '')
        .trim()
        .replaceAll('\n', '')
        .replace(/Chapter .*:\s/, '')
        .replace(/—Part .*$/g, ' ');

      const pageContent = Array.from({
        length: Math.floor(Math.random() * 18) + 8,
      })
        .map(
          () =>
            '<p>' +
            $(this.getRandomElement(pElements))
              .text()
              .trim()
              .replaceAll('\n', '') +
            '</p>'
        )
        .join('');

      let parentId: string | null = null;
      let slug = 'home';
      if (this.existingPages.length > 0) {
        const randomIndex = Math.floor(
          Math.random() * this.existingPages.length
        );
        parentId = this.existingPages[randomIndex]._id;
        slug = this.generateUniqueSlug(pageTitle);
      }

      const pageId: string = dbService.generateIdFor('page');
      this.pages.push({
        type: 'page',
        _id: pageId,
        pageTitle,
        pageContent,
        parentId,
        pageSlug: slug,
        pageSlugs: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        position: 10000,
        contentUpdated: true,
      });

      this.existingPages.push({ _id: pageId, pageSlug: slug });
    }

    await this.dbs.db.bulkDocs(this.pages);

    await loader.dbs.db.close();

    return;
  }
}

const args = process.argv.slice(2);
let howMany = 100; // Default value

if (args.length > 0) {
  const parsedCount = parseInt(args[0], 10);

  // Validate that the parameter is a number
  if (isNaN(parsedCount)) {
    console.error('Error: Parameter must be a number');
    console.log('Usage: node bulkLoad.js [count]');
    process.exit(1);
  }

  howMany = parsedCount;
}

const loader = await BulkLoader.create();
await loader.generatePages(howMany);

console.log(`Pages generated successfully ${howMany}`);
