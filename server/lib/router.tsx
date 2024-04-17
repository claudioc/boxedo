import { FastifyInstance, FastifyReply } from 'fastify';
import { ReadPage } from '~/views/ReadPage';
import { NotFound } from '~/views/NotFound';
import { Error } from '~/views/Error';
import { EditPage } from '~/views/EditPage';
import { CreatePage } from '~/views/CreatePage';
import { MovePage } from '~/views/MovePage';
import { Nav } from '~/views/components/Nav';
import { FromSchema } from 'json-schema-to-ts';
import { SearchResults } from '~/views/SearchResults';
import { INDEX_PAGE_ID } from '~/constants';
import { pageUrl, pathWithFeedback } from './helpers';
import { Feedback, PageModel, NavItem } from '~/types';
import { Feedbacks } from './feedbacks';
import cheerio from 'cheerio';
import slugify from 'slugify';
import { Collection, UpdateFilter } from 'mongodb';

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
    async (req, rep) => {
      const collection = app.mongo.db?.collection<PageModel>('pages');
      if (!assertCollection(collection, app)) {
        return redirectHome(rep, Feedbacks.E_MISSING_DB, app);
      }

      const root = await getPageById(collection!, INDEX_PAGE_ID);
      const { f: feedbackCode } = req.query;

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
    async (req, rep) => {
      const { q } = req.query;

      if (q.length < 3) {
        return '';
      }

      const collection = app.mongo.db?.collection<PageModel>('pages');
      if (!assertCollection(collection, app)) {
        return redirectHome(rep, Feedbacks.E_MISSING_DB, app);
      }

      const results = await collection!
        .find({ pageTitle: { $regex: q, $options: 'i' } })
        .limit(25)
        .toArray();

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
      const collection = app.mongo.db?.collection<PageModel>('pages');
      if (!assertCollection(collection, app)) {
        return Feedbacks.E_MISSING_DB.message;
      }

      const root = await getPageById(collection!, INDEX_PAGE_ID);

      if (!root) {
        return 'There are no pages';
      }

      const tree: NavItem = {
        pageId: root.pageId,
        title: root.pageTitle,
        link: '/',
        children: await buildMenuTree(collection!, root.pageId),
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

      const collection = app.mongo.db?.collection<PageModel>('pages');
      if (!assertCollection(collection, app)) {
        return redirectHome(rep, Feedbacks.E_MISSING_DB, app);
      }

      const page = await collection!.findOne({ pageSlug: slug });

      if (!page) {
        // Check if the slug is in the pageSlugs of any document
        const oldPage = await collection!.findOne({
          pageSlugs: { $in: [slug] },
        });

        if (oldPage) {
          // Redirect to the current slug
          app.log.error(`Using old slug ${slug} for page ${oldPage.pageId}`);
          return rep.redirect(301, pageUrl(oldPage.pageSlug));
        }

        app.log.error(Feedbacks.E_MISSING_PAGE.message);
        return <NotFound title="Page not found" />;
      }
      return <ReadPage page={page} feedbackCode={feedbackCode} />;
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

      const collection = app.mongo.db?.collection<PageModel>('pages');
      if (!assertCollection(collection, app)) {
        return redirectHome(rep, Feedbacks.E_MISSING_DB, app);
      }

      let page = await getPageById(collection!, pageId);
      if (!page && pageId === INDEX_PAGE_ID) {
        page = DEFAULT_HOMEPAGE;
      }

      if (!page) {
        return redirectHome(rep, Feedbacks.E_MISSING_PAGE, app);
      }

      return <EditPage page={page} />;
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
    },
    async (req, rep) => {
      const { pageId } = req.params;
      const isIndex = pageId === INDEX_PAGE_ID;

      const collection = app.mongo.db?.collection<PageModel>('pages');
      if (!assertCollection(collection, app)) {
        return redirectHome(rep, Feedbacks.E_MISSING_DB, app);
      }

      const page = await getPageById(collection!, pageId);

      if (!page && !isIndex) {
        return redirectHome(rep, Feedbacks.E_MISSING_PAGE, app);
      }

      const isNewIndex = !page && isIndex;
      let newSlug = '';
      try {
        if (!isNewIndex) {
          const options: UpdateFilter<PageModel> = {
            $set: {
              pageTitle: req.body.pageTitle,
              pageContent: req.body.pageContent,
              updatedAt: new Date(),
            },
          };

          // No need to update the slug if it's the index page
          if (!isIndex) {
            newSlug = await generateUniqueSlug(req.body.pageTitle, collection!);

            if (page!.pageSlug !== newSlug) {
              options.$push = { pageSlugs: page!.pageSlug };
              options.$set = { ...options.$set, pageSlug: newSlug };
            }
          }

          await collection!.updateOne({ _id: page!._id }, options);
        } else {
          const newPage = {
            parentPageId: null,
            pageId: INDEX_PAGE_ID,
            pageTitle: req.body.pageTitle,
            pageContent: req.body.pageContent,
            pageSlug: 'home',
            pageSlugs: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await (collection as unknown as Collection).insertOne(newPage);
        }
      } catch (error) {
        return redirectHome(rep, Feedbacks.E_UPDATING_PAGE, app);
      }

      return rep.redirect(
        303,
        pathWithFeedback(isIndex ? '/' : newSlug, Feedbacks.S_PAGE_UPDATED)
      );
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

      const collection = app.mongo.db?.collection<PageModel>('pages');
      if (!assertCollection(collection, app)) {
        return redirectHome(rep, Feedbacks.E_MISSING_DB, app);
      }

      const page = await getPageById(collection!, pageId);

      if (!page) {
        return redirectHome(rep, Feedbacks.E_MISSING_PAGE, app);
      }

      const parent = await getPageById(collection!, page.parentPageId!);

      if (!parent) {
        return redirectHome(rep, Feedbacks.E_MISSING_PAGE, app);
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

      if (newParentId === pageId) {
        return redirectHome(rep, Feedbacks.E_WRONG_PARENT_PAGE, app);
      }

      const collection = app.mongo.db?.collection<PageModel>('pages');
      if (!assertCollection(collection, app)) {
        return redirectHome(rep, Feedbacks.E_MISSING_DB, app);
      }

      const page = await getPageById(collection!, pageId);
      if (!page) {
        return redirectHome(rep, Feedbacks.E_MISSING_PAGE, app);
      }

      const newParentpage = await getPageById(collection!, newParentId);
      if (!newParentpage) {
        return redirectHome(rep, Feedbacks.E_MISSING_PAGE, app);
      }

      const options: UpdateFilter<PageModel> = {
        $set: {
          parentPageId: newParentId,
        },
      };

      try {
        await collection!.updateOne({ _id: page._id }, options);
      } catch (error) {
        return redirectHome(rep, Feedbacks.E_UPDATING_PAGE, app);
      }

      return rep.redirect(
        303,
        pathWithFeedback(pageUrl(page.pageSlug), Feedbacks.S_PAGE_MOVED)
      );
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

      if (pageId === INDEX_PAGE_ID) {
        return redirectHome(rep, Feedbacks.E_CANNOT_DELETE_INDEX, app);
      }

      const collection = app.mongo.db?.collection<PageModel>('pages');
      if (!assertCollection(collection, app)) {
        return redirectHome(rep, Feedbacks.E_MISSING_DB, app);
      }

      const page = await getPageById(collection!, pageId);

      if (!page) {
        return redirectHome(rep, Feedbacks.E_MISSING_PAGE, app);
      }

      const parentId = page.parentPageId;

      if (!parentId) {
        redirectHome(rep, Feedbacks.E_MISSING_PARENT, app);
      }

      try {
        await collection!.deleteOne({ pageId });
        await collection!.updateMany(
          { parentPageId: pageId },
          { $set: { parentPageId: parentId } }
        );
      } catch (error) {
        return redirectHome(rep, Feedbacks.E_DELETING_PAGE, app);
      }

      return redirectHome(rep, Feedbacks.S_PAGE_DELETED, app);
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

      const collection = app.mongo.db?.collection<PageModel>('pages');
      if (!assertCollection(collection, app)) {
        return redirectHome(rep, Feedbacks.E_MISSING_DB, app);
      }

      const parentPage = await getPageById(collection!, parentPageId);

      if (!parentPage) {
        return redirectHome(rep, Feedbacks.E_MISSING_PARENT, app);
      }

      return <CreatePage parentPage={parentPage} />;
    }
  );

  // Creates a page
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
    },
    async (req, rep) => {
      const { parentPageId } = req.params;
      const { pageTitle, pageContent } = req.body;

      // TODO: validation should also be done on the client side
      if (pageTitle.trim() === '') {
        return redirectHome(rep, Feedbacks.E_EMPTY_TITLE, app);
      }

      if (pageContent.trim() === '') {
        return redirectHome(rep, Feedbacks.E_EMPTY_CONTENT, app);
      }

      const collection = app.mongo.db?.collection<PageModel>('pages');
      if (!assertCollection(collection, app)) {
        return redirectHome(rep, Feedbacks.E_MISSING_DB, app);
      }

      const parentPage = await getPageById(collection!, parentPageId);

      if (!parentPage) {
        return redirectHome(rep, Feedbacks.E_MISSING_PARENT, app);
      }

      const slug = await generateUniqueSlug(pageTitle, collection!);
      const pageId = app.uuid.v4();
      const now = new Date();
      try {
        await (collection as unknown as Collection).insertOne({
          pageId,
          parentPageId,
          pageTitle,
          pageContent,
          pageSlug: slug,
          updatedAt: now,
          createdAt: now,
        });
      } catch (error) {
        return redirectHome(rep, Feedbacks.E_CREATING_PAGE, app);
      }

      return rep.redirect(
        303,
        pathWithFeedback(pageUrl(slug), Feedbacks.S_PAGE_CREATED)
      );
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

    async (req, rep) => {
      const { q } = req.query;

      const collection = app.mongo.db?.collection<PageModel>('pages');
      if (!assertCollection(collection, app)) {
        return redirectHome(rep, Feedbacks.E_MISSING_DB, app);
      }

      const results = await collection!
        .find({ $text: { $search: q } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(25)
        .toArray();

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

  app.get('/admin/text-index', async () => {
    try {
      app.mongo.db
        ?.collection('pages')
        .createIndex(
          { pageTitle: 'text', pageContent: 'text' },
          { weights: { pageTitle: 10, pageContent: 1 }, name: 'PagesTextIndex' }
        );
    } catch (err) {
      return err;
    }

    return 'Text index generated';
  });

  app.get('/admin/generate-slugs', async () => {
    const collection = app.mongo.db?.collection<PageModel>('pages');
    if (!collection) {
      return 'No collection found.';
    }

    const pages = await collection.find().toArray();
    if (!pages) {
      return 'No pages found.';
    }

    for (const page of pages) {
      if (!page.pageSlug) {
        const slug = await generateUniqueSlug(page.pageTitle, collection);
        await collection.updateOne(
          { _id: page._id },
          { $set: { pageSlug: slug, pageSlugs: [] } }
        );
      }
    }

    return 'Slugs generated for all pages';
  });

  app.get('/admin/schema/add-created-at', async () => {
    const collection = app.mongo.db?.collection<PageModel>('pages');
    if (!collection) {
      return 'No collection found.';
    }

    const pages = await collection.find().toArray();
    if (!pages) {
      return 'No pages found.';
    }

    for (const page of pages) {
      if (!page.createdAt) {
        await collection.updateOne(
          { _id: page._id },
          { $set: { createdAt: new Date(), updatedAt: new Date() } }
        );
      }
    }

    return 'Slugs generated for all pages';
  });

  app.setNotFoundHandler(() => {
    return <NotFound title="Page not found" />;
  });

  app.setErrorHandler((err, req, reply) => {
    app.log.error(err);

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

const generateUniqueSlug = async (
  pageTitle: string,
  collection: Collection<PageModel>
) => {
  // Check if the slug doesn't already exist
  let slug = slugify(pageTitle, { lower: true });
  let uniqueSlugFound = false;
  let counter = 1;

  // TODO: needs also to check for uniqueness in the pageSlugs array
  while (!uniqueSlugFound) {
    const existingPageWithSlug = await collection.findOne({ pageSlug: slug });
    if (existingPageWithSlug) {
      // If there's a conflict, append a number to the slug
      slug = `${slugify(pageTitle, { lower: true })}-${counter}`;
      counter++;
    } else {
      uniqueSlugFound = true;
    }
  }

  return slug;
};

const redirectHome = (
  res: FastifyReply,
  feedback: Feedback,
  app?: FastifyInstance
) => {
  if (app) {
    app.log.error(feedback.message);
  }
  return res.redirect(303, pathWithFeedback('/', feedback));
};

async function buildMenuTree(
  collection: Collection<PageModel>,
  parentId: string
): Promise<NavItem[]> {
  const pages = await collection
    .find({ parentPageId: parentId }, PageWithoutContentProjection)
    .toArray();

  const menuTree = [];
  for (const page of pages) {
    const menuItem: NavItem = {
      pageId: page.pageId,
      title: page.pageTitle,
      link: pageUrl(page.pageSlug),
      children: await buildMenuTree(collection, page.pageId),
    };

    menuTree.push(menuItem);
  }

  return menuTree;
}

const assertCollection = (
  collection: Collection<PageModel> | undefined,
  app: FastifyInstance
) => {
  if (collection) {
    return true;
  }

  const fb = Feedbacks.E_MISSING_DB;
  app.log.error(fb.message);
  return false;
};

const getPageById = async (
  collection: Collection<PageModel>,
  pageId: string
) => {
  return await collection.findOne<PageModel>({ pageId });
};

export default router;
