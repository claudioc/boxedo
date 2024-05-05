import { PageModel } from '../../server/types';
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import cheerio from 'cheerio';
import fs from 'fs';

const INDEX_PAGE_ID = '__index__';

process.exit(0);

function getRandomElement<T>(arr: T[]): T {
  const index = Math.floor(Math.random() * arr.length);
  return arr[index];
}

async function generatePages(numPages: number): Promise<MongoClient> {
  const client = await MongoClient.connect('mongodb://localhost:27017/joongle');
  const pagesCollection = client.db('joongle').collection<PageModel>('pages');

  const pages: PageModel[] = [];
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

    let parentPageId: string | null = null;
    let pageId = INDEX_PAGE_ID;
    let slug = 'home';
    if (existingPages.length > 0) {
      const randomIndex = Math.floor(Math.random() * existingPages.length);
      parentPageId = existingPages[randomIndex];
      pageId = uuidv4();
      slug = pageTitle.toLowerCase().replace(/\s/g, '-');
    } else {
      await pagesCollection.createIndex(
        { pageTitle: 'text', pageContent: 'text' },
        { weights: { pageTitle: 10, pageContent: 1 }, name: 'PagesTextIndex' }
      );
    }

    pages.push({
      pageTitle,
      pageContent,
      pageId,
      parentPageId,
      pageSlug: slug,
      pageSlugs: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    existingPages.push(pageId);
  }

  await pagesCollection.insertMany(pages);

  return client;
}

generatePages(100).then((client) => {
  console.log('Pages generated successfully');
  client.close();
});
