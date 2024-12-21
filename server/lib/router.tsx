import type { FastifyInstance } from 'fastify';
import type { FromSchema } from 'json-schema-to-ts';
import { slugUrl } from './helpers';
import type { PageModel, NavItem, PageModelWithRev } from '~/types';
import { Feedbacks } from './feedbacks';
import { load } from 'cheerio';
import { dbService } from '~/services/dbService';
import { redirectService } from '~/services/redirectService';

import { SearchResults } from '~/views/SearchResults';
import { ReadPage } from '~/views/ReadPage';
import { ReadPageVersion } from '~/views/ReadPageVersion';
import { NotFound } from '~/views/NotFound';
import { ErrorPage } from '~/views/ErrorPage';
import { EditPage } from '~/views/EditPage';
import { CreatePage } from '~/views/CreatePage';
import { MovePage } from '~/views/MovePage';
import { Nav } from '~/views/components/Nav';
import { PageHistory } from '~/views/PageHistory';
import { AppProvider } from '~/lib/context/App';
import { TitlesList } from '~/views/components/TitlesList';

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

const SearchQuerySchema = {
  type: 'object',
  required: ['q'],
  properties: {
    q: { type: 'string' },
  },
} as const;

const PageIdSchema = PageParamsSchema;

const CreatePageParamsSchema = {
  type: 'object',
  properties: {
    parentPageId: {
      anyOf: [PageIdFormat, { type: 'null' }],
    },
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
    // The old parent is optional because the root pages have no parent
    oldParentId: {
      anyOf: [PageIdFormat, { type: 'null' }],
    },
  },
} as const;

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options, refer to https://www.fastify.dev/docs/latest/Reference/Plugins/#plugin-options
 */
