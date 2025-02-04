import type { FastifyInstance } from 'fastify';
import type { FromSchema } from 'json-schema-to-ts';
import { pathWithFeedback, slugUrl } from './helpers';
// import { setTimeout as delay } from 'node:timers/promises';
import type {
  PageModel,
  NavItem,
  PageModelWithRev,
  FileModel,
  FileAttachmentModel,
} from '~/../types';
import { Feedbacks } from './feedbacks';
import { load } from 'cheerio';
import { dbService } from '~/services/dbService';
import { redirectService } from '~/services/redirectService';
import { RouterSchemas as RS } from './routerSchemas';
import { SearchResults } from '~/views/SearchResults';
import { ReadPage } from '~/views/ReadPage';
import { SettingsPage } from '~/views/SettingsPage';
import { ReadPageVersion } from '~/views/ReadPageVersion';
import { NotFound } from '~/views/NotFound';
import { ErrorPage } from '~/views/ErrorPage';
import { EditPage } from '~/views/EditPage';
import { LoginPage } from '~/views/LoginPage';
import { CreatePage } from '~/views/CreatePage';
import { MovePage } from '~/views/MovePage';
import { Nav } from '~/views/components/Nav';
import { PageHistory } from '~/views/PageHistory';
import { TitlesList } from '~/views/components/TitlesList';
import {
  MAX_IMAGE_DIMENSION,
  MAX_IMAGE_SIZE,
  JPEG_QUALITY,
  NAVIGATION_CACHE_KEY,
  MAGIC_TOKEN_EXPIRATION_MINUTES,
} from '~/constants';
import sharp from 'sharp';
import { Readable } from 'node:stream';

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options, refer to https://www.fastify.dev/docs/latest/Reference/Plugins/#plugin-options
 */
