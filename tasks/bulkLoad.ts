import { load } from 'cheerio';
import fs from 'fs';
import slugify from 'slugify';
import { AppContext } from '../server/lib/AppContext';
import { generateIdFor, loadConfig } from '../server/lib/helpers';
import { PageModel } from '../types';

type ExistingPage = {
  _id: string;
  pageSlug: string;
};

class BulkLoader {
  private pages: PageModel[] = [];
  private existingPages: ExistingPage[] = [];

  constructor(private readonly context: AppContext) {}

  static async create(): Promise<BulkLoader> {
    const config = loadConfig();

    const context = (
      await AppContext.create({
        config,
        logger: console,
      })
    ).match(
      (context) => context,
      (error) => {
        console.log(error);
        process.exit(1);
      }
    );

    return new BulkLoader(context);
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

    const parents = new Map<string | null, number>();
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
      let position = 10000;
      if (this.existingPages.length > 0) {
        const randomIndex = Math.floor(
          Math.random() * this.existingPages.length
        );

        // Tries to create many roots
        if (Math.random() > 0.5) {
          parentId = null;
        } else {
          parentId = this.existingPages[randomIndex]._id;
        }

        parents.set(parentId, (parents.get(parentId) ?? 9999) + 1);
        position = parents.get(parentId)!;

        slug = this.generateUniqueSlug(pageTitle);
      } else {
        // The very first page is a root
        parents.set(parentId, position);
      }

      if (parentId === null) {
        console.log(`Creating root page with position ${position}`);
      }

      const now = new Date().toISOString();
      const pageId: string = generateIdFor('page');
      this.pages.push({
        type: 'page',
        _id: pageId,
        pageTitle,
        pageContent,
        parentId,
        pageSlug: slug,
        pageSlugs: [],
        createdAt: now,
        updatedAt: now,
        position,
        contentUpdated: true,
        author: 'Bulk loader',
      });

      this.existingPages.push({ _id: pageId, pageSlug: slug });
    }

    const db = this.context.getDatabaseService().getDatabase();
    await db.bulkDocs(this.pages);
    await db.close();

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
