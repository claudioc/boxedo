import { PageModel, NavItem, PageHistoryModel } from '~/types';
import { Feedbacks } from '~/lib/feedbacks';
import { ErrorWithFeedback } from '~/lib/errors';
import slugify from 'slugify';
import { FastifyMongoObject } from '@fastify/mongodb';
import { slugUrl } from '~/lib/helpers';
import { UpdateFilter } from 'mongodb';
import sanitize from 'mongo-sanitize';
import sanitizeHtml from 'sanitize-html';

// https://github.com/apostrophecms/sanitize-html
const safeHtml = (str: string) =>
  sanitizeHtml(str, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
  });

const PageWithoutContentProjection = {
  projection: {
    pageId: 1,
    pageTitle: 1,
    pageSlug: 1,
    parentPageId: 1,
    createdAt: 1,
    updatedAt: 1,
  },
} as const;

export function dbService(mongo?: FastifyMongoObject) {
  if (!mongo || !mongo.db) throw new ErrorWithFeedback(Feedbacks.E_MISSING_DB);
  const db = mongo.db;

  const pagesCollection = db.collection<PageModel>('pages');
  if (!pagesCollection)
    throw new ErrorWithFeedback(Feedbacks.E_MISSING_PAGES_COLLECTION);

  const pageHistoryCollection = db.collection<PageHistoryModel>('pageHistory');
  if (!pageHistoryCollection)
    throw new ErrorWithFeedback(Feedbacks.E_MISSING_PAGES_HISTORY_COLLECTION);

  return {
    getPageById(pageId: string) {
      return pagesCollection.findOne<PageModel>({ pageId });
    },

    getPageBySlug(slug: string) {
      return pagesCollection.findOne({ pageSlug: slug });
    },

    lookupPageBySlug(slug: string) {
      // Check if the slug is in the pageSlugs of any document
      // and in case, return the document
      return pagesCollection.findOne({
        pageSlugs: { $in: [slug] },
      });
    },

    async generateUniqueSlug(title: string) {
      let slug = slugify(title, { lower: true });
      let uniqueSlugFound = false;
      let counter = 1;

      while (!uniqueSlugFound) {
        const existingPageWithSlug = await pagesCollection.findOne({
          pageSlug: slug,
        });
        if (existingPageWithSlug) {
          slug = `${slugify(title, { lower: true })}-${counter}`;
          counter++;
        } else {
          uniqueSlugFound = true;
        }
      }

      return slug;
    },

    async insertPage(page: PageModel) {
      page.pageContent = safeHtml(page.pageContent);
      page.pageTitle = safeHtml(page.pageTitle);

      const session = await mongo.client.startSession();
      try {
        await session.withTransaction(async () => {
          await pagesCollection.insertOne(page, { session });
          // Insert the first page in the history collection
          await pageHistoryCollection.insertOne(
            {
              pageId: page.pageId,
              history: [],
            },
            { session }
          );
        });
      } catch (error) {
        throw new ErrorWithFeedback(Feedbacks.E_CREATING_PAGE);
      } finally {
        await session.endSession();
      }
    },

    search(q: string) {
      const query = sanitize(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      return pagesCollection
        .find({ pageTitle: { $regex: query, $options: 'i' } })
        .limit(25)
        .toArray();
    },

    searchText(q: string) {
      return pagesCollection
        .find({ $text: { $search: sanitize(q) } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(25)
        .toArray();
    },

    async buildMenuTree(parentId: string): Promise<NavItem[]> {
      const pages = await pagesCollection
        .find({ parentPageId: parentId }, PageWithoutContentProjection)
        .toArray();

      const menuTree = [];
      for (const page of pages) {
        const menuItem: NavItem = {
          pageId: page.pageId,
          title: page.pageTitle,
          link: slugUrl(page.pageSlug),
          children: await this.buildMenuTree(page.pageId),
        };

        menuTree.push(menuItem);
      }

      return menuTree;
    },

    async updatePage(page: PageModel, newPage: Partial<PageModel>) {
      const session = await mongo.client.startSession();

      const options: UpdateFilter<PageModel> = {
        $set: {
          pageTitle: safeHtml(newPage.pageTitle!),
          pageContent: safeHtml(newPage.pageContent!),
          updatedAt: newPage.updatedAt,
          pageSlug: newPage.pageSlug,
        },
      };

      if (page.pageSlug !== newPage.pageSlug) {
        options.$push = { pageSlugs: page.pageSlug };
        options.$set = { ...options.$set, pageSlug: newPage.pageSlug };
      }

      try {
        await session.withTransaction(async () => {
          await pagesCollection.updateOne({ _id: page!._id }, options);
          await pageHistoryCollection.updateOne(
            { pageId: page.pageId },
            {
              $push: {
                history: {
                  pageTitle: page.pageTitle,
                  pageContent: page.pageContent,
                  updateAt: page.updatedAt,
                  timestamp: new Date(),
                },
              },
            },
            { session }
          );
        });
      } catch (error) {
        throw new ErrorWithFeedback(Feedbacks.E_UPDATING_PAGE);
      } finally {
        await session.endSession();
      }
    },

    async updatePageParent(page: PageModel, newParentId: string) {
      try {
        await pagesCollection.updateOne(
          { _id: page._id },
          { $set: { parentPageId: newParentId } }
        );
      } catch (error) {
        throw new ErrorWithFeedback(Feedbacks.E_UPDATING_PAGE);
      }
    },

    async deletePage(page: PageModel) {
      const session = await mongo.client.startSession();
      try {
        await session.withTransaction(async () => {
          await pagesCollection.deleteOne({ _id: page._id }, { session });
          await pagesCollection.updateMany(
            { parentPageId: page.pageId },
            { $set: { parentPageId: page.parentPageId } }
          );
          await pageHistoryCollection.deleteOne(
            { pageId: page.pageId },
            { session }
          );
        });
      } catch (error) {
        throw new ErrorWithFeedback(Feedbacks.E_DELETING_PAGE);
      } finally {
        await session.endSession();
      }
    },

    // This is run only once, as soon as the user creates the home page
    createTextIndex() {
      return pagesCollection.createIndex(
        { pageTitle: 'text', pageContent: 'text' },
        { weights: { pageTitle: 10, pageContent: 1 }, name: 'PagesTextIndex' }
      );
    },

    async getPageHistory(pageId: string) {
      return (
        (await pageHistoryCollection
          .findOne({ pageId })
          .then((result) => result?.history)) || []
      );
    },

    async getPageHistoryItem(pageId: string, version: number) {
      const item = await pageHistoryCollection.findOne(
        { pageId },
        { projection: { history: { $slice: [version - 1, 1] } } }
      );

      return item?.history[0];
    },
  };
}
