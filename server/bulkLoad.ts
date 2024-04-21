import { faker } from '@faker-js/faker';
import { PageModel } from './types';
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
const INDEX_PAGE_ID = '__index__';

async function generatePages(numPages: number): Promise<any> {
  const client = await MongoClient.connect('mongodb://localhost:27017/joongle');
  const pagesCollection = client.db('joongle').collection<PageModel>('pages');

  const pages: PageModel[] = [];
  const existingPages: string[] = []; // Keep track of created page IDs

  for (let i = 0; i < numPages; i++) {
    const pageTitle = faker.lorem.sentence(4);
    const pageContent = faker.lorem.paragraphs(
      Math.floor(Math.random() * 15) + 1
    );

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

generatePages(1000).then((client) => {
  console.log('Pages generated successfully');
  client.close();
});