const router = async (app: FastifyInstance) => {
  // The home page, folks
  app.get('/', async (req, rep) => {
    const dbs = dbService(app.dbClient);
    const isHtmx = req.headers['hx-request'];
    const { settings } = app;

    // We consider 3 scenarios
    // 1. No pages at all (first installation): we show the welcome page
    // 2. One or more pages exist but the landing page is not defined: we show the first page top-level page
    // 3. The landing page exists: we show the landing page

    // Do we have any page at all?
    const pageCount = await dbs.countPages();

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

    rep.html(
      <>
        {landingPage && (
          <ReadPage
            app={app}
            isFull={!isHtmx}
            page={landingPage}
            isLandingPage
          />
        )}
        {!landingPage && pageCount === 0 && (
          <ReadPage app={app} isFull={!isHtmx} isWelcome isLandingPage />
        )}
        {!landingPage && pageCount > 0 && (
          <ReadPage app={app} isFull={!isHtmx} />
        )}
      </>
    );
  });

  app.get('/auth/login', async (_req, rep) => {
    rep.html(<LoginPage app={app} token={rep.generateCsrf()} />);
  });

  app.post<{
    Body: FromSchema<typeof RS.LoginBody>;
  }>(
    '/auth/login',
    {
      schema: {
        body: RS.LoginBody,
      },
      preHandler: app.csrfProtection,
    },
    async (req, rep) => {
      const { email } = req.body;
      const dbs = dbService(app.dbClient);
      const { i18n, settings, config } = app;

      const user = await dbs.getUserByEmail(email);
      if (!user) {
        return rep.redirect(
          pathWithFeedback('/auth/login', Feedbacks.E_USER_NOT_FOUND)
        );
      }

      const magicData = await dbs.createMagic(
        email,
        MAGIC_TOKEN_EXPIRATION_MINUTES
      );

      const emailMessage = {
        from: {
          name: settings.siteTitle,
          email: config.EMAIL_FROM_EMAIL ?? '',
        },
        to: { name: user.name, email: user.email },
        subject: i18n.t('Login.emailMagicLinkSubject', {
          siteTitle: settings.siteTitle,
        }),
        text: i18n.t('Login.emailMagicLinkText', {
          magicLink: `${config.BASE_EXTERNAL_URL}/auth/magic/${magicData._id}`,
        }),
      };

      app.emailService.sendEmail(emailMessage);

      return rep.redirect(
        pathWithFeedback('/auth/login', Feedbacks.S_MAGIC_LINK_SENT)
      );
    }
  );

  app.get<{
    Params: FromSchema<typeof RS.MagicLinkParams>;
  }>(
    '/auth/magic/:magicId',
    {
      schema: {
        params: RS.MagicLinkParams,
      },
    },
    async (req, rep) => {
      const rs = redirectService(app, rep);
      const dbs = dbService(app.dbClient);
      const magicId = req.params.magicId;
      const { i18n } = app;

      const pass = await dbs.validateMagic(magicId);

      if (pass) {
        return rs.homeWithFeedback(Feedbacks.S_LOGIN_SUCCESS);
      }

      const error = i18n.t('Login.magicLinkInvalid', {
        aNewOne: (
          <a class="is-link" href="/auth/login">
            {i18n.t('Login.aNewOne')}
          </a>
        ),
      });

      rep
        .code(401)
        .html(
          <ErrorPage
            app={app}
            title={i18n.t('Error.unauthorized')}
            error={error}
            goHome={false}
          />
        );
    }
  );

  app.get(
    '/settings',

    async (_, rep) => {
      const dbs = dbService(app.dbClient);
      const { settings } = app;

      let landingPage: PageModel | null = null;
      if (settings.landingPageId) {
        landingPage = await dbs.getPageById(settings.landingPageId);
      }

      rep.header('Cache-Control', 'no-cache, no-store, must-revalidate');

      rep.html(
        <SettingsPage app={app} settings={settings} landingPage={landingPage} />
      );
    }
  );

  app.post<{
    Body: FromSchema<typeof RS.SettingsPageBody>;
  }>(
    '/settings',
    {
      schema: {
        body: RS.SettingsPageBody,
      },
    },
    async (req, rep) => {
      const { landingPageId, siteLang, siteTitle } = req.body;
      const dbs = dbService(app.dbClient);
      const rs = redirectService(app, rep);
      const { settings } = app;

      if (landingPageId) {
        if (settings.landingPageId !== landingPageId) {
          // Can't use a non-existing landing page
          const page = await dbs.getPageById(landingPageId);
          if (!page) {
            return rs.homeWithFeedback(Feedbacks.E_MISSING_PAGE);
          }
          settings.landingPageId = landingPageId;
        }
      }

      settings.siteLang = siteLang;
      settings.siteTitle = siteTitle;

      app.i18n.switchTo(siteLang);

      app.settings = settings;

      try {
        await dbs.updateSettings(settings);
      } catch (error) {
        return rs.homeWithError(error);
      }

      return rs.homeWithFeedback(Feedbacks.S_SETTINGS_UPDATED);
    }
  );

  app.get<{
    Querystring: FromSchema<typeof RS.SearchQuery>;
  }>(
    '/parts/titles',
    {
      schema: {
        querystring: RS.SearchQuery,
      },
    },
    async (req, rep) => {
      const { q } = req.query;

      if (q.length < 3 || q.length > 50) {
        return '';
      }

      const results = await dbService(app.dbClient).search(q);

      rep.html(<TitlesList results={results} i18n={app.i18n} />);
    }
  );

  /* Returns the navigation menu */
  app.get<{ Params: FromSchema<typeof RS.PageParamsOptional> }>(
    '/parts/nav/:pageId?',
    {
      schema: {
        params: RS.PageParamsOptional,
      },
    },
    async (req, rep) => {
      const { pageId } = req.params;
      const dbs = dbService(app.dbClient);

      let forest: NavItem[] = [];
      const cached = app.cache.get<NavItem[]>(NAVIGATION_CACHE_KEY);

      if (cached) {
        forest = cached.data;
      } else {
        let topLevels: PageModel[] = [];
        try {
          topLevels = await dbs.getTopLevelPages();
        } catch {
          /* ignore */
        }

        if (topLevels.length === 0) {
          app.cache.reset(NAVIGATION_CACHE_KEY);
          return '';
        }

        // We build a tree for each of the top-level pages
        for (const topLevel of topLevels) {
          forest.push({
            pageId: topLevel._id,
            title: topLevel.pageTitle,
            link: slugUrl(topLevel.pageSlug),
            position: topLevel.position,
            children: await dbs.buildMenuTree(topLevel._id),
          });
        }

        app.cache.set(NAVIGATION_CACHE_KEY, forest);
      }

      rep.header('Cache-Control', 'no-store');

      // Use this await to simulate a slow connection
      // await delay(1000);

      rep.html(
        <Nav
          forest={forest}
          currentPageId={
            // Don't highlight the landing page in the menu
            pageId && app.settings.landingPageId !== pageId ? pageId : ''
          }
        />
      );
    }
  );

  app.get<{
    Params: FromSchema<typeof RS.PageSlugParams>;
  }>(
    '/view/:slug',
    {
      schema: {
        params: RS.PageSlugParams,
      },
    },
    async (req, rep) => {
      const { slug } = req.params;
      const dbs = dbService(app.dbClient);
      const isHtmx = req.headers['hx-request'];

      const page = await dbs.getPageBySlug(slug);

      if (page) {
        // These are useful for testing purposes
        rep.header('x-page-id', page._id);
        rep.header('x-parent-id', page.parentId ?? '');
        rep.header('x-rev', page._rev);

        return rep.html(<ReadPage app={app} isFull={!isHtmx} page={page} />);
      }

      const oldPage = await dbs.lookupPageBySlug(slug);

      if (oldPage) {
        // Redirect to the current slug
        app.log.error(`Using old slug ${slug} for page ${oldPage._id}`);
        return rep.redirect(slugUrl(oldPage.pageSlug), 301);
      }

      app.log.error(Feedbacks.E_MISSING_PAGE.message);
      rep
        .code(404)
        .html(<NotFound app={app} title={app.i18n.t('Error.pageNotFound')} />);
    }
  );

  app.get<{ Params: FromSchema<typeof RS.PageParams> }>(
    '/pages/:pageId/edit',
    {
      schema: {
        params: RS.PageParams,
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

      rep.header('Cache-Control', 'no-cache, no-store, must-revalidate');

      rep.html(<EditPage app={app} page={page} token={token} />);
    }
  );

  app.post<{
    Body: FromSchema<typeof RS.PageBody>;
    Params: FromSchema<typeof RS.PageParams>;
  }>(
    '/pages/:pageId/edit',
    {
      schema: {
        body: RS.PageBody,
        params: RS.PageParams,
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
        await dbs.updatePageContent(page, {
          pageTitle: req.body.pageTitle,
          pageContent: req.body.pageContent,
          pageSlug: newSlug,
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        return rs.homeWithError(error);
      }

      app.cache.reset(NAVIGATION_CACHE_KEY);

      // await delay(2000);

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

  app.get<{ Params: FromSchema<typeof RS.PageParams> }>(
    '/pages/:pageId/move',
    {
      schema: {
        params: RS.PageParams,
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

      rep.html(<MovePage app={app} page={page} parent={parent} />);
    }
  );

  app.post<{
    Body: FromSchema<typeof RS.MovePageBody>;
    Params: FromSchema<typeof RS.PageParams>;
  }>(
    '/pages/:pageId/move',
    {
      schema: {
        body: RS.MovePageBody,
        params: RS.PageParams,
      },
    },
    async (req, rep) => {
      const { pageId } = req.params;
      const { newParentId, moveToTop } = req.body;
      const dbs = dbService(app.dbClient);
      const rs = redirectService(app, rep);

      let parentId = newParentId ?? null;
      // Yes, test the string and not the boolean
      if (moveToTop === 'true') {
        parentId = null;
      }

      if (moveToTop === 'false' && !parentId) {
        // Something is wrong
        return rs.homeWithFeedback(Feedbacks.E_WRONG_PARENT_PAGE);
      }

      // Can't move a page to itself
      if (parentId === pageId) {
        return rs.homeWithFeedback(Feedbacks.E_WRONG_PARENT_PAGE);
      }

      // Can't move a non-existing page
      const page = await dbs.getPageById(pageId);
      if (!page) {
        return rs.homeWithFeedback(Feedbacks.E_MISSING_PAGE);
      }

      if (page.parentId === parentId) {
        // Nothing to do here
        return rs.slugWithFeedback(page.pageSlug, Feedbacks.S_PAGE_MOVED);
      }

      // Can't move a page to a non-existing parent
      if (parentId) {
        const newParentPage = await dbs.getPageById(parentId);
        if (!newParentPage) {
          return rs.homeWithFeedback(Feedbacks.E_MISSING_PAGE);
        }
      }

      const position = await dbs.findInsertPosition(parentId);

      try {
        await dbs.changePageParent(page, parentId, position);
      } catch (error) {
        return rs.homeWithError(error);
      }

      app.cache.reset(NAVIGATION_CACHE_KEY);

      await rs.slugWithFeedback(page.pageSlug, Feedbacks.S_PAGE_MOVED);
    }
  );

  app.post<{
    Body: FromSchema<typeof RS.ReorderPageBody>;
    Params: FromSchema<typeof RS.PageParams>;
  }>(
    '/pages/:pageId/reorder',
    {
      schema: {
        body: RS.ReorderPageBody,
        params: RS.PageParams,
      },
    },
    async (req, rep) => {
      const { pageId } = req.params;
      const { targetIndex } = req.body;
      const dbs = dbService(app.dbClient);
      const rs = redirectService(app, rep);

      const page = await dbs.getPageById(pageId);
      if (!page) {
        return rs.homeWithFeedback(Feedbacks.E_MISSING_PAGE);
      }

      const position = await dbs.findInsertPosition(
        page.parentId ?? null,
        targetIndex,
        pageId
      );

      try {
        await dbs.updatePagePosition(page, position);
      } catch (error) {
        app.log.error(error);
        return rep.status(500);
      }

      app.cache.reset(NAVIGATION_CACHE_KEY);

      return rep.status(204).send();
    }
  );

  app.post<{
    Params: FromSchema<typeof RS.PageParams>;
  }>(
    '/pages/:pageId/delete',
    {
      schema: {
        params: RS.PageParams,
      },
    },

    async (req, rep) => {
      const { pageId } = req.params;
      const rs = redirectService(app, rep);
      const dbs = dbService(app.dbClient);

      const page = await dbs.getPageById(pageId);

      if (!page) {
        return rs.homeWithFeedback(Feedbacks.E_MISSING_PAGE);
      }

      try {
        await dbs.deletePage(page as PageModelWithRev);
      } catch (error) {
        return rs.homeWithError(error);
      }

      app.cache.reset(NAVIGATION_CACHE_KEY);

      return rs.homeWithFeedback(Feedbacks.S_PAGE_DELETED);
    }
  );

  // Decision: each upload will create a single "file" document in CouchDB, and each File document
  // will have a single attachment, even though in theory CouchDB supports multiple attachments per document.
  // Each attachment in a file document is identified by its filename and since there is only one attachment
  // per file, the fileId is also a loose reference to the attachment itself.
  // An alternative approach is to use the attachments for each _page_ document, but this would delete all the
  // attachments if the page is deleted. This is not a problem for the current implementation (because there is
  // now way at the moment to share an uploaded file), but in the future a media explorer could be implemented.
  app.post('/uploads', async (req, rep) => {
    const rs = redirectService(app, rep);
    const dbs = dbService(app.dbClient);

    if (!req.isMultipart()) {
      return rs.bailWithError(
        400,
        'Invalid file type. Please upload an image.'
      );
    }

    const options = { limits: { fileSize: MAX_IMAGE_SIZE, files: 1 } };
    const data = await req.file(options);
    if (!data) {
      return rs.bailWithError(
        400,
        'Invalid file type. Please upload an image.'
      );
    }

    // Check if it's an image
    if (!data.mimetype.startsWith('image/')) {
      return rs.bailWithError(
        400,
        'Invalid file type. Please upload an image.'
      );
    }

    // await delay(2000);

    let buffer: Buffer;
    try {
      buffer = await data.toBuffer();
    } catch (err) {
      app.log.error('Something wrong reading the image buffer');
      app.log.error(err);
      return rep.send(app.multipartErrors.RequestFileTooLargeError());
    }

    const imageInfo = await sharp(buffer).metadata();

    // Determine if resizing is needed
    const needsResize =
      (imageInfo.width || 0) > MAX_IMAGE_DIMENSION ||
      (imageInfo.height || 0) > MAX_IMAGE_DIMENSION;

    // Process image if needed
    let processedBuffer = buffer;
    let finalMimeType = data.mimetype;
    if (needsResize) {
      processedBuffer = await sharp(buffer)
        .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
          withoutEnlargement: true, // Don't upscale smaller images
          fit: 'inside', // Maintain aspect ratio
        })
        .jpeg({ quality: JPEG_QUALITY }) // Convert to JPEG with good quality
        .toBuffer();
      finalMimeType = 'image/jpeg';
    }

    const fileId = dbService.generateIdFor('file');

    const doc: FileModel = {
      _id: fileId,
      originalName: data.filename,
      originalMimetype: data.mimetype,
      originalSize: buffer.length,
      processedSize: processedBuffer.length,
      processedMimetype: finalMimeType,
      originalDimensions: {
        width: imageInfo.width ?? 0,
        height: imageInfo.height ?? 0,
      },
      uploadedAt: new Date().toISOString(),
    };

    let fileRev: string;
    try {
      const { rev } = await dbs.insertFile(doc);
      fileRev = rev;
    } catch (err) {
      return rs.bailWithError(500, err);
    }

    const stream = Readable.from(processedBuffer);

    const attachment: FileAttachmentModel = {
      fileId,
      attachmentName: data.filename,
      attachment: stream,
      contentType: finalMimeType,
      params: { rev: fileRev },
    };

    try {
      await dbs.insertFileAttachment(attachment);
    } catch (err) {
      return rs.bailWithError(500, err);
    }

    return {
      success: true,
      id: fileId,
      filename: data.filename,
      originalSize: buffer.length,
      processedSize: processedBuffer.length,
      wasResized: needsResize,
      url: `/uploads/${fileId}/${encodeURIComponent(data.filename)}`,
    };
  });

  // This same pattern is used in the extractFileRefsFrom helper
  app.get<{
    Params: FromSchema<typeof RS.UploadParams>;
  }>(
    '/uploads/:fileId/:filename',
    {
      schema: {
        params: RS.UploadParams,
      },
    },
    async (req, rep) => {
      const rs = redirectService(app, rep);
      const dbs = dbService(app.dbClient);

      const { fileId, filename } = req.params;

      try {
        const file = await dbs.getFileById(fileId);
        if (!file) {
          return rs.bailWithError(404, 'File not found');
        }

        const stream = await dbs.getFileAttachment(fileId, filename);

        rep.type(file.processedMimetype);
        return stream;
      } catch (err) {
        return rs.bailWithError(500, err);
      }
    }
  );

  app.get<{
    Querystring: FromSchema<typeof RS.CreatePageQuery>;
  }>(
    '/pages/create',
    {
      schema: {
        querystring: RS.CreatePageQuery,
      },
    },
    async (req, rep) => {
      const { parentPageId } = req.query;
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

      rep.html(<CreatePage app={app} parentPage={parentPage} token={token} />);
    }
  );

  app.post<{
    Body: FromSchema<typeof RS.PageBody>;
    Querystring: FromSchema<typeof RS.CreatePageQuery>;
  }>(
    '/pages/create',
    {
      schema: {
        body: RS.PageBody,
        querystring: RS.CreatePageQuery,
      },
      preHandler: app.csrfProtection,
    },
    async (req, rep) => {
      const { parentPageId } = req.query;
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

      const parentId = parentPageId ?? null;
      const slug = await dbs.generateUniqueSlug(pageTitle);
      const now = new Date().toISOString();
      const position = await dbs.findInsertPosition(parentId);

      let pageId: string;

      try {
        pageId = dbService.generateIdFor('page');
        await dbs.insertPage({
          _id: pageId,
          parentId,
          pageTitle,
          pageContent,
          pageSlug: slug,
          pageSlugs: [],
          position,
          contentUpdated: true,
          updatedAt: now,
          createdAt: now,
        });
      } catch (error) {
        return rs.homeWithError(error);
      }

      app.cache.reset(NAVIGATION_CACHE_KEY);

      const page = await dbs.getPageById(pageId);

      // These are useful for testing purposes
      rep.header('x-page-id', pageId);
      rep.header('x-parent-id', parentId ?? '');
      rep.header('x-rev', page?._rev);

      return rs.slugWithFeedback(slug, Feedbacks.S_PAGE_CREATED);
    }
  );

  app.get<{
    Querystring: FromSchema<typeof RS.SearchQuery>;
  }>(
    '/search',
    {
      schema: {
        querystring: RS.SearchQuery,
      },
    },

    async (req, rep) => {
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

      rep.html(<SearchResults app={app} query={q} results={results} />);
    }
  );

  app.get<{ Params: FromSchema<typeof RS.PageParams> }>(
    '/pages/:pageId/history',
    {
      schema: {
        params: RS.PageParams,
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

      rep.html(<PageHistory app={app} page={page} history={history} />);
    }
  );

  app.get<{ Params: FromSchema<typeof RS.PageWithVersionParams> }>(
    '/pages/:pageId/history/:version',
    {
      schema: {
        params: RS.PageWithVersionParams,
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
      } catch {
        return rs.slugWithFeedback(page.pageSlug, Feedbacks.E_INVALID_VERSION);
      }

      rep.html(
        <ReadPageVersion
          app={app}
          page={page}
          item={historyItem}
          version={version}
        />
      );
    }
  );

  app.get('/admin/cleanup-orphaned-files', async () => {
    const dbs = dbService(app.dbClient);

    const deleted = await dbs.cleanupOrphanedFiles();

    return `${deleted} file removed.`;
  });

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

  // app.get('/admin/schema/add-position', async () => {
  //   const dbs = dbService(app.dbClient);
  //   const pageDb = dbs.getPageDb();

  //   // Get all pages without a position field
  //   const result = await pageDb.find({
  //     selector: {
  //       position: { $exists: false }, // Find docs missing position
  //     },
  //   });

  //   const pagesByParent = new Map<string, PageModel[]>();
  //   result.docs.forEach((doc) => {
  //     const pages = pagesByParent.get(doc.parentId ?? 'null') || [];
  //     pages.push(doc);
  //     pagesByParent.set(doc.parentId ?? 'null', pages);
  //   });

  //   // Update each group of siblings
  //   const updates: PageModel[] = [];
  //   for (const [_, siblings] of pagesByParent) {
  //     siblings.forEach((doc, index) => {
  //       updates.push({
  //         ...doc,
  //         position: (index + 1) * POSITION_GAP_SIZE,
  //       });
  //     });
  //   }

  //   // Bulk update if there are any documents to migrate
  //   if (updates.length > 0) {
  //     await pageDb.bulk({ docs: updates });
  //     app.log.info(`Migrated ${updates.length} documents`);
  //   } else {
  //     app.log.info('No pages migrated');
  //   }

  //   try {
  //     await pageDb.createIndex({
  //       index: {
  //         fields: ['parentId', 'position'],
  //       },
  //       name: 'pages-by-parent-position',
  //     });
  //   } catch {}

  //   return 'All done';
  // });

  app.setNotFoundHandler(async (_, rep) => {
    await rep
      .code(404)
      .html(<NotFound app={app} title={app.i18n.t('Error.pageNotFound')} />);
  });

  app.setErrorHandler(async (err, req, rep) => {
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
      rep.code(400);
      rep.html(
        <ErrorPage
          app={app}
          title={app.i18n.t('Error.invalidParameters')}
          error={err}
        />
      );
      return;
    }

    rep.code(500);
    rep.html(
      <ErrorPage
        app={app}
        title={app.i18n.t('Error.unhandledError')}
        error={err}
      />
    );
  });
};

export default router;
