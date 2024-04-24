import { FastifyInstance } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import { INDEX_PAGE_ID } from '~/constants';
import { slugUrl } from './helpers';
import { PageModel, NavItem } from '~/types';
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
  oneOf: [
    { type: 'string', format: 'uuid' },
    { type: 'string', enum: [INDEX_PAGE_ID] },
  ],
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

const PageWithVersionParamsSchema = {
  type: 'object',
  required: ['pageId', 'version'],
  properties: {
    pageId: PageIdFormat,
    version: { type: 'number' },
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
  pageId: INDEX_PAGE_ID,
  pageTitle: 'Welcome to Joongle!',
  pageContent:
    '<p class="empty-index-placeholder">Click on the "Create this page" link to get started</p>',
  pageSlug: '',
  pageSlugs: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options, refer to https://www.fastify.dev/docs/latest/Reference/Plugins/#plugin-options
 */
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
      const dbs = dbService(app.mongo);

      let root;
      let feedbackCode;
      try {
        root = await dbs.getPageById(INDEX_PAGE_ID);
      } catch (error) {
        if (error instanceof ErrorWithFeedback) {
          feedbackCode = error.feedback.code;
        }
      }

      if (!feedbackCode) {
        feedbackCode = req.query.f;
      }

      return (
        <ReadPage page={root || DEFAULT_HOMEPAGE} feedbackCode={feedbackCode} />
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

      const results = await dbService(app.mongo).search(q);

      return (
        <>
          {results.map((result) => (
            <li>
              <a href="#" data-page-id={result.pageId}>
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
        params: PageParamsSchema,
      },
    },
    async (req) => {
      const { pageId } = req.params;
      const dbs = dbService(app.mongo);

      let root;
      try {
        root = await dbs.getPageById(INDEX_PAGE_ID);
      } catch {
        /* ignore */
      }

      if (!root) {
        return 'There are no pages';
      }

      const tree: NavItem = {
        pageId: root!.pageId,
        title: root!.pageTitle,
        link: '/',
        children: await dbs.buildMenuTree(root!.pageId),
      };

      return <Nav tree={tree} currentPageId={pageId} />;
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
      const dbs = dbService(app.mongo);

      const page = await dbs.getPageBySlug(slug);

      if (page) {
        return <ReadPage page={page} feedbackCode={feedbackCode} />;
      }

      const oldPage = await dbs.lookupPageBySlug(slug);

      if (oldPage) {
        // Redirect to the current slug
        app.log.error(`Using old slug ${slug} for page ${oldPage.pageId}`);
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
      const dbs = dbService(app.mongo);
      const rs = redirectService(app, rep);
      const token = await rep.generateCsrf();

      let page = await dbs.getPageById(pageId);
      if (!page && pageId === INDEX_PAGE_ID) {
        page = DEFAULT_HOMEPAGE;
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
      preHandler: app.csrfProtection,
    },
    async (req, rep) => {
      const { pageId } = req.params;
      const isIndex = pageId === INDEX_PAGE_ID;
      const { pageTitle, pageContent } = req.body;
      const dbs = dbService(app.mongo);
      const rs = redirectService(app, rep);

      if (pageTitle.trim() === '') {
        return rs.homeWithFeedback(Feedbacks.E_EMPTY_TITLE);
      }

      if (pageContent.trim() === '') {
        return rs.homeWithFeedback(Feedbacks.E_EMPTY_CONTENT);
      }

      const page = await dbs.getPageById(pageId);

      if (!page && !isIndex) {
        return rs.homeWithFeedback(Feedbacks.E_MISSING_PAGE);
      }

      if (page) {
        if (
          pageTitle === page!.pageTitle &&
          pageContent === page!.pageContent
        ) {
          return rs.slugWithFeedback(page!.pageSlug, Feedbacks.S_PAGE_UPDATED);
        }
      }

      const isNewIndex = !page && isIndex;
      let newSlug = '/';
      try {
        // Updating an old index page or any other page
        if (!isNewIndex) {
          newSlug = isIndex
            ? newSlug
            : await dbs.generateUniqueSlug(req.body.pageTitle);

          await dbs.updatePage(page!, {
            pageTitle: req.body.pageTitle,
            pageContent: req.body.pageContent,
            pageSlug: newSlug,
            updatedAt: new Date(),
          });
        } else {
          // Inserting the index page for the first time
          const newPage = {
            parentPageId: null,
            pageId: INDEX_PAGE_ID,
            pageTitle: req.body.pageTitle,
            pageContent: req.body.pageContent,
            pageSlug: newSlug,
            pageSlugs: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await dbs.insertPage(newPage);

          // Since this is the first page, we also generate
          // the index for the full text search
          await dbs.createTextIndex();
        }
      } catch (error) {
        return rs.homeWithError(error);
      }

      return rs.slugWithFeedback(newSlug, Feedbacks.S_PAGE_UPDATED);
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
      const dbs = dbService(app.mongo);
      const rs = redirectService(app, rep);

      const page = await dbs.getPageById(pageId);

      if (!page) {
        return rs.homeWithFeedback(Feedbacks.E_MISSING_PAGE);
      }

      const parent = await dbs.getPageById(page.parentPageId!);

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
      const dbs = dbService(app.mongo);
      const rs = redirectService(app, rep);

      if (newParentId === pageId) {
        return rs.homeWithFeedback(Feedbacks.E_WRONG_PARENT_PAGE);
      }

      const page = await dbs.getPageById(pageId);
      if (!page) {
        return rs.homeWithFeedback(Feedbacks.E_MISSING_PAGE);
      }

      const newParentpage = await dbs.getPageById(newParentId);
      if (!newParentpage) {
        return rs.homeWithFeedback(Feedbacks.E_MISSING_PAGE);
      }

      try {
        await dbs.updatePageParent(page, newParentId);
      } catch (error) {
        return rs.homeWithError(error);
      }

      rs.slugWithFeedback(page.pageSlug, Feedbacks.S_PAGE_MOVED);
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
      const dbs = dbService(app.mongo);

      if (pageId === INDEX_PAGE_ID) {
        return rs.homeWithFeedback(Feedbacks.E_CANNOT_DELETE_INDEX);
      }

      const page = await dbs.getPageById(pageId);

      if (!page) {
        return rs.homeWithFeedback(Feedbacks.E_MISSING_PAGE);
      }

      if (!page.parentPageId) {
        rs.homeWithFeedback(Feedbacks.E_MISSING_PARENT);
      }

      try {
        await dbs.deletePage(page);
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
      const dbs = dbService(app.mongo);
      const rs = redirectService(app, rep);
      const token = await rep.generateCsrf();

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
      preHandler: app.csrfProtection,
    },
    async (req, rep) => {
      const { parentPageId } = req.params;
      const { pageTitle, pageContent } = req.body;
      const rs = redirectService(app, rep);
      const dbs = dbService(app.mongo);

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
      const pageId = app.uuid.v4();
      const now = new Date();

      try {
        await dbs.insertPage({
          pageId,
          parentPageId,
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
      const dbs = dbService(app.mongo);

      const results = await dbs.searchText(q);

      if (results) {
        const snippetSize = 200;
        results.forEach((result) => {
          const textContent = cheerio.load(result.pageContent).text();
          const matchIndex = textContent.indexOf(q);
          if (matchIndex >= 0) {
            let start = matchIndex - snippetSize / 2;
            let end = matchIndex + snippetSize / 2 + q.length;
            start = start < 0 ? 0 : start;
            end = end > textContent.length ? textContent.length : end;
            result.pageContent =
              textContent.substring(start, end) +
              (end < textContent.length ? '…' : '');
          }
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
      const dbs = dbService(app.mongo);
      const rs = redirectService(app, rep);

      const page = await dbs.getPageById(pageId);
      if (!page) {
        return rs.homeWithFeedback(Feedbacks.E_MISSING_PAGE);
      }

      const history = await dbs.getPageHistory(pageId);

      return <PageHistory page={page} history={history.reverse()} />;
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
      const dbs = dbService(app.mongo);
      const rs = redirectService(app, rep);

      const page = await dbs.getPageById(pageId);
      if (!page) {
        return rs.homeWithFeedback(Feedbacks.E_MISSING_PAGE);
      }

      const historyItem = await dbs.getPageHistoryItem(pageId, version);

      if (!historyItem) {
        app.log.error(Feedbacks.E_MISSING_PAGE.message);
        return <NotFound title="Page not found" />;
      }

      return (
        <ReadPageVersion page={page} item={historyItem} version={version} />
      );
    }
  );

  // app.get('/admin/text-index', async () => {
  //   try {
  //     app.mongo.db
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
  //   const collection = app.mongo.db?.collection<PageModel>('pages');
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
  //   const collection = app.mongo.db?.collection<PageModel>('pages');
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

  app.setErrorHandler((err, req, reply) => {
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
        reply.code(400);
        return <Error title="Request parameters are not valid." error={err} />;
      } else {
        reply.code(500);
        return <Error title="Unhandled error" error={err} />;
      }
    }
  });
};

export default router;
