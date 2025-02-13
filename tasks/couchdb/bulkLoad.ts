import { PageModel } from '../../server/types';
import { load } from 'cheerio';
import fs from 'fs';
import { createId } from '@paralleldrive/cuid2';
import slugify from 'slugify';

type ExistingPage = {
  _id: string;
  pageSlug: string;
};

const pages: PageModel[] = [];
const existingPages: ExistingPage[] = [];

function getRandomElement<T>(arr: T[]): T {
  const index = Math.floor(Math.random() * arr.length);
  return arr[index];
}

const generateUniqueSlug = (title: string) => {
  let slug = slugify(title.trim(), { lower: true });
  let uniqueSlugFound = false;
  let counter = 1;

  while (!uniqueSlugFound) {
    const slugAlreadyInUse = existingPages.find(
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

async function generatePages(numPages: number): Promise<nano.ServerScope> {
  const client = nano({
    url: process.env.DB_REMOTE_URL || '',
    requestDefaults: {
      auth: {
        username: process.env.DB_REMOTE_USER || '',
        password: process.env.DB_REMOTE_PASSWORD || '',
      },
    },
  });

  try {
    await client.db.get('pages');
  } catch (error) {
    console.log('Creating pages database');
    await client.db.create('pages');
  }

  const pagesDb: DocumentScope<PageModel> = client.db.use('pages');

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
    const randomH2 = getRandomElement(h2sWithChap);
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
          $(getRandomElement(pElements)).text().trim().replaceAll('\n', '') +
          '</p>'
      )
      .join('');

    let parentId: string | null = null;
    let slug = 'home';
    if (existingPages.length > 0) {
      const randomIndex = Math.floor(Math.random() * existingPages.length);
      parentId = existingPages[randomIndex]._id;
      slug = generateUniqueSlug(pageTitle);
    }

    const pageId: string = `page:${createId()}`;
    pages.push({
      _id: pageId,
      pageTitle,
      pageContent,
      parentId,
      pageSlug: slug,
      pageSlugs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    existingPages.push({ _id: pageId, pageSlug: slug });
  }

  const response: DocumentBulkResponse[] = await pagesDb.bulk({
    docs: pages,
  });

  return client;
}

generatePages(100).then((client) => {
  console.log('Pages generated successfully');
});
