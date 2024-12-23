import type {
  SettingsModel,
  PageModel,
  PageSelector,
  NavItem,
  PageRevInfo,
  PageModelWithRev,
  NodeEnv,
} from '~/types';
import { Feedbacks } from '~/lib/feedbacks';
import { ErrorWithFeedback } from '~/lib/errors';
import slugify from 'slugify';
import nano, { type DocumentScope, type ServerScope } from 'nano';
import { slugUrl } from '~/lib/helpers';
import sanitizeHtml from 'sanitize-html';
import { createId } from '@paralleldrive/cuid2';

const DESIGN_DOCUMENTS_COUNT = 1;

interface DbServiceInitParams {
  serverUrl: string;
  username: string;
  password: string;
  env: NodeEnv;
}

let isTestRun = false;

const dbn = (name: 'pages' | 'settings') => {
  return isTestRun ? `${name}-test` : name;
};

// https://github.com/apostrophecms/sanitize-html
const safeHtml = (str: string) =>
  sanitizeHtml(str, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
  });

const safeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export type { ServerScope as DbClient };

export function dbService(client?: nano.ServerScope) {
  if (!client) throw new ErrorWithFeedback(Feedbacks.E_MISSING_DB);

  const pagesDb: DocumentScope<PageModel> = client.db.use(dbn('pages'));
  if (!pagesDb) throw new ErrorWithFeedback(Feedbacks.E_MISSING_PAGES_DB);

  const settingsDb: DocumentScope<SettingsModel> = client.db.use(
    dbn('settings')
  );
  if (!settingsDb) throw new ErrorWithFeedback(Feedbacks.E_MISSING_SETTINGS_DB);

  return {
    async getSettings() {
      let settings: SettingsModel | null = null;
      try {
        settings = await settingsDb.get('settings');
      } catch (err: unknown) {
        if ((err as { statusCode?: number })?.statusCode !== 404) {
          throw new ErrorWithFeedback(Feedbacks.E_UNKNOWN_ERROR);
        }
      }

      // If settings are not found, create a new one
      if (!settings) {
        const newSettings: SettingsModel = {
          _id: 'settings',
          landingPageId: null,
          siteTitle: 'Joongle',
          siteDescription: 'Personal documentation CMS',
          siteLang: 'en',
        };

        await settingsDb.insert(newSettings);
        return newSettings;
      }

      return settings;
    },

    async updateSettings(settings: SettingsModel) {
      try {
        await settingsDb.insert(settings);
      } catch (error) {
        throw new ErrorWithFeedback(Feedbacks.E_UPDATING_SETTINGS);
      }
    },

    async countPages(): Promise<number> {
      const info = await pagesDb.info();
      // Let's be 100% sure that we are never returning a negative value
      return Math.max(info.doc_count - DESIGN_DOCUMENTS_COUNT, 0);
    },

    async getPageById(pageId: string): Promise<PageModel | null> {
      let page: PageModel | null = null;
      try {
        page = await pagesDb.get(pageId);
      } catch (err: unknown) {
        if ((err as { statusCode?: number })?.statusCode !== 404) {
          throw new ErrorWithFeedback(Feedbacks.E_UNKNOWN_ERROR);
        }
      }

      return page;
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
      let slug = slugify(title.trim(), { lower: true });
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
          slug = `${slugify(title.trim(), { lower: true })}-${counter++}`;
        } else {
          uniqueSlugFound = true;
        }
      }

      return slug;
    },

    async insertPage(page: PageModel) {
      page.pageContent = safeHtml(page.pageContent);
      page.pageTitle = safeHtml(page.pageTitle);

      try {
        await pagesDb.insert(page);
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

    async getTopLevelPages(): Promise<PageModel[]> {
      const result = await pagesDb.find({
        selector: {
          parentId: null,
        } as PageSelector,
        sort: [{ createdAt: 'asc' }],
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
        pageTitle: safeHtml(newPage.pageTitle ?? ''),
        pageContent: safeHtml(newPage.pageContent ?? ''),
        updatedAt: newPage.updatedAt ?? new Date().toISOString(),
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

    async deletePage(page: PageModelWithRev) {
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

    async getPageHistory(page: PageModel): Promise<PageModel[]> {
      const doc = await pagesDb.get(page._id, { revs_info: true });

      if (!doc._revs_info) return [];

      const history = (
        (await Promise.all(
          (doc._revs_info as PageRevInfo[]).map(async (rev) => {
            if (rev.status !== 'available') return null;
            if (rev.rev === doc._rev) return null;
            const revisionDoc = await pagesDb.get(page._id, { rev: rev.rev });
            return {
              pageTitle: revisionDoc.pageTitle,
              updatedAt: revisionDoc.updatedAt,
              _rev: revisionDoc._rev,
            };
          })
        )) as PageModel[]
      ).filter((item) => item !== null);

      return history;
    },

    async getPageHistoryItem(
      page: PageModel,
      version: string
    ): Promise<PageModel> {
      const revisionDoc = await pagesDb.get(page._id, { rev: version });

      return {
        pageTitle: revisionDoc.pageTitle,
        pageContent: revisionDoc.pageContent,
        updatedAt: revisionDoc.updatedAt,
        _rev: revisionDoc._rev,
      } as PageModel;
    },

    async nukeTests() {
      if (!isTestRun) return;

      let name = dbn('pages');
      // Ensure we are deleting the test database
      if (name.includes('-test')) {
        try {
          await client.db.destroy(name);
          await client.db.create(dbn('pages'));
        } catch (error) {
          console.log(error);
        }
      }

      name = dbn('settings');
      // Ensure we are deleting the test database
      if (name.includes('-test')) {
        try {
          await client.db.destroy(name);
          await client.db.create(dbn('settings'));
          await this.getSettings();
        } catch (error) {
          console.log(error);
        }
      }

      try {
        /*
         * If you add a design document (and index) don't forget
         * to increase DESIGN_DOCUMENTS_COUNT
         */
        await dbService._createIndexes(client);
      } catch {
        // Index might already exist, that's fine
      }
    },
  };
}

// bulk-load uses the same logic
dbService.generateId = () => `page:${createId()}`;

dbService._createIndexes = async (client: nano.ServerScope) => {
  await client.db.use(dbn('pages')).createIndex({
    index: {
      fields: ['parentId', 'createdAt'],
    },
  });
};

dbService.init = async (params: DbServiceInitParams) => {
  const couchdb = nano({
    url: params.serverUrl,
    requestDefaults: {
      auth: {
        username: params.username,
        password: params.password,
      },
    },
  });

  isTestRun = params.env === 'test';

  try {
    await couchdb.db.get(dbn('pages'));
  } catch (error) {
    await couchdb.db.create(dbn('pages'));
  }

  try {
    await couchdb.db.get(dbn('settings'));
  } catch (error) {
    await couchdb.db.create(dbn('settings'));
  }

  try {
    /*
     * If you add a design document (and index) don't forget
     * to increase DESIGN_DOCUMENTS_COUNT
     */
    await dbService._createIndexes(couchdb);
  } catch {
    // Index might already exist, that's fine
  }

  return couchdb;
};
