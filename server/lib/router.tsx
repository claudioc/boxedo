import { FastifyInstance } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import { slugUrl } from './helpers';
import { PageModel, NavItem, PageModelWithRev } from '~/types';
import { Feedbacks } from './feedbacks';
import cheerio from 'cheerio';
import { dbService } from '~/services/dbService';
import { redirectService } from '~/services/redirectService';
import { ErrorWithFeedback } from './errors';

import { SearchResults } from '~/views/SearchResults';
import { ReadPage } from '~/views/ReadPage';
import { ReadPageVersion } from '~/views/ReadPageVersion';
import { NotFound } from '~/views/NotFound';
import { Error } from '~/views/Error';
import { EditPage } from '~/views/EditPage';
import { CreatePage } from '~/views/CreatePage';
import { MovePage } from '~/views/MovePage';
import { Nav } from '~/views/components/Nav';
import { PageHistory } from '~/views/PageHistory';

const PageIdFormat = {
  type: 'string',
  pattern: '^page:[0-9a-z]{2,32}$',
} as const;

const PageSlugParamsSchema = {
  type: 'object',
  required: ['slug'],
  properties: {
    slug: { type: 'string' },
  },
} as const;

const PageParamsSchema = {
  type: 'object',
  required: ['pageId'],
  properties: {
    pageId: PageIdFormat,
  },
} as const;

const PageParamsSchemaOptional = {
  type: 'object',
  properties: {
    pageId: {
      anyOf: [PageIdFormat, { type: 'null' }],
    },
  },
} as const;

const PageWithVersionParamsSchema = {
  type: 'object',
  required: ['pageId', 'version'],
  properties: {
    pageId: PageIdFormat,
    version: { type: 'string', pattern: '^[0-9]+-[a-f0-9]+$' },
  },
} as const;

const PageQuerySchema = {
  type: 'object',
  properties: {
    f: { type: 'number' },
  },
} as const;

const SearchQuerySchema = {
  type: 'object',
  required: ['q'],
  properties: {
    q: { type: 'string' },
  },
} as const;

const PageIdSchema = PageParamsSchema;

const SubpageParamsSchema = {
  type: 'object',
  required: ['parentPageId'],
  properties: {
    parentPageId: PageIdFormat,
  },
} as const;

const PageBodySchema = {
  type: 'object',
  required: ['pageTitle', 'pageContent'],
  properties: {
    pageTitle: { type: 'string' },
    pageContent: { type: 'string' },
    rev: { type: 'string' },
  },
} as const;

const MovePageBodySchema = {
  type: 'object',
  required: ['newParentId', 'oldParentId'],
  properties: {
    newParentId: PageIdFormat,
    oldParentId: PageIdFormat,
  },
} as const;

