import { err, ok, type Result } from 'neverthrow';
import slugify from 'slugify';
import type {
  AnyLogger,
  ConfigEnv,
  DocumentModel,
  Feedback,
  NavItem,
  PageModel,
} from '~/../types';
import { ANONYMOUS_AUTHOR_ID, POSITION_GAP_SIZE } from '~/constants';
import { Feedbacks } from '~/lib/feedbacks';
import { safeHtml, slugUrl } from '~/lib/helpers';
import { BaseRepository } from './BaseRepository';

// This values are only added on READ (not on WRITE)
// just to be sure that the pages are always consistent
// with the changes of the schema over time
const DEFAULT_PAGE_VALUES: Partial<PageModel> = {
  parentId: null,
  pageTitle: '',
  pageSlug: '',
  pageSlugs: [],
  pageContent: '',
  position: POSITION_GAP_SIZE,
  contentUpdated: false,
  // Added on 11 March 2025
  author: ANONYMOUS_AUTHOR_ID,
  // Added on 28 March 2025
  updatedBy: ANONYMOUS_AUTHOR_ID,
} as const;

const ensurePageDefaults = (page: PageModel): PageModel => ({
  ...DEFAULT_PAGE_VALUES,
  ...page,
});

export class PageRepository extends BaseRepository {
  constructor(
    protected db: PouchDB.Database<DocumentModel>,
    protected config: ConfigEnv,
    protected logger: AnyLogger
  ) {
    super(db, config, logger);
  }

  public async countPages(): Promise<Result<number, Feedback>> {
    try {
      const result = await this.db.query('pages/count', { reduce: true });
      return ok(result.rows[0]?.value || 0);
    } catch (error) {
      this.logger.error('Error counting pages:', error);
      return err(Feedbacks.E_UNKNOWN_ERROR);
    }
  }

  public async getPageById(
    pageId: string
  ): Promise<Result<PageModel | null, Feedback>> {
    try {
      const doc = await this.db.get<PageModel>(pageId);
      // Only return if it's actually a page
      return ok(doc.type === 'page' ? ensurePageDefaults(doc) : null);
    } catch (error) {
      if ((error as PouchDB.Core.Error).status === 404) {
        return ok(null);
      }

      this.logger.error('Error getting a page by id:', error);
      return err(Feedbacks.E_UNKNOWN_ERROR);
    }
  }

  public async getPageBySlug(
    slug: string
  ): Promise<Result<PageModel | null, Feedback>> {
    try {
      const result = await this.db.find({
        selector: {
          type: 'page',
          pageSlug: slug,
        },
        limit: 1,
      });

      return ok(
        result.docs.length > 0
          ? ensurePageDefaults(result.docs[0] as PageModel)
          : null
      );
    } catch (error) {
      if ((error as PouchDB.Core.Error).status === 404) {
        return ok(null);
      }

      this.logger.error('Error getting a page by slug:', error);
      return err(Feedbacks.E_UNKNOWN_ERROR);
    }
  }

  public async lookupPageBySlug(
    slug: string
  ): Promise<Result<PageModel | null, Feedback>> {
    try {
      const result = await this.db.find({
        selector: {
          type: 'page',
          pageSlugs: {
            $elemMatch: { $eq: slug },
          },
        },
        limit: 1,
      });

      return ok(
        result.docs.length > 0
          ? ensurePageDefaults(result.docs[0] as PageModel)
          : null
      );
    } catch (error) {
      if ((error as PouchDB.Core.Error).status === 404) {
        return ok(null);
      }

      this.logger.error('Error looking up a page by slug:', error);
      return err(Feedbacks.E_UNKNOWN_ERROR);
    }
  }

  async generateUniqueSlug(title: string): Promise<Result<string, Feedback>> {
    let slug = slugify(title.trim(), { lower: true });
    let uniqueSlugFound = false;
    let counter = 1;

    try {
      while (!uniqueSlugFound) {
        const result = await this.db.find({
          selector: {
            type: 'page',
            $or: [
              { pageSlug: slug },
              { pageSlugs: { $elemMatch: { $eq: slug } } },
            ],
          },
          limit: 1,
        });

        const slugAlreadyInUse = result.docs.length > 0;

        if (slugAlreadyInUse) {
          slug = `${slugify(title.trim(), { lower: true })}-${counter++}`;
        } else {
          uniqueSlugFound = true;
        }
      }

      return ok(slug);
    } catch (error) {
      this.logger.error('Error generating unique slug:', error);
      return err(Feedbacks.E_UNKNOWN_ERROR);
    }
  }

