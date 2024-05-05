import { PageModel, PageSelector, NavItem, PageModelWithoutId } from '~/types';
import { Feedbacks } from '~/lib/feedbacks';
import { ErrorWithFeedback } from '~/lib/errors';
import slugify from 'slugify';
import nano, { DocumentScope } from 'nano';
import { slugUrl } from '~/lib/helpers';
import sanitizeHtml from 'sanitize-html';

// https://github.com/apostrophecms/sanitize-html
const safeHtml = (str: string) =>
  sanitizeHtml(str, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
  });

const safeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function dbService(client?: nano.ServerScope) {
  if (!client) throw new ErrorWithFeedback(Feedbacks.E_MISSING_DB);

  const pagesDb: DocumentScope<PageModel> = client.db.use('pages');
  if (!pagesDb)
    throw new ErrorWithFeedback(Feedbacks.E_MISSING_PAGES_COLLECTION);

  // Cache the root page
  let rootPage: PageModel | null = null;

  return {
    async getRootPage(): Promise<PageModel | null> {
      if (rootPage) return rootPage;

      const result = await pagesDb.find({
        selector: {
          parentId: null,
        } as PageSelector,
        limit: 1,
      });

      if (result.docs.length > 0) {
        rootPage = result.docs[0];
      }

      return rootPage;
    },

    async getPageById(pageId: string): Promise<PageModel | null> {
      const result = await pagesDb.find({
        selector: {
          _id: pageId,
        } as PageSelector,
        limit: 1,
      });

      return result.docs.length > 0 ? result.docs[0] : null;
    },

    async getPageBySlug(slug: string) {
      const result = await pagesDb.find({
        selector: { pageSlug: slug } as PageSelector,
        limit: 1,
      });

      return result.docs.length > 0 ? result.docs[0] : null;
    },

    async lookupPageBySlug(slug: string) {
      const result = await pagesDb.find({
        selector: {
          pageSlugs: {
            $in: [slug],
          },
        } as PageSelector,
        limit: 1,
      });

      return result.docs.length > 0 ? result.docs[0] : null;
    },

    async generateUniqueSlug(title: string) {
      let slug = slugify(title, { lower: true });
      let uniqueSlugFound = false;
      let counter = 1;

      while (!uniqueSlugFound) {
        const result = await pagesDb.find({
          selector: {
            $or: [{ pageSlug: slug }, { pageSlugs: { $in: [slug] } }],
          } as PageSelector,
          limit: 1,
        });

        const slugAlreadyInUse = result.docs.length > 0;

        if (slugAlreadyInUse) {
          slug = `${slugify(title, { lower: true })}-${counter}`;
          counter++;
        } else {
          uniqueSlugFound = true;
        }
      }

      return slug;
    },

    async insertPage(page: PageModelWithoutId) {
      page.pageContent = safeHtml(page.pageContent);
      page.pageTitle = safeHtml(page.pageTitle);

      try {
        await pagesDb.insert(page as PageModel);
      } catch (error) {
        console.log(error);
        throw new ErrorWithFeedback(Feedbacks.E_CREATING_PAGE);
      }
    },

    async search(q: string) {
      const query = safeRegExp(q);

      const result = await pagesDb.find({
        selector: {
          pageTitle: {
            $regex: `(?i)${query}`,
          },
        },
        limit: 25,
      });

      return result.docs;
    },

    // Couchdb doesn't support full-text search without Lucene
    async searchText(q: string) {
      const query = safeRegExp(q);

      const result = await pagesDb.find({
        selector: {
          $or: [
            {
              pageTitle: {
                $regex: `(?i)${query}`,
              },
            },
            {
              pageContent: {
                $regex: `(?i)${query}`,
              },
            },
          ],
        },
        limit: 25,
      });

      return result.docs;
    },

    async buildMenuTree(parentId: string): Promise<NavItem[]> {
      const result = await pagesDb.find({
        selector: {
          parentId,
        } as PageSelector,
        // FIXME: Ensure that the field array contains only
        // valid fields from the PageModel type
        fields: ['_id', 'pageTitle', 'pageSlug'],
      });

      const menuTree = [];
      for (const page of result.docs) {
        const menuItem: NavItem = {
          pageId: page._id,
          title: page.pageTitle,
          link: slugUrl(page.pageSlug),
          children: await this.buildMenuTree(page._id),
        };

        menuTree.push(menuItem);
      }

      return menuTree;
    },

    async updatePage(page: PageModel, newPage: Partial<PageModel>) {
      const updatedPage: PageModel = {
        ...page,
        ...newPage,
        pageTitle: safeHtml(newPage.pageTitle!),
        pageContent: safeHtml(newPage.pageContent!),
        updatedAt: newPage.updatedAt!,
      };

      if (page.pageSlug !== newPage.pageSlug) {
        updatedPage.pageSlugs = [...page.pageSlugs, page.pageSlug];
      }

      try {
        await pagesDb.insert(updatedPage);
      } catch (error) {
        throw new ErrorWithFeedback(Feedbacks.E_UPDATING_PAGE);
      }
    },

    async updatePageParent(page: PageModel, newParentId: string) {
      const updatedPage: PageModel = {
        ...page,
        parentId: newParentId,
      };
      try {
        await pagesDb.insert(updatedPage);
      } catch (error) {
        throw new ErrorWithFeedback(Feedbacks.E_UPDATING_PAGE);
      }
    },

    async deletePage(page: PageModel) {
      try {
        await pagesDb.destroy(page._id, page._rev);

        // Update child pages
        const childPages = await pagesDb.find({
          selector: { parentId: page._id } as PageSelector,
        });

        for (const childPage of childPages.docs) {
          childPage.parentId = page.parentId;
          await pagesDb.insert(childPage);
        }
      } catch (error) {
        throw new ErrorWithFeedback(Feedbacks.E_DELETING_PAGE);
      }
    },

    async getPageHistory(pageId: string) {
      const doc = await pagesDb.get(pageId, { revs_info: true });

      const history = await Promise.all(
        doc._revs_info!.map(async (rev) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          const revisionDoc = await pagesDb.get(pageId, { rev: rev.rev });
          return {
            pageTitle: revisionDoc.pageTitle,
            pageContent: revisionDoc.pageContent,
            updatedAt: revisionDoc.updatedAt,
            _rev: revisionDoc._rev,
          };
        })
      );

      return history;
    },

    async getPageHistoryItem(pageId: string, version: number) {
      const doc = await pagesDb.get(pageId, { revs_info: true });

      // Check if the specified version exists
      if (version <= 0 || version > doc._revs_info!.length) {
        throw new ErrorWithFeedback(Feedbacks.E_INVALID_VERSION);
      }

      // Get the specific revision based on the version index
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const targetRev = doc._revs_info![version - 1].rev;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const revisionDoc = await pagesDb.get(pageId, { rev: targetRev });

      return {
        pageTitle: revisionDoc.pageTitle,
        pageContent: revisionDoc.pageContent,
        updatedAt: revisionDoc.updatedAt,
        _rev: revisionDoc._rev,
      };
    },
  };
}

dbService.init = async () => {
  const couchdb = nano({
    url: process.env.COUCHDB_URL || '',
    requestDefaults: {
      auth: {
        username: process.env.DB_USER || '',
        password: process.env.DB_PASSWORD || '',
      },
    },
  });

  try {
    await couchdb.db.get('pages');
  } catch (error) {
    await couchdb.db.create('pages');
  }

  return couchdb;
};