const router = async (app: FastifyInstance) => {
  // The home page, folks
  app.get('/', async (req) => {
    const dbs = dbService(app.dbClient);
    const isHtmx = req.headers['hx-request'];

    // We consider 3 scenarios
    // 1. No pages at all (first installation): we show the welcome page
    // 2. One or more pages exist but the landing page is not defined: we show the first page top-level page
    // 3. The landing page exists: we show the landing page

    // Do we have any page at all?
    const pageCount = await dbs.countPages();
    const settings = await dbs.getSettings();

    let landingPage: PageModel | null = null;
    if (settings.landingPageId) {
      landingPage = await dbs.getPageById(settings.landingPageId);
    } else {
      if (pageCount > 0) {
        // Decision: if there is no landing page, we show the first page
        const topLevels = await dbs.getTopLevelPages();
        landingPage = topLevels[0] || null;
      }
    }

    return (
      <AppProvider app={app}>
        {landingPage && (
          <ReadPage isFull={!isHtmx} page={landingPage} isLandingPage />
        )}
        {!landingPage && pageCount === 0 && (
          <ReadPage isFull={!isHtmx} isWelcome />
        )}
        {!landingPage && pageCount > 0 && <ReadPage isFull={!isHtmx} />}
      </AppProvider>
    );
  });

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

      return <TitlesList results={results} i18n={app.i18n} />;
    }
  );

  /* Returns the navigation menu */
  app.get<{ Params: FromSchema<typeof PageParamsSchemaOptional> }>(
    '/parts/nav/:pageId?',
    {
      schema: {
        params: PageParamsSchemaOptional,
      },
    },
    async (req) => {
      const { pageId } = req.params;
      const dbs = dbService(app.dbClient);

      let topLevels: PageModel[] = [];
      try {
        topLevels = await dbs.getTopLevelPages();
      } catch {
        /* ignore */
      }

      if (topLevels.length === 0) {
        let msg = app.i18n.t('Navigation.noRootPage');
        // FIXME This is non-sense but for some reason we may receive here a string array
        if (Array.isArray(msg)) {
          msg = msg.join('');
        }
        return msg;
      }

      // We build a tree for each of the top-level pages
      const forest: NavItem[] = [];
      for (const topLevel of topLevels) {
        forest.push({
          pageId: topLevel._id,
          title: topLevel.pageTitle,
          link: slugUrl(topLevel.pageSlug),
          children: await dbs.buildMenuTree(topLevel._id),
        });
      }

      // Use this await to simulate a slow connection
      // await new Promise((resolve) => setTimeout(resolve, 1000));

      return <Nav forest={forest} currentPageId={pageId || ''} />;
    }
  );

  app.get<{
    Params: FromSchema<typeof PageSlugParamsSchema>;
  }>(
    '/page/:slug',
    {
      schema: {
        params: PageSlugParamsSchema,
      },
    },
    async (req, rep) => {
      const { slug } = req.params;
      const dbs = dbService(app.dbClient);
      const isHtmx = req.headers['hx-request'];

      const page = await dbs.getPageBySlug(slug);

      if (page) {
        return (
          <AppProvider app={app}>
            <ReadPage isFull={!isHtmx} page={page} />
          </AppProvider>
        );
      }

      const oldPage = await dbs.lookupPageBySlug(slug);

      if (oldPage) {
        // Redirect to the current slug
        app.log.error(`Using old slug ${slug} for page ${oldPage._id}`);
        return rep.redirect(slugUrl(oldPage.pageSlug), 301);
      }

      app.log.error(Feedbacks.E_MISSING_PAGE.message);
      return (
        <AppProvider app={app}>
          <NotFound title={app.i18n.t('Error.pageNotFound')} />
        </AppProvider>
      );
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

      const page = await dbs.getPageById(pageId);

      if (!page) {
        return rs.homeWithFeedback(Feedbacks.E_MISSING_PAGE);
      }

      return (
        <AppProvider app={app}>
          <EditPage page={page} token={token} />
        </AppProvider>
      );
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

      const page = await dbs.getPageById(pageId);
      if (!page) {
        return rs.homeWithFeedback(Feedbacks.E_MISSING_PAGE);
      }

      if (pageTitle === page.pageTitle && pageContent === page.pageContent) {
        return rs.slugWithFeedback(page.pageSlug, Feedbacks.S_PAGE_UPDATED);
      }

      // Ensure we are updating the correct revision
      if (rev !== page._rev) {
        return rs.slugWithFeedback(
          page.pageSlug,
          Feedbacks.E_REV_MISMATCH_ON_SAVE
        );
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

      // If the title is the same as the current page, we keep the slug
      // Otherwise, we generate a new one
      async function maybeNewSlug() {
        if (!page) {
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

      let parent: PageModel | null = null;
      if (page.parentId) {
        parent = await dbs.getPageById(page.parentId ?? '');

        if (!parent) {
          return rs.homeWithFeedback(Feedbacks.E_MISSING_PAGE);
        }
      }

      return (
        <AppProvider app={app}>
          <MovePage page={page} parent={parent} />
        </AppProvider>
      );
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
      const { newParentId, oldParentId } = req.body;
      const dbs = dbService(app.dbClient);
      const rs = redirectService(app, rep);

      // Can't move a page to itself
      if (newParentId === pageId) {
        return rs.homeWithFeedback(Feedbacks.E_WRONG_PARENT_PAGE);
      }

      // Can't move a non-existing page
      const page = await dbs.getPageById(pageId);
      if (!page) {
        return rs.homeWithFeedback(Feedbacks.E_MISSING_PAGE);
      }

      // Can't move a page to a non-existing parent
      const newParentPage = await dbs.getPageById(newParentId);
      if (!newParentPage) {
        return rs.homeWithFeedback(Feedbacks.E_MISSING_PAGE);
      }

      // Double-check that if the old parent is not provided, we really want to move a top-level page
      if (!oldParentId && page.parentId) {
        return rs.homeWithFeedback(Feedbacks.E_WRONG_PARENT_PAGE);
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
    Params: FromSchema<typeof CreatePageParamsSchema>;
  }>(
    '/create/:parentPageId?',
    {
      schema: {
        params: CreatePageParamsSchema,
      },
    },
    async (req, rep) => {
      const { parentPageId } = req.params;
      const dbs = dbService(app.dbClient);
      const rs = redirectService(app, rep);
      const token = rep.generateCsrf();

      let parentPage: PageModel | null = null;
      if (parentPageId) {
        try {
          parentPage = await dbs.getPageById(parentPageId);
          if (!parentPage) {
            return rs.homeWithFeedback(Feedbacks.E_MISSING_PARENT);
          }
        } catch (error) {
          return rs.homeWithError(error);
        }
      }

      return (
        <AppProvider app={app}>
          <CreatePage parentPage={parentPage} token={token} />
        </AppProvider>
      );
    }
  );

  // Creates a subpage. The home page is created as a special
  // case for the edit page route
  app.post<{
    Body: FromSchema<typeof PageBodySchema>;
    Params: FromSchema<typeof CreatePageParamsSchema>;
  }>(
    '/create/:parentPageId',
    {
      schema: {
        body: PageBodySchema,
        params: CreatePageParamsSchema,
      },
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
      if (parentPageId) {
        try {
          parentPage = await dbs.getPageById(parentPageId);
          if (!parentPage) {
            return rs.homeWithFeedback(Feedbacks.E_MISSING_PARENT);
          }
        } catch (error) {
          return rs.homeWithError(error);
        }
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
          const textContent = load(result.pageContent).text().toLowerCase();
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

      return (
        <AppProvider app={app}>
          <SearchResults query={q} results={results} />
        </AppProvider>
      );
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

      return (
        <AppProvider app={app}>
          <PageHistory page={page} history={history} />
        </AppProvider>
      );
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

      let historyItem: PageModel | undefined;
      try {
        historyItem = await dbs.getPageHistoryItem(page, version);
      } catch (error) {
        return rs.slugWithFeedback(page.pageSlug, Feedbacks.E_INVALID_VERSION);
      }

      return (
        <AppProvider app={app}>
          <ReadPageVersion page={page} item={historyItem} version={version} />
        </AppProvider>
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
    return (
      <AppProvider app={app}>
        <NotFound title={app.i18n.t('Error.pageNotFound')} />
      </AppProvider>
    );
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
      return app.i18n.t('Error.unexpectedError');
    }

    if (err.validation) {
      reply.code(400);
      return (
        <AppProvider app={app}>
          <ErrorPage
            title={app.i18n.t('Error.invalidParameters')}
            error={err}
          />
        </AppProvider>
      );
    }

    reply.code(500);
    return (
      <AppProvider app={app}>
        <ErrorPage title={app.i18n.t('Error.unhandledError')} error={err} />
      </AppProvider>
    );
  });
};

export default router;
