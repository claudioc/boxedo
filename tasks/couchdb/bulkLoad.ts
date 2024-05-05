import { PageModel, PageModelWithoutId } from '../../server/types';
import nano, { DocumentScope, DocumentBulkResponse } from 'nano';
import cheerio from 'cheerio';
import fs from 'fs';

function getRandomElement<T>(arr: T[]): T {
  const index = Math.floor(Math.random() * arr.length);
  return arr[index];
}

async function generatePages(numPages: number): Promise<nano.ServerScope> {
  const client = nano({
    url: process.env.COUCHDB_URL || '',
    requestDefaults: {
      auth: {
        username: process.env.DB_USER || '',
        password: process.env.DB_PASSWORD || '',
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

  const pages: PageModelWithoutId[] = [];
  const existingPages: string[] = []; // Keep track of created page IDs

  const html = fs.readFileSync('data/roman-empire.html', 'utf-8');
  const $ = cheerio.load(html);
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
    const randomIndex = Math.floor(Math.random() * existingPages.length);
    parentId = existingPages[randomIndex];
    slug = pageTitle.toLowerCase().replace(/\s/g, '-');

    pages.push({
      pageTitle,
      pageContent,
      parentId,
      pageSlug: slug,
      pageSlugs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    existingPages.push(pageId);
  }

  const response: DocumentBulkResponse[] = await pagesDb.bulk({
    docs: pages,
  });

  return client;
}

generatePages(100).then((client) => {
  console.log('Pages generated successfully');
});