  public async findInsertPosition(
    parentId: string | null,
    targetIndex = Number.POSITIVE_INFINITY,
    pageId?: string
  ): Promise<Result<number, Feedback>> {
    try {
      const siblings = await this.db.query<PageModel>(
        'pages/by_parent_position',
        {
          startkey: [parentId],
          endkey: [parentId, {}],
          include_docs: true,
        }
      );

      // biome-ignore lint/style/noNonNullAssertion:
      let pages = siblings.rows.map((row) => row.doc!);
      if (pageId) {
        pages = pages.filter((page) => page?._id !== pageId);
      }

      // No siblings - first page
      if (pages.length === 0) {
        return ok(POSITION_GAP_SIZE);
      }

      // Append at end
      if (targetIndex >= pages.length) {
        return ok(pages[pages.length - 1].position + POSITION_GAP_SIZE);
      }

      // Insert at beginning
      if (targetIndex === 0) {
        return ok(pages[0].position / 2);
      }

      // Insert between pages
      const prevPosition = pages[targetIndex - 1].position;
      const nextPosition = pages[targetIndex].position;
      return ok((prevPosition + nextPosition) / 2);
    } catch (error) {
      this.logger.error('Error finding insert position:', error);
      return err(Feedbacks.E_UNKNOWN_ERROR);
    }
  }

  public async insertPage(page: PageModel): Promise<Result<void, Feedback>> {
    page.pageContent = safeHtml(page.pageContent);
    page.pageTitle = safeHtml(page.pageTitle);
    page.contentUpdated = true;

    try {
      await this.db.put(page);
      return ok();
    } catch (error) {
      this.logger.error('Error inserting a page', error);
      return err(Feedbacks.E_CREATING_PAGE);
    }
  }

  public async getTopLevelPages(): Promise<Result<PageModel[], Feedback>> {
    try {
      const result = (await this.db.find({
        selector: {
          type: 'page',
          parentId: null,
          position: { $gte: 0 },
        },
        sort: [{ position: 'asc' }],
      })) as PouchDB.Find.FindResponse<PageModel>;

      return ok(result.docs.map((doc) => ensurePageDefaults(doc)));
    } catch (error) {
      this.logger.error('Error getting top level pages:', error);
      return err(Feedbacks.E_UNKNOWN_ERROR);
    }
  }

  public async buildMenuTree(
    parentId: string | null = null
  ): Promise<Result<NavItem[], Feedback>> {
    try {
      const result = await this.db.find({
        selector: {
          type: 'page',
          // We're not filtering by parentId here, we'll organize in memory
        },
        fields: ['_id', 'pageTitle', 'pageSlug', 'position', 'parentId'],
        // No need to sort here, we'll sort in memory
        limit: Number.MAX_SAFE_INTEGER,
      });

      const pages = result.docs.map((doc) =>
        ensurePageDefaults(doc as PageModel)
      );

      // Group pages by parentId
      const pagesByParent = new Map<string | null, PageModel[]>();

      pages.forEach((page) => {
        const parentKey = page.parentId || null;
        if (!pagesByParent.has(parentKey)) {
          pagesByParent.set(parentKey, []);
        }
        // biome-ignore lint/style/noNonNullAssertion:
        pagesByParent.get(parentKey)!.push(page);
      });

      // Sort each group by position
      pagesByParent.forEach((group) => {
        group.sort((a, b) => (a.position || 0) - (b.position || 0));
      });

      // Recursive function to build tree structure
      const buildTree = (currentParentId: string | null): NavItem[] => {
        const children = pagesByParent.get(currentParentId) || [];

        return children.map((page) => ({
          pageId: page._id,
          title: page.pageTitle,
          link: slugUrl(page.pageSlug, this.config.JNGL_BASE_EXTERNAL_URL),
          position: page.position,
          children: buildTree(page._id),
        }));
      };

      // Build the tree starting from the requested parent
      return ok(buildTree(parentId));
    } catch (error) {
      this.logger.error('Error building menu tree:', error);
      return err(Feedbacks.E_UNKNOWN_ERROR);
    }
  }

