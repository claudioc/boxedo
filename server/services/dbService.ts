import { PageModel, NavItem } from '~/types';
import { Feedbacks } from '~/lib/feedbacks';
import { ErrorWithFeedback } from '~/lib/errors';
import slugify from 'slugify';
import { FastifyMongoObject } from '@fastify/mongodb';
import { slugUrl } from '~/lib/helpers';
import { UpdateFilter } from 'mongodb';

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
      const session = await mongo.client.startSession();
      try {
        await session.withTransaction(async () => {
          await pagesCollection.insertOne(page, { session });
        });
      } catch (error) {
        throw new ErrorWithFeedback(Feedbacks.E_CREATING_PAGE);
      } finally {
        await session.endSession();
      }
    },

    search(q: string) {
      return pagesCollection
        .find({ pageTitle: { $regex: q, $options: 'i' } })
        .limit(25)
        .toArray();
    },

    searchText(q: string) {
      return pagesCollection
        .find({ $text: { $search: q } })
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
      const options: UpdateFilter<PageModel> = {
        $set: {
          pageTitle: newPage.pageTitle,
          pageContent: newPage.pageContent,
          updatedAt: newPage.updatedAt,
          pageSlug: newPage.pageSlug,
        },
      };

      if (page.pageSlug !== newPage.pageSlug) {
        options.$push = { pageSlugs: page.pageSlug };
        options.$set = { ...options.$set, pageSlug: newPage.pageSlug };
      }

      try {
        await pagesCollection.updateOne({ _id: page!._id }, options);
      } catch (error) {
        throw new ErrorWithFeedback(Feedbacks.E_UPDATING_PAGE);
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
        });
      } catch (error) {
        throw new ErrorWithFeedback(Feedbacks.E_DELETING_PAGE);
      } finally {
        await session.endSession();
      }
    },

    createTextIndex() {
      return pagesCollection.createIndex(
        { pageTitle: 'text', pageContent: 'text' },
        { weights: { pageTitle: 10, pageContent: 1 }, name: 'PagesTextIndex' }
      );
    },
  };
}