const DEFAULT_HOMEPAGE: PageModel = {
  _id: 'page:joongle', // anything that's a valid cuid2
  _rev: '',
  pageTitle: 'Welcome to Joongle!',
  pageContent:
    '<p class="empty-index-placeholder">Click on the "Create this page" link to get started</p>',
  pageSlug: '',
  pageSlugs: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options, refer to https://www.fastify.dev/docs/latest/Reference/Plugins/#plugin-options
 */
// eslint-disable-next-line @typescript-eslint/require-await
const router = async (app: FastifyInstance) => {
  // The home page, folks
  app.get<{ Querystring: FromSchema<typeof PageQuerySchema> }>(
    '/',
    {
      schema: {
        querystring: PageQuerySchema,
      },
    },
    async (req) => {
      const dbs = dbService(app.dbClient);
      const isHtmx = req.headers['hx-request'];

      let root: PageModel | null = null;
      let feedbackCode;
      try {
        root = await dbs.getRootPage();
      } catch (error) {
        if (error instanceof ErrorWithFeedback) {
          feedbackCode = error.feedback.code;
        }
      }

      if (!feedbackCode) {
        feedbackCode = req.query.f;
      }

      return (
        <ReadPage
          i18n={app.i18n}
          isFull={!isHtmx}
          page={root ?? DEFAULT_HOMEPAGE}
          feedbackCode={feedbackCode}
        />
      );
    }
  );

  app.get<{
    Querystring: FromSchema<typeof SearchQuerySchema>;
  }>(
    '/parts/titles',
    {
      schema: {
        querystring: SearchQuerySchema,
      },
    },
    async (req) => {
      const { q } = req.query;

      if (q.length < 3 || q.length > 50) {
        return '';
      }

      const results = await dbService(app.dbClient).search(q);

      return (
        <>
          {results.map((result) => (
            <li>
              <a href="#" data-page-id={result._id}>
                {result.pageTitle}
              </a>
            </li>
          ))}
        </>
      );
    }
  );

  app.get<{ Params: FromSchema<typeof PageParamsSchema> }>(
    '/parts/nav/:pageId',
    {
      schema: {
        params: PageParamsSchemaOptional,
      },
    },
    async (req) => {
      const { pageId } = req.params;
      const dbs = dbService(app.dbClient);

      let root;
      try {
        root = await dbs.getRootPage();
      } catch {
        /* ignore */
      }

      if (!root) {
        return 'There are no pages';
      }

      const tree: NavItem = {
        pageId: root._id,
        title: root.pageTitle,
        link: '/',
        children: await dbs.buildMenuTree(root._id),
      };

      return <Nav tree={tree} currentPageId={pageId || root._id} />;
    }
  );

  app.get<{
    Params: FromSchema<typeof PageSlugParamsSchema>;
    Querystring: FromSchema<typeof PageQuerySchema>;
  }>(
    '/page/:slug',
    {
      schema: {
        params: PageSlugParamsSchema,
        querystring: PageQuerySchema,
      },
    },
    async (req, rep) => {
      const { slug } = req.params;
      const { f: feedbackCode } = req.query;
      const dbs = dbService(app.dbClient);
      const isHtmx = req.headers['hx-request'];

      const page = await dbs.getPageBySlug(slug);

      if (page) {
        return (
          <ReadPage isFull={!isHtmx} page={page} feedbackCode={feedbackCode} />
        );
      }

      const oldPage = await dbs.lookupPageBySlug(slug);

      if (oldPage) {
        // Redirect to the current slug
        app.log.error(`Using old slug ${slug} for page ${oldPage._id}`);
        return rep.redirect(301, slugUrl(oldPage.pageSlug));
      }

      app.log.error(Feedbacks.E_MISSING_PAGE.message);
      return <NotFound title="Page not found" />;
    }
  );

  app.get<{ Params: FromSchema<typeof PageParamsSchema> }>(
    '/edit/:pageId',
    {
      schema: {
        params: PageParamsSchema,
      },
    },
    async (req, rep) => {
      const { pageId } = req.params;
      const dbs = dbService(app.dbClient);
      const rs = redirectService(app, rep);
      const token = rep.generateCsrf();
      const root = await dbs.getRootPage();

      let page: PageModel | null = DEFAULT_HOMEPAGE;
      if (root) {
        page = await dbs.getPageById(pageId);
      }

      if (!page) {
        return rs.homeWithFeedback(Feedbacks.E_MISSING_PAGE);
      }

      return <EditPage page={page} token={token} />;
    }
  );

  app.post<{
    Body: FromSchema<typeof PageBodySchema>;
    Params: FromSchema<typeof PageParamsSchema>;
  }>(
    '/edit/:pageId',
    {
      schema: {
        body: PageBodySchema,
        params: PageParamsSchema,
      },
      // eslint-disable-next-line @typescript-eslint/unbound-method
      preHandler: app.csrfProtection,
    },
    async (req, rep) => {
      const { pageId } = req.params;
      const { pageTitle, pageContent, rev } = req.body;
      const dbs = dbService(app.dbClient);
      const rs = redirectService(app, rep);

      if (pageTitle.trim() === '') {
        return rs.homeWithFeedback(Feedbacks.E_EMPTY_TITLE);
      }

      if (pageContent.trim() === '') {
        return rs.homeWithFeedback(Feedbacks.E_EMPTY_CONTENT);
      }

      if (!rev || rev.trim() === '') {
        return rs.homeWithFeedback(Feedbacks.E_MISSING_REV);
      }

      const root = await dbs.getRootPage();

      let page = root;

      if (root && root._id !== pageId) {
        page = await dbs.getPageById(pageId);
        if (!page) {
          return rs.homeWithFeedback(Feedbacks.E_MISSING_PAGE);
        }
      }

      if (page) {
        if (pageTitle === page.pageTitle && pageContent === page.pageContent) {
          return rs.slugWithFeedback(page.pageSlug, Feedbacks.S_PAGE_UPDATED);
        }

        if (rev !== page._rev) {
          return rs.slugWithFeedback(
            page.pageSlug,
            Feedbacks.E_REV_MISMATCH_ON_SAVE
          );
        }
      }

      const newSlug = await maybeNewSlug();

      try {
        if (!page) {
          // Inserting the index page for the first time
          const newPage: PageModel = {
            _id: dbService.generateId(),
            parentId: null,
            pageTitle: req.body.pageTitle,
            pageContent: req.body.pageContent,
            pageSlug: newSlug,
            pageSlugs: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await dbs.insertPage(newPage);
        } else {
          // Updating an old index page or any other page
          await dbs.updatePage(page, {
            pageTitle: req.body.pageTitle,
            pageContent: req.body.pageContent,
            pageSlug: newSlug,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        return rs.homeWithError(error);
      }

      return rs.slugWithFeedback(newSlug, Feedbacks.S_PAGE_UPDATED);

      // The root page has always "/" as slug
      // If the title is the same as the current page, we keep the slug
      // Otherwise, we generate a new one
      async function maybeNewSlug() {
        if (!page || page.pageSlug === '/') {
          return '/';
        }

        if (pageTitle === page.pageTitle) {
          return page.pageSlug;
        }

        return await dbs.generateUniqueSlug(pageTitle);
      }
    }
  );

  app.get<{ Params: FromSchema<typeof PageParamsSchema> }>(
    '/move/:pageId',
    {
      schema: {
        params: PageParamsSchema,
      },
    },
    async (req, rep) => {
      const { pageId } = req.params;
      const dbs = dbService(app.dbClient);
      const rs = redirectService(app, rep);

      const page = await dbs.getPageById(pageId);

      if (!page) {
        return rs.homeWithFeedback(Feedbacks.E_MISSING_PAGE);
      }

      const parent = await dbs.getPageById(page.parentId!);

      if (!parent) {
        return rs.homeWithFeedback(Feedbacks.E_MISSING_PAGE);
      }

      return <MovePage page={page} parent={parent} />;
    }
  );

  app.post<{
    Body: FromSchema<typeof MovePageBodySchema>;
    Params: FromSchema<typeof PageParamsSchema>;
  }>(
    '/move/:pageId',
    {
      schema: {
        body: MovePageBodySchema,
        params: PageParamsSchema,
      },
    },
    async (req, rep) => {
      const { pageId } = req.params;
      const { newParentId } = req.body;
      const dbs = dbService(app.dbClient);
      const rs = redirectService(app, rep);

      if (newParentId === pageId) {
        return rs.homeWithFeedback(Feedbacks.E_WRONG_PARENT_PAGE);
      }

      const page = await dbs.getPageById(pageId);
      if (!page) {
        return rs.homeWithFeedback(Feedbacks.E_MISSING_PAGE);
      }

      const newParentPage = await dbs.getPageById(newParentId);
      if (!newParentPage) {
        return rs.homeWithFeedback(Feedbacks.E_MISSING_PAGE);
      }

      try {
        await dbs.updatePageParent(page, newParentId);
      } catch (error) {
        return rs.homeWithError(error);
      }

      await rs.slugWithFeedback(page.pageSlug, Feedbacks.S_PAGE_MOVED);
    }
  );

  app.post<{
    Body: FromSchema<typeof PageIdSchema>;
  }>(
    '/delete',
    {
      schema: {
        body: PageIdSchema,
      },
    },

    async (req, rep) => {
      const { pageId } = req.body;
      const rs = redirectService(app, rep);
      const dbs = dbService(app.dbClient);
      const root = await dbs.getRootPage();

      if (pageId === root!._id) {
        return rs.homeWithFeedback(Feedbacks.E_CANNOT_DELETE_INDEX);
      }

      const page = await dbs.getPageById(pageId);

      if (!page) {
        return rs.homeWithFeedback(Feedbacks.E_MISSING_PAGE);
      }

      if (!page.parentId) {
        await rs.homeWithFeedback(Feedbacks.E_MISSING_PARENT);
      }

      try {
        await dbs.deletePage(page as PageModelWithRev);
      } catch (error) {
        return rs.homeWithError(error);
      }

      return rs.homeWithFeedback(Feedbacks.S_PAGE_DELETED);
    }
  );

  // Creates a page form
  app.get<{
    Params: FromSchema<typeof SubpageParamsSchema>;
  }>(
    '/create/:parentPageId',
    {
      schema: {
        params: SubpageParamsSchema,
      },
    },
    async (req, rep) => {
      const { parentPageId } = req.params;
      const dbs = dbService(app.dbClient);
      const rs = redirectService(app, rep);
      const token = rep.generateCsrf();

      const parentPage = await dbs.getPageById(parentPageId);

      if (!parentPage) {
        return rs.homeWithFeedback(Feedbacks.E_MISSING_PARENT);
      }

      return <CreatePage parentPage={parentPage} token={token} />;
    }
  );

  // Creates a subpage. The home page is created as a special
  // case for the edit page route
  app.post<{
    Body: FromSchema<typeof PageBodySchema>;
    Params: FromSchema<typeof SubpageParamsSchema>;
  }>(
    '/create/:parentPageId',
    {
      schema: {
        body: PageBodySchema,
        params: SubpageParamsSchema,
      },
      // eslint-disable-next-line @typescript-eslint/unbound-method
      preHandler: app.csrfProtection,
    },
    async (req, rep) => {
      const { parentPageId } = req.params;
      const { pageTitle, pageContent } = req.body;
      const rs = redirectService(app, rep);
      const dbs = dbService(app.dbClient);

      if (pageTitle.trim() === '') {
        return rs.homeWithFeedback(Feedbacks.E_EMPTY_TITLE);
      }

      if (pageContent.trim() === '') {
        return rs.homeWithFeedback(Feedbacks.E_EMPTY_CONTENT);
      }

      let parentPage: PageModel | null = null;
      try {
        parentPage = await dbs.getPageById(parentPageId);
      } catch (error) {
        return rs.homeWithError(error);
      }

      if (!parentPage) {
        return rs.homeWithFeedback(Feedbacks.E_MISSING_PARENT);
      }

      const slug = await dbs.generateUniqueSlug(pageTitle);
      const now = new Date().toISOString();

      try {
        await dbs.insertPage({
          _id: dbService.generateId(),
          parentId: parentPageId,
          pageTitle,
          pageContent,
          pageSlug: slug,
          pageSlugs: [],
          updatedAt: now,
          createdAt: now,
        });
      } catch (error) {
        return rs.homeWithError(error);
      }

      return rs.slugWithFeedback(slug, Feedbacks.S_PAGE_CREATED);
    }
  );

  app.get<{
    Querystring: FromSchema<typeof SearchQuerySchema>;
  }>(
    '/search',
    {
      schema: {
        querystring: SearchQuerySchema,
      },
    },

    async (req) => {
      const { q } = req.query;
      const dbs = dbService(app.dbClient);

      const results = await dbs.searchText(q);

      if (results) {
        const snippetSize = 200;
        results.forEach((result) => {
          const textContent = cheerio
            .load(result.pageContent)
            .text()
            .toLowerCase();
          const matchIndex = textContent.indexOf(q.toLowerCase());
          if (matchIndex < 0) {
            return;
          }
          let start = matchIndex - snippetSize / 2;
          let end = matchIndex + snippetSize / 2 + q.length;
          start = start < 0 ? 0 : start;
          end = end > textContent.length ? textContent.length : end;
          result.pageContent =
            textContent.substring(start, end) +
            (end < textContent.length ? '…' : '');
        });
      }

      return <SearchResults query={q} results={results} />;
    }
  );

  app.get<{ Params: FromSchema<typeof PageParamsSchema> }>(
    '/history/:pageId',
    {
      schema: {
        params: PageParamsSchema,
      },
    },
    async (req, rep) => {
      const { pageId } = req.params;
      const dbs = dbService(app.dbClient);
      const rs = redirectService(app, rep);

      const page = await dbs.getPageById(pageId);
      if (!page) {
        return rs.homeWithFeedback(Feedbacks.E_MISSING_PAGE);
      }

      const history = await dbs.getPageHistory(page);

      return <PageHistory page={page} history={history} />;
    }
  );

  app.get<{ Params: FromSchema<typeof PageWithVersionParamsSchema> }>(
    '/history/:pageId/:version',
    {
      schema: {
        params: PageWithVersionParamsSchema,
      },
    },
    async (req, rep) => {
      const { pageId, version } = req.params;
      const dbs = dbService(app.dbClient);
      const rs = redirectService(app, rep);

      const page = await dbs.getPageById(pageId);
      if (!page) {
        return rs.homeWithFeedback(Feedbacks.E_MISSING_PAGE);
      }

      let historyItem;
      try {
        historyItem = await dbs.getPageHistoryItem(page, version);
      } catch (error) {
        return rs.slugWithFeedback(page.pageSlug, Feedbacks.E_INVALID_VERSION);
      }

      return (
        <ReadPageVersion page={page} item={historyItem} version={version} />
      );
    }
  );

  // app.get('/admin/text-index', async () => {
  //   try {
  //     app.dbClient.db
  //       ?.collection('pages')
  //       .createIndex(
  //         { pageTitle: 'text', pageContent: 'text' },
  //         { weights: { pageTitle: 10, pageContent: 1 }, name: 'PagesTextIndex' }
  //       );
  //   } catch (err) {
  //     return err;
  //   }

  //   return 'Text index generated';
  // });

  // app.get('/admin/generate-slugs', async () => {
  //   const collection = app.dbClient.db?.collection<PageModel>('pages');
  //   if (!collection) {
  //     return 'No collection found.';
  //   }

  //   const pages = await collection.find().toArray();
  //   if (!pages) {
  //     return 'No pages found.';
  //   }

  //   for (const page of pages) {
  //     if (!page.pageSlug) {
  //       const slug = await generateUniqueSlug(page.pageTitle, collection);
  //       await collection.updateOne(
  //         { _id: page._id },
  //         { $set: { pageSlug: slug, pageSlugs: [] } }
  //       );
  //     }
  //   }

  //   return 'Slugs generated for all pages';
  // });

  // app.get('/admin/schema/add-created-at', async () => {
  //   const collection = app.dbClient.db?.collection<PageModel>('pages');
  //   if (!collection) {
  //     return 'No collection found.';
  //   }

  //   const pages = await collection.find().toArray();
  //   if (!pages) {
  //     return 'No pages found.';
  //   }

  //   for (const page of pages) {
  //     if (!page.createdAt) {
  //       await collection.updateOne(
  //         { _id: page._id },
  //         { $set: { createdAt: new Date(), updatedAt: new Date() } }
  //       );
  //     }
  //   }

  //   return 'Slugs generated for all pages';
  // });

  app.setNotFoundHandler(() => {
    return <NotFound title="Page not found" />;
  });

  app.setErrorHandler(async (err, req, reply) => {
    app.log.error(err);

    if (process.env.NODE_ENV === 'test') {
      console.error(err);
    }

    // Fastify will lowercase the header name
    if (req.headers['hx-request']) {
      // If the request is a HTMX request, we send the error message as
      // a normal partial response.
      return 'An unexpected error occurred';
    } else {
      if (err.validation) {
        await reply.code(400);
        return <Error title="Request parameters are not valid." error={err} />;
      } else {
        await reply.code(500);
        return <Error title="Unhandled error" error={err} />;
      }
    }
  });
};

export default router;
