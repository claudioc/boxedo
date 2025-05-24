import { generateIdFor, type PageModel } from 'boxedo-core';
import type { AppContext } from 'boxedo-server/lib/AppContext';
import { load } from 'cheerio';
import fs from 'node:fs';
import slugify from 'slugify';
import { Command } from '../lib/Command';
import { getAppContext } from '../lib/getAppContext';

export default class BulkLoadCommand extends Command {
  async run() {
    const spinner = this.ui.spinner('Initializing…');

    this.context = await getAppContext(this.ui.createConsole(spinner));
    if (!this.context) {
      return;
    }

    const repo = await this.context.getRepositoryFactory().getPageRepository();

    spinner.stop();

    const pageCount = await repo.countPages();
    if (pageCount.isErr()) {
      this.ui.console.error(pageCount.error.message);
      return;
    }

    if (
      pageCount.value > 0 &&
      !(await this.ui.confirm(
        `There already ${pageCount.value} pages in the database. Continue anyway?`
      ))
    ) {
      return;
    }

    const answers = {
      howMany: await this.ui.prompt(
        'How many docs you want to bulk load (max 1000)?',
        {
          required: true,
          validate: (val) =>
            /\d+/.test(val) && Number(val) > 0 && Number(val) <= 1000,
        }
      ),
    };

    spinner.start('Generating…');
    const bulkLoader = new BulkLoader(this.context);

    await bulkLoader.generatePages(Number(answers.howMany));
    spinner.stop('Success!');
  }
}

BulkLoadCommand.description =
  'Loads several documents out of a demo data for testing purposes';

type ExistingPage = {
  _id: string;
  pageSlug: string;
};

class BulkLoader {
  private pages: PageModel[] = [];
  private existingPages: ExistingPage[] = [];

  constructor(private readonly context: AppContext) {}

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
            // biome-ignore lint:
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
        // biome-ignore lint:
        position = parents.get(parentId)!;

        slug = this.generateUniqueSlug(pageTitle);
      } else {
        // The very first page is a root
        parents.set(parentId, position);
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
        updatedBy: 'Bulk loader',
      });

      this.existingPages.push({ _id: pageId, pageSlug: slug });
    }

    const db = this.context.getDatabaseService().getDatabase();
    await db.bulkDocs(this.pages);
    await db.close();

    return;
  }
}
