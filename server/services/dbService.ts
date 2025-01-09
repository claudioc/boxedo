import type {
  SettingsModel,
  PageModel,
  PageSelector,
  NavItem,
  PageRevInfo,
  PageModelWithRev,
  NodeEnv,
} from '~/../types';
import { Feedbacks } from '~/lib/feedbacks';
import { ErrorWithFeedback } from '~/lib/errors';
import slugify from 'slugify';
import nano, { type DocumentScope, type ServerScope } from 'nano';
import { slugUrl } from '~/lib/helpers';
import sanitizeHtml from 'sanitize-html';
import { createId } from '@paralleldrive/cuid2';
import { POSITION_GAP_SIZE } from '~/constants';

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
    getPageDb() {
      return pagesDb;
    },

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
      } catch {
        throw new ErrorWithFeedback(Feedbacks.E_UPDATING_SETTINGS);
      }
    },

    async countPages(): Promise<number> {
      try {
        const result = await pagesDb.view('pages', 'count', { reduce: true });

        // Check if we have results and a valid value
        if (result?.rows?.[0]?.value != null) {
          return Number(result.rows[0].value);
        }

        return 0; // Default if no results or invalid structure
      } catch (error) {
        console.error('Error counting pages:', error);
        return 0; // Default on error
      }
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

    // Helper to get siblings of a page sorted by position
    async getSiblingPages(parentId: string) {
      const result = await pagesDb.view('pages', 'by_parent_position', {
        startkey: [parentId],
        endkey: [parentId, {}],
        include_docs: true,
      });

      return result.rows.map((row) => row.doc);
    },

    // Find the appropriate position for inserting a page
    async findInsertPosition(
      parentId: string | null,
      targetIndex = Number.POSITIVE_INFINITY,
      pageId?: string
    ): Promise<number> {
      const siblings = await pagesDb.view('pages', 'by_parent_position', {
        startkey: [parentId],
        endkey: [parentId, {}],
        include_docs: true,
      });
      let pages = siblings.rows.map((row) => row.doc) as PageModel[];
      if (pageId) {
        pages = pages.filter((page) => page._id !== pageId);
      }

      // No siblings - first page
      if (pages.length === 0) {
        return POSITION_GAP_SIZE;
      }

      // Append at end
      if (targetIndex >= pages.length) {
        return pages[pages.length - 1].position + POSITION_GAP_SIZE;
      }

      // Insert at beginning
      if (targetIndex === 0) {
        return pages[0].position / 2;
      }

      // Insert between pages
      const prevPosition = pages[targetIndex - 1].position;
      const nextPosition = pages[targetIndex].position;
      return (prevPosition + nextPosition) / 2;
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
        sort: [{ position: 'asc' }],
      });

      return result.docs;
    },

    async buildMenuTree(parentId: string | null): Promise<NavItem[]> {
      const result = await pagesDb.find({
        selector: {
          parentId: parentId ?? { $eq: null },
          position: { $gte: 0 },
        },
        fields: ['_id', 'pageTitle', 'pageSlug', 'position'],
        sort: [{ position: 'asc' }],
      });

      const menuTree = await Promise.all(
        result.docs.map(async (page) => {
          const menuItem: NavItem = {
            pageId: page._id,
            title: page.pageTitle,
            link: slugUrl(page.pageSlug),
            position: page.position,
            children: await this.buildMenuTree(page._id),
          };

          return menuItem;
        })
      );
      return menuTree;
    },

    // Original version without the position
    // async _buildMenuTree(parentId: string): Promise<NavItem[]> {
    //   const result = await pagesDb.find({
    //     selector: {
    //       parentId,
    //     } as PageSelector,
    //     // FIXME: Ensure that the field array contains only
    //     // valid fields from the PageModel type
    //     fields: ['_id', 'pageTitle', 'pageSlug'],
    //   });

    //   const menuTree = [];
    //   for (const page of result.docs) {
    //     const menuItem: NavItem = {
    //       pageId: page._id,
    //       title: page.pageTitle,
    //       link: slugUrl(page.pageSlug),
    //       children: await this.buildMenuTree(page._id),
    //     };

    //     menuTree.push(menuItem);
    //   }

    //   return menuTree;
    // },

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
      } catch {
        throw new ErrorWithFeedback(Feedbacks.E_UPDATING_PAGE);
      }
    },

    async changePageParent(
      page: PageModel,
      newParentId: string | null,
      position: number
    ) {
      const updatedPage: PageModel = {
        ...page,
        position,
        parentId: newParentId,
      };
      try {
        await pagesDb.insert(updatedPage);
      } catch {
        throw new ErrorWithFeedback(Feedbacks.E_UPDATING_PAGE);
      }
    },

    async updatePagePosition(page: PageModel, position: number) {
      try {
        await pagesDb.insert({
          ...page,
          position,
        });
      } catch {
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
      } catch {
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
        await dbService._createViews(client);
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

  await client.db.use(dbn('pages')).createIndex({
    index: {
      fields: ['parentId', 'position'],
    },
  });
};

dbService._createViews = async (client: nano.ServerScope) => {
  const db = await client.db.use(dbn('pages'));

  const designDoc = {
    _id: '_design/pages',
    views: {
      by_parent_position: {
        map: `function(doc) {
          if (doc.position !== undefined) {
            emit([doc.parentId || null, doc.position], null);
          }
        }`,
      },

      count: {
        map: `function(doc) {
          if (!doc._id.startsWith('_design/')) {
            emit(null, 1);
          }
        }`,
        reduce: '_count',
      },
    },
  };

  try {
    // Try to get existing design doc
    const existing = await db.get('_design/pages');
    const updatedDoc = { ...designDoc, _rev: existing._rev };
    await db.insert(updatedDoc);
  } catch (err) {
    if ((err as { statusCode?: number })?.statusCode === 404) {
      // Design doc doesn't exist, create it
      await db.insert(designDoc);
    } else {
      throw err;
    }
  }
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
  } catch {
    await couchdb.db.create(dbn('pages'));
  }

  try {
    await couchdb.db.get(dbn('settings'));
  } catch {
    await couchdb.db.create(dbn('settings'));
  }

  try {
    /*
     * If you add a design document (and index) don't forget
     * to increase DESIGN_DOCUMENTS_COUNT
     */
    await dbService._createIndexes(couchdb);
    await dbService._createViews(couchdb);
  } catch {
    // Index might already exist, that's fine
  }

  return couchdb;
};