  public async updatePageContent(
    page: PageModel,
    newPage: Partial<PageModel>
  ): Promise<Result<void, Feedback>> {
    try {
      const updatedPage: PageModel = {
        ...page,
        ...newPage,
        contentUpdated: true,
        pageTitle: safeHtml(newPage.pageTitle ?? ''),
        pageContent: safeHtml(newPage.pageContent ?? ''),
        updatedAt: newPage.updatedAt ?? new Date().toISOString(),
      };

      if (page.pageSlug !== newPage.pageSlug) {
        updatedPage.pageSlugs = [...page.pageSlugs, page.pageSlug];
      }

      await this.db.put(updatedPage);
      return ok();
    } catch (error) {
      this.logger.error('Error updating page content:', error);
      return err(Feedbacks.E_UPDATING_PAGE);
    }
  }

  public async changePageParent(
    page: PageModel,
    newParentId: string | null,
    position: number
  ): Promise<Result<void, Feedback>> {
    try {
      const updatedPage: PageModel = {
        ...page,
        position,
        contentUpdated: false,
        parentId: newParentId,
      };

      await this.db.put(updatedPage);

      return ok();
    } catch (error) {
      this.logger.error('Error changing page parent:', error);
      return err(Feedbacks.E_UPDATING_PAGE);
    }
  }

  public async updatePagePosition(
    page: PageModel,
    position: number
  ): Promise<Result<void, Feedback>> {
    try {
      await this.db.put({
        ...page,
        contentUpdated: false,
        position,
      });
      return ok();
    } catch (error) {
      this.logger.error('Error updating page position:', error);
      return err(Feedbacks.E_UPDATING_PAGE);
    }
  }

  public async deletePage(page: PageModel): Promise<Result<void, Feedback>> {
    try {
      // First delete the page
      await this.db.remove(page as Required<PageModel>);

      // Find all child pages
      const result = (await this.db.find({
        selector: {
          type: 'page',
          parentId: page._id,
        },
      })) as PouchDB.Find.FindResponse<PageModel>;

      // Update each child page's parent
      for await (const childPage of result.docs) {
        this.db.put({
          ...childPage,
          parentId: page.parentId,
          contentUpdated: false,
        });
      }

      return ok();
    } catch (error) {
      this.logger.error('Error deleting page:', error);
      return err(Feedbacks.E_DELETING_PAGE);
    }
  }

  public async getPageHistory(
    page: PageModel
  ): Promise<Result<PageModel[], Feedback>> {
    try {
      const doc = await this.db.get(page._id, { revs_info: true });

      if (!doc._revs_info) {
        return ok([]);
      }

      const history = (
        await Promise.all(
          (doc._revs_info as PouchDB.Core.RevisionInfo[]).map(async (rev) => {
            if (rev.status !== 'available') return null;
            // Skip the current revision
            if (rev.rev === doc._rev) return null;
            const revisionDoc = ensurePageDefaults(
              await this.db.get(page._id, {
                rev: rev.rev,
              })
            );
            // Don't bother with versions that don't have updated content
            if (!revisionDoc.contentUpdated) return null;
            return {
              pageTitle: revisionDoc.pageTitle,
              updatedBy: revisionDoc.updatedBy,
              updatedAt: revisionDoc.updatedAt,
              author: revisionDoc.author,
              _rev: revisionDoc._rev,
            };
          })
        )
      ).filter((item): item is Required<PageModel> => item !== null);

      return ok(history);
    } catch (error) {
      this.logger.error('Error getting page history:', error);
      return err(Feedbacks.E_UNKNOWN_ERROR);
    }
  }

  public async getPageHistoryItem(
    page: PageModel,
    version: string
  ): Promise<Result<PageModel, Feedback>> {
    try {
      const revisionDoc = await this.db.get<PageModel>(page._id, {
        rev: version,
      });

      // Note that the ensurePageDefaults works on the presence of the field's key
      // not on the presence of its value. If you add a new field in here, it
      // won't receive the default value. That's why we use a 2-step process to
      // ensure the defaults.
      const item: Partial<PageModel> = {
        pageTitle: revisionDoc.pageTitle,
        pageContent: revisionDoc.pageContent,
        updatedAt: revisionDoc.updatedAt,
        author: revisionDoc.author,
        _rev: revisionDoc._rev,
      };

      if (revisionDoc.author !== undefined) {
        item.author = revisionDoc.author;
      }

      if (revisionDoc.updatedBy !== undefined) {
        item.updatedBy = revisionDoc.updatedBy;
      }

      return ok(ensurePageDefaults(item as PageModel));
    } catch (error) {
      this.logger.error('Error getting page history item:', error);
      return err(Feedbacks.E_INVALID_VERSION);
    }
  }
}
