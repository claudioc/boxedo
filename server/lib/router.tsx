import type { FastifyInstance } from 'fastify';
import type { FromSchema } from 'json-schema-to-ts';
import { generateIdFor, nop } from './helpers';
// import { setTimeout as delay } from 'node:timers/promises';
import { Readable } from 'node:stream';
import sharp from 'sharp';
import type {
  FileAttachmentModel,
  FileModel,
  NavItem,
  PageModel,
} from '~/../types';
import {
  JPEG_QUALITY,
  MAGIC_TOKEN_EXPIRATION_MINUTES,
  MAX_IMAGE_DIMENSION,
  MAX_IMAGE_SIZE,
  NAVIGATION_CACHE_KEY,
  SESSION_COOKIE_NAME,
  SEVEN_DAYS_IN_SECONDS,
} from '~/constants';
import { redirectService } from '~/services/redirectService';
import { SearchService } from '~/services/SearchService';
import { Nav } from '~/views/components/Nav';
import { TitlesList } from '~/views/components/TitlesList';
import { CreatePage } from '~/views/CreatePage';
import { EditPage } from '~/views/EditPage';
import { ErrorPage } from '~/views/ErrorPage';
import { LoginPage } from '~/views/LoginPage';
import { MovePage } from '~/views/MovePage';
import { NotFound } from '~/views/NotFound';
import { PageHistory } from '~/views/PageHistory';
import { ReadPage } from '~/views/ReadPage';
import { ReadPageVersion } from '~/views/ReadPageVersion';
import { SearchResults } from '~/views/SearchResults';
import { SettingsPage } from '~/views/SettingsPage';
import { Feedbacks } from './feedbacks';
import { createRequireAuth, createRequireCsrf } from './routerPreHandlers';
import { RouterSchemas as RS } from './routerSchemas';

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options, refer to https://www.fastify.dev/docs/latest/Reference/Plugins/#plugin-options
 */
const router = async (app: FastifyInstance) => {
  const requireAuth = createRequireAuth(app);
  const requireCsrf = createRequireCsrf(app);

  // The home page, folks
  app.get(
    '/',
    {
      preHandler: requireAuth,
    },
    async (req, rep) => {
      const pageRepo = app.repos.getPageRepository();
      const isHtmx = req.headers['hx-request'];
      const { settings } = app;

      // We consider 3 scenarios
      // 1. No pages at all (first installation): we show the welcome page
      // 2. One or more pages exist but the landing page is not defined: we show the first page top-level page
      // 3. The landing page exists: we show the landing page

      // Do we have any page at all?
      const pageCount = (await pageRepo.countPages()).match(
        (count) => count,
        (_) => 0
      );

      let landingPage: PageModel | null = null;
      if (settings.landingPageId) {
        landingPage = (
          await pageRepo.getPageById(settings.landingPageId)
        ).match(
          (page) => page,
          (feedback) => {
            throw new Error(feedback.message);
          }
        );
      } else {
        if (pageCount > 0) {
          // Decision: if there is no landing page, we show the first page
          (await pageRepo.getTopLevelPages()).match(
            (pages) => {
              landingPage = pages[0] || null;
            },
            (feedback) => {
              throw new Error(feedback.message);
            }
          );
        }
      }

      rep.html(
        <>
          {landingPage && (
            <ReadPage
              ctx={{ app, user: req.user }}
              isFull={!isHtmx}
              page={landingPage}
              isLandingPage
            />
          )}
          {!landingPage && pageCount === 0 && (
            <ReadPage
              ctx={{ app, user: req.user }}
              isFull={!isHtmx}
              isWelcome
              isLandingPage
            />
          )}
          {!landingPage && pageCount > 0 && (
            <ReadPage ctx={{ app, user: req.user }} isFull={!isHtmx} />
          )}
        </>
      );
    }
  );

  app.get('/auth/login', async (req, rep) => {
    rep.html(
      <LoginPage ctx={{ app, user: req.user }} token={rep.generateCsrf()} />
    );
  });

  app.post<{
    Body: FromSchema<typeof RS.LoginBody>;
  }>(
    '/auth/login',
    {
      schema: {
        body: RS.LoginBody,
      },
      preHandler: requireCsrf,
    },
    async (req, rep) => {
      const rs = redirectService(app, rep);
      const { email } = req.body;
      const userRepo = app.repos.getUserRepository();
      const magicRepo = app.repos.getMagicRepository();
      const { i18n, settings, config } = app;

      const user = (await userRepo.getUserByEmail(email)).match(
        (user) => user,
        nop
      );
      if (!user) {
        return rs.path('/auth/login', Feedbacks.E_USER_NOT_FOUND, true);
      }

      const magicData = (
        await magicRepo.createMagic(email, MAGIC_TOKEN_EXPIRATION_MINUTES)
      ).match(
        (magicData) => magicData,
        (feedback) => {
          throw new Error(feedback.message);
        }
      );

      const emailMessage = {
        from: {
          name: settings.siteTitle,
          email: config.EMAIL_FROM_EMAIL ?? '',
        },
        to: { name: user.fullname, email: user.email },
        subject: i18n.t('Login.emailMagicLinkSubject', {
          siteTitle: settings.siteTitle,
        }),
        text: i18n.t('Login.emailMagicLinkText', {
          magicLink: `${config.BASE_EXTERNAL_URL}/auth/magic/${magicData._id}`,
        }),
      };

      if (app.is('development')) {
        app.log.info(`${config.BASE_EXTERNAL_URL}/auth/magic/${magicData._id}`);
      }

      app.emailService.sendEmail(emailMessage);

      return rs.path('/auth/login', Feedbacks.S_MAGIC_LINK_SENT, true);
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
      const sessionRepo = app.repos.getSessionRepository();
      const magicRepo = app.repos.getMagicRepository();
      const magicId = req.params.magicId;
      const { i18n } = app;

      const email = (await magicRepo.validateMagic(magicId)).match(
        (email) => email,
        (feedback) => {
          throw new Error(feedback.message);
        }
      );

      const sessionId = generateIdFor('session');

      if (email) {
        (
          await sessionRepo.createSession({
            type: 'session',
            _id: sessionId,
            email,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(
              Date.now() + SEVEN_DAYS_IN_SECONDS * 1000
            ).toISOString(),
          })
        ).match(nop, (feedback) => {
          throw new Error(feedback.message);
        });

        rep.setCookie(SESSION_COOKIE_NAME, sessionId, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: SEVEN_DAYS_IN_SECONDS,
        });

        return rs.home(Feedbacks.S_LOGIN_SUCCESS);
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
            ctx={{ app, user: req.user }}
            title={i18n.t('Error.unauthorized')}
            error={error}
            goHome={false}
          />
        );
    }
  );

  app.post('/auth/logout', async (req, rep) => {
    const sessionId = req.cookies.session;
    const sessionRepo = app.repos.getSessionRepository();

    if (sessionId) {
      (await sessionRepo.deleteSession(sessionId)).match(nop, nop);
    }

    rep.clearCookie(SESSION_COOKIE_NAME, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return rep.redirect('/auth/login');
  });

  app.get(
    '/settings',
    {
      preHandler: requireAuth,
    },
    async (req, rep) => {
      const pageRepo = app.repos.getPageRepository();
      const { settings } = app;

      let landingPage: PageModel | null = null;
      if (settings.landingPageId) {
        landingPage = (
          await pageRepo.getPageById(settings.landingPageId)
        ).match(
          (page) => page,
          (feedback) => {
            throw new Error(feedback.message);
          }
        );
      }

      rep.header('Cache-Control', 'no-cache, no-store, must-revalidate');

      rep.html(
        <SettingsPage
          ctx={{ app, user: req.user }}
          settings={settings}
          landingPage={landingPage}
          token={rep.generateCsrf()}
        />
      );
    }
  );

  app.post<{
    Body: FromSchema<typeof RS.SettingsPageBody>;
  }>(
    '/settings',
    {
      preHandler: [requireAuth, requireCsrf],
      schema: {
        body: RS.SettingsPageBody,
      },
    },
    async (req, rep) => {
      const { landingPageId, siteLang, siteTitle, textSize } = req.body;
      const pageRepo = app.repos.getPageRepository();
      const settingRepo = app.repos.getSettingsRepository();
      const rs = redirectService(app, rep);

      const settings = (await settingRepo.getSettings()).match(
        (settings) => settings,
        (feedback) => {
          throw new Error(feedback.message);
        }
      );

      if (landingPageId && settings.landingPageId !== landingPageId) {
        // Can't use a non-existing landing page
        const page = (await pageRepo.getPageById(landingPageId)).match(
          (page) => page,
          (feedback) => {
            throw new Error(feedback.message);
          }
        );

        if (!page) {
          return rs.home(Feedbacks.E_MISSING_PAGE);
        }
        settings.landingPageId = landingPageId;
      }

      settings.siteLang = siteLang;
      settings.siteTitle = siteTitle;
      settings.textSize = textSize;

      app.i18n.switchTo(siteLang);

      app.settings = settings;

      (await settingRepo.updateSettings(settings)).match(nop, (feedback) => {
        throw new Error(feedback.message);
      });

      return rs.home(Feedbacks.S_SETTINGS_UPDATED);
    }
  );

  app.get<{
    Querystring: FromSchema<typeof RS.SearchQuery>;
  }>(
    '/parts/titles',
    {
      preHandler: requireAuth,
      schema: {
        querystring: RS.SearchQuery,
      },
    },
    async (req, rep) => {
      const { q } = req.query;

      if (q.length < 3 || q.length > 50) {
        return '';
      }

      const service = SearchService.getInstance().match(
        (service) => service,
        (error) => {
          app.log.error(error);
          return null;
        }
      );

      const titles = service
        ? (await service.searchByTitle(q)).unwrapOr([])
        : [];

      rep.html(<TitlesList titles={titles} i18n={app.i18n} />);
    }
  );

  /* Returns the navigation menu */
  app.get<{ Params: FromSchema<typeof RS.PageParamsOptional> }>(
    '/parts/nav/:pageId?',
    {
      preHandler: requireAuth,
      schema: {
        params: RS.PageParamsOptional,
      },
    },
    async (req, rep) => {
      const { pageId } = req.params;
      const pageRepo = app.repos.getPageRepository();

      let forest: NavItem[] = [];
      const cached = app.cache.get<NavItem[]>(NAVIGATION_CACHE_KEY);

      if (cached) {
        forest = cached.data;
      } else {
        forest = (await pageRepo.buildMenuTree(null)).match(
          (forest) => forest,
          (feedback) => {
            throw new Error(feedback.message);
          }
        );
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
      preHandler: requireAuth,
      schema: {
        params: RS.PageSlugParams,
      },
    },
    async (req, rep) => {
      const { slug } = req.params;
      const pageRepo = app.repos.getPageRepository();
      const isHtmx = req.headers['hx-request'];
      const rs = redirectService(app, rep);

      const page = (await pageRepo.getPageBySlug(slug)).match(
        (page) => page,
        (feedback) => {
          throw new Error(feedback.message);
        }
      );

      if (page) {
        // These are useful for testing purposes
        rep.header('x-page-id', page._id);
        rep.header('x-parent-id', page.parentId ?? '');
        rep.header('x-rev', page._rev);

        return rep.html(
          <ReadPage
            ctx={{ app, user: req.user }}
            isFull={!isHtmx}
            page={page}
          />
        );
      }

      const oldPage = (await pageRepo.lookupPageBySlug(slug)).match(
        (page) => page,
        (feedback) => {
          throw new Error(feedback.message);
        }
      );

      if (oldPage) {
        // Redirect to the current slug
        app.log.error(`Using old slug ${slug} for page ${oldPage._id}`);
        return rs.slug(oldPage.pageSlug, Feedbacks.S_PAGE_MOVED);
      }

      app.log.error(Feedbacks.E_MISSING_PAGE.message);

      rep
        .code(404)
        .html(
          <NotFound
            ctx={{ app, user: req.user }}
            title={app.i18n.t('Error.pageNotFound')}
          />
        );
    }
  );

  app.get<{ Params: FromSchema<typeof RS.PageParams> }>(
    '/pages/:pageId/edit',
    {
      preHandler: requireAuth,
      schema: {
        params: RS.PageParams,
      },
    },
    async (req, rep) => {
      const { pageId } = req.params;
      const pageRepo = app.repos.getPageRepository();
      const rs = redirectService(app, rep);
      const token = rep.generateCsrf();

      const page = (await pageRepo.getPageById(pageId)).match(
        (page) => page,
        (feedback) => {
          throw new Error(feedback.message);
        }
      );

      if (!page) {
        return rs.home(Feedbacks.E_MISSING_PAGE);
      }

      rep.header('Cache-Control', 'no-cache, no-store, must-revalidate');

      rep.html(
        <EditPage ctx={{ app, user: req.user }} page={page} token={token} />
      );
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
      preHandler: [requireAuth, requireCsrf],
    },
    async (req, rep) => {
      const { pageId } = req.params;
      const { pageTitle, pageContent, rev } = req.body;
      const pageRepo = app.repos.getPageRepository();
      const rs = redirectService(app, rep);

      if (pageTitle.trim() === '') {
        return rs.home(Feedbacks.E_EMPTY_TITLE);
      }

      if (pageContent.trim() === '') {
        return rs.home(Feedbacks.E_EMPTY_CONTENT);
      }

      if (!rev || rev.trim() === '') {
        return rs.home(Feedbacks.E_MISSING_REV);
      }

      const page = (await pageRepo.getPageById(pageId)).match(
        (page) => page,
        (feedback) => {
          throw new Error(feedback.message);
        }
      );

      if (!page) {
        return rs.home(Feedbacks.E_MISSING_PAGE);
      }

      if (pageTitle === page.pageTitle && pageContent === page.pageContent) {
        return rs.slug(page.pageSlug, Feedbacks.S_PAGE_UPDATED);
      }

      // Ensure we are updating the correct revision
      if (rev !== page._rev) {
        return rs.slug(page.pageSlug, Feedbacks.E_REV_MISMATCH_ON_SAVE);
      }

      const newSlug = await maybeNewSlug();
      (
        await pageRepo.updatePageContent(page, {
          pageTitle: req.body.pageTitle,
          pageContent: req.body.pageContent,
          pageSlug: newSlug,
          updatedAt: new Date().toISOString(),
        })
      ).mapErr((feedback) => {
        throw new Error(feedback.message);
      });

      const updatedPage = (await pageRepo.getPageById(pageId)).match(
        (page) => page,
        (feedback) => {
          throw new Error(feedback.message);
        }
      );

      // await delay(2000);
      if (updatedPage) {
        app.cache.reset(NAVIGATION_CACHE_KEY);
        return rs.slug(newSlug, Feedbacks.S_PAGE_UPDATED);
      }

      return rs.slug(newSlug, Feedbacks.E_UPDATING_PAGE);

      // If the title is the same as the current page, we keep the slug
      // Otherwise, we generate a new one
      async function maybeNewSlug(): Promise<string> {
        if (!page) {
          return '/';
        }

        if (pageTitle === page.pageTitle) {
          return page.pageSlug;
        }

        return (await pageRepo.generateUniqueSlug(pageTitle)).match(
          (slug) => slug,
          (feedback) => {
            throw new Error(feedback.message);
          }
        );
      }
    }
  );

  app.get<{ Params: FromSchema<typeof RS.PageParams> }>(
    '/pages/:pageId/move',
    {
      preHandler: requireAuth,
      schema: {
        params: RS.PageParams,
      },
    },
    async (req, rep) => {
      const { pageId } = req.params;
      const pageRepo = app.repos.getPageRepository();
      const rs = redirectService(app, rep);

      const page = (await pageRepo.getPageById(pageId)).match(
        (page) => page,
        (feedback) => {
          throw new Error(feedback.message);
        }
      );

      if (!page) {
        return rs.home(Feedbacks.E_MISSING_PAGE);
      }

      let parent: PageModel | null = null;
      if (page.parentId) {
        parent = (await pageRepo.getPageById(page.parentId ?? '')).match(
          (page) => page,
          (feedback) => {
            throw new Error(feedback.message);
          }
        );

        if (!parent) {
          return rs.home(Feedbacks.E_MISSING_PAGE);
        }
      }

      rep.html(
        <MovePage
          ctx={{ app, user: req.user }}
          page={page}
          parent={parent}
          token={rep.generateCsrf()}
        />
      );
    }
  );

  app.post<{
    Body: FromSchema<typeof RS.MovePageBody>;
    Params: FromSchema<typeof RS.PageParams>;
  }>(
    '/pages/:pageId/move',
    {
      preHandler: [requireAuth, requireCsrf],
      schema: {
        body: RS.MovePageBody,
        params: RS.PageParams,
      },
    },
    async (req, rep) => {
      const { pageId } = req.params;
      const { newParentId, moveToTop } = req.body;
      const pageRepo = app.repos.getPageRepository();
      const rs = redirectService(app, rep);

      let parentId = newParentId ?? null;
      // Yes, test the string and not the boolean
      if (moveToTop === 'true') {
        parentId = null;
      }

      if (moveToTop === 'false' && !parentId) {
        // Something is wrong
        return rs.home(Feedbacks.E_WRONG_PARENT_PAGE);
      }

      // Can't move a page to itself
      if (parentId === pageId) {
        return rs.home(Feedbacks.E_WRONG_PARENT_PAGE);
      }

      // Can't move a non-existing page
      const page = (await pageRepo.getPageById(pageId)).match(
        (page) => page,
        (feedback) => {
          throw new Error(feedback.message);
        }
      );

      if (!page) {
        return rs.home(Feedbacks.E_MISSING_PAGE);
      }

      if (page.parentId === parentId) {
        // Nothing to do here
        return rs.slug(page.pageSlug, Feedbacks.S_PAGE_MOVED);
      }

      // Can't move a page to a non-existing parent
      if (parentId) {
        const newParentPage = (await pageRepo.getPageById(parentId)).match(
          (page) => page,
          (feedback) => {
            throw new Error(feedback.message);
          }
        );
        if (!newParentPage) {
          return rs.home(Feedbacks.E_MISSING_PAGE);
        }
      }

      const position = (await pageRepo.findInsertPosition(parentId)).match(
        (position) => position,
        (feedback) => {
          throw new Error(feedback.message);
        }
      );

      (await pageRepo.changePageParent(page, parentId, position)).mapErr(
        (feedback) => {
          throw new Error(feedback.message);
        }
      );

      app.cache.reset(NAVIGATION_CACHE_KEY);

      await rs.slug(page.pageSlug, Feedbacks.S_PAGE_MOVED);
    }
  );

  app.post<{
    Body: FromSchema<typeof RS.ReorderPageBody>;
    Params: FromSchema<typeof RS.PageParams>;
  }>(
    '/pages/:pageId/reorder',
    {
      preHandler: requireAuth,
      schema: {
        body: RS.ReorderPageBody,
        params: RS.PageParams,
      },
    },
    async (req, rep) => {
      const { pageId } = req.params;
      const { targetIndex } = req.body;
      const pageRepo = app.repos.getPageRepository();
      const rs = redirectService(app, rep);

      const page = (await pageRepo.getPageById(pageId)).match(
        (page) => page,
        (feedback) => {
          throw new Error(feedback.message);
        }
      );

      if (!page) {
        return rs.home(Feedbacks.E_MISSING_PAGE);
      }

      const position = (
        await pageRepo.findInsertPosition(
          page.parentId ?? null,
          targetIndex,
          pageId
        )
      ).match(
        (position) => position,
        (feedback) => {
          throw new Error(feedback.message);
        }
      );

      (await pageRepo.updatePagePosition(page, position)).mapErr((feedback) => {
        throw new Error(feedback.message);
      });

      app.cache.reset(NAVIGATION_CACHE_KEY);

      return rep.status(204).send();
    }
  );

  app.post<{
    Params: FromSchema<typeof RS.PageParams>;
  }>(
    '/pages/:pageId/delete',
    {
      preHandler: [requireAuth, requireCsrf],
      schema: {
        params: RS.PageParams,
      },
    },

    async (req, rep) => {
      const { pageId } = req.params;
      const rs = redirectService(app, rep);
      const pageRepo = app.repos.getPageRepository();

      const page = (await pageRepo.getPageById(pageId)).match(
        (page) => page,
        (feedback) => {
          throw new Error(feedback.message);
        }
      );

      if (!page) {
        return rs.home(Feedbacks.E_MISSING_PAGE);
      }

      (await pageRepo.deletePage(page)).mapErr((feedback) => {
        throw new Error(feedback.message);
      });

      app.cache.reset(NAVIGATION_CACHE_KEY);

      return rs.home(Feedbacks.S_PAGE_DELETED);
    }
  );

  // Decision: each upload will create a single "file" document in CouchDB, and each File document
  // will have a single attachment, even though in theory CouchDB supports multiple attachments per document.
  // Each attachment in a file document is identified by its filename and since there is only one attachment
  // per file, the fileId is also a loose reference to the attachment itself.
  // An alternative approach is to use the attachments for each _page_ document, but this would delete all the
  // attachments if the page is deleted. This is not a problem for the current implementation (because there is
  // now way at the moment to share an uploaded file), but in the future a media explorer could be implemented.
  app.post(
    '/uploads',
    {
      preHandler: requireAuth,
    },
    async (req, rep) => {
      const rs = redirectService(app, rep);
      const fileRepo = app.repos.getFileRepository();

      if (!req.isMultipart()) {
        return rs.bail(400, 'Invalid file type. Please upload an image.');
      }

      const options = { limits: { fileSize: MAX_IMAGE_SIZE, files: 1 } };
      const data = await req.file(options);
      if (!data) {
        return rs.bail(400, 'Invalid file type. Please upload an image.');
      }

      // Check if it's an image
      if (!data.mimetype.startsWith('image/')) {
        return rs.bail(400, 'Invalid file type. Please upload an image.');
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

      const fileId = generateIdFor('file');

      const doc: FileModel = {
        type: 'file',
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

      const fileRev = (await fileRepo.insertFile(doc)).match(
        (doc) => doc.rev,
        (feedback) => {
          throw new Error(feedback.message);
        }
      );

      const stream = Readable.from(processedBuffer);

      const attachment: FileAttachmentModel = {
        fileId,
        attachmentName: data.filename,
        attachment: stream,
        contentType: finalMimeType,
        params: { rev: fileRev },
      };

      (await fileRepo.insertFileAttachment(attachment)).mapErr((feedback) => {
        throw new Error(feedback.message);
      });

      return {
        success: true,
        id: fileId,
        filename: data.filename,
        originalSize: buffer.length,
        processedSize: processedBuffer.length,
        wasResized: needsResize,
        url: `/uploads/${fileId}/${encodeURIComponent(data.filename)}`,
      };
    }
  );

  // This same pattern is used in the extractFileRefsFrom helper
  app.get<{
    Params: FromSchema<typeof RS.UploadParams>;
  }>(
    '/uploads/:fileId/:filename',
    {
      preHandler: requireAuth,
      schema: {
        params: RS.UploadParams,
      },
    },
    async (req, rep) => {
      const rs = redirectService(app, rep);
      const fileRepo = app.repos.getFileRepository();

      const { fileId, filename } = req.params;

      const file = (await fileRepo.getFileById(fileId)).match(
        (file) => file,
        (feedback) => {
          throw new Error(feedback.message);
        }
      );

      if (!file) {
        return rs.bail(404, 'File not found');
      }

      const stream = await fileRepo.getFileAttachment(fileId, filename);
      if (!stream) {
        return rs.bail(404, 'File stream not found');
      }

      rep.type(file.processedMimetype);
      return stream;
    }
  );

  app.get<{
    Querystring: FromSchema<typeof RS.CreatePageQuery>;
  }>(
    '/pages/create',
    {
      preHandler: requireAuth,
      schema: {
        querystring: RS.CreatePageQuery,
      },
    },
    async (req, rep) => {
      const { parentPageId } = req.query;
      const pageRepo = app.repos.getPageRepository();
      const rs = redirectService(app, rep);
      const token = rep.generateCsrf();

      let parentPage: PageModel | null = null;
      if (parentPageId) {
        parentPage = (await pageRepo.getPageById(parentPageId)).match(
          (page) => page,
          (feedback) => {
            throw new Error(feedback.message);
          }
        );

        if (!parentPage) {
          return rs.home(Feedbacks.E_MISSING_PARENT);
        }
      }

      rep.html(
        <CreatePage
          ctx={{ app, user: req.user }}
          parentPage={parentPage}
          token={token}
        />
      );
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
      preHandler: [requireAuth, requireCsrf],
    },
    async (req, rep) => {
      const { parentPageId } = req.query;
      const { pageTitle, pageContent } = req.body;
      const rs = redirectService(app, rep);
      const pageRepo = app.repos.getPageRepository();

      if (pageTitle.trim() === '') {
        return rs.home(Feedbacks.E_EMPTY_TITLE);
      }

      if (pageContent.trim() === '') {
        return rs.home(Feedbacks.E_EMPTY_CONTENT);
      }

      let parentPage: PageModel | null = null;
      if (parentPageId) {
        parentPage = (await pageRepo.getPageById(parentPageId)).match(
          (page) => page,
          (feedback) => {
            throw new Error(feedback.message);
          }
        );
        if (!parentPage) {
          return rs.home(Feedbacks.E_MISSING_PARENT);
        }
      }

      const parentId = parentPageId ?? null;
      const slug = (await pageRepo.generateUniqueSlug(pageTitle)).match(
        (slug) => slug,
        (feedback) => {
          throw new Error(feedback.message);
        }
      );
      const now = new Date().toISOString();
      const position = (await pageRepo.findInsertPosition(parentId)).match(
        (position) => position,
        (feedback) => {
          throw new Error(feedback.message);
        }
      );

      const pageId = generateIdFor('page');
      (
        await pageRepo.insertPage({
          type: 'page',
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
        })
      ).match(nop, (feedback) => {
        throw new Error(feedback.message);
      });

      app.cache.reset(NAVIGATION_CACHE_KEY);

      const page = (await pageRepo.getPageById(pageId)).match(
        (page) => page,
        (feedback) => {
          throw new Error(feedback.message);
        }
      );

      if (page) {
        // These are useful for testing purposes
        rep.header('x-page-id', pageId);
        rep.header('x-parent-id', parentId ?? '');
        rep.header('x-rev', page?._rev);

        return rs.slug(slug, Feedbacks.S_PAGE_CREATED);
      }

      return rs.slug(slug, Feedbacks.E_CREATING_PAGE);
    }
  );

  app.get<{
    Querystring: FromSchema<typeof RS.SearchQuery>;
  }>(
    '/search',
    {
      preHandler: requireAuth,
      schema: {
        querystring: RS.SearchQuery,
      },
    },

    async (req, rep) => {
      const { q } = req.query;

      const service = SearchService.getInstance().match(
        (service) => service,
        (error) => {
          app.log.error(error);
          return null;
        }
      );

      const results = service ? (await service.search(q)).unwrapOr([]) : [];

      rep.html(
        <SearchResults
          ctx={{ app, user: req.user }}
          query={q}
          results={results}
        />
      );
    }
  );

  app.get<{ Params: FromSchema<typeof RS.PageParams> }>(
    '/pages/:pageId/history',
    {
      preHandler: requireAuth,
      schema: {
        params: RS.PageParams,
      },
    },
    async (req, rep) => {
      const { pageId } = req.params;
      const pageRepo = app.repos.getPageRepository();
      const rs = redirectService(app, rep);

      const page = (await pageRepo.getPageById(pageId)).match(
        (page) => page,
        (feedback) => {
          throw new Error(feedback.message);
        }
      );

      if (!page) {
        return rs.home(Feedbacks.E_MISSING_PAGE);
      }

      const history = await (await pageRepo.getPageHistory(page)).match(
        (history) => history,
        (feedback) => {
          throw new Error(feedback.message);
        }
      );

      rep.html(
        <PageHistory
          ctx={{ app, user: req.user }}
          page={page}
          history={history}
        />
      );
    }
  );

  app.get<{ Params: FromSchema<typeof RS.PageWithVersionParams> }>(
    '/pages/:pageId/history/:version',
    {
      preHandler: requireAuth,
      schema: {
        params: RS.PageWithVersionParams,
      },
    },
    async (req, rep) => {
      const { pageId, version } = req.params;
      const pageRepo = app.repos.getPageRepository();
      const rs = redirectService(app, rep);

      const page = (await pageRepo.getPageById(pageId)).match(
        (page) => page,
        (feedback) => {
          throw new Error(feedback.message);
        }
      );

      if (!page) {
        return rs.home(Feedbacks.E_MISSING_PAGE);
      }

      const historyItem = (
        await pageRepo.getPageHistoryItem(page, version)
      ).match(
        (historyItem) => historyItem,
        (feedback) => {
          throw new Error(feedback.message);
        }
      );

      rep.html(
        <ReadPageVersion
          ctx={{ app, user: req.user }}
          page={page}
          item={historyItem}
          version={version}
        />
      );
    }
  );

  app.get('/admin/cleanup-orphaned-files', async () => {
    const fileRepo = app.repos.getFileRepository();

    const deleted = (await fileRepo.cleanupOrphanedFiles()).match(
      (deleted) => deleted,
      (feedback) => {
        throw new Error(feedback.message);
      }
    );

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

  app.setNotFoundHandler(async (req, rep) => {
    await rep
      .code(404)
      .html(
        <NotFound
          ctx={{ app, user: req.user }}
          title={app.i18n.t('Error.pageNotFound')}
        />
      );
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
          ctx={{ app, user: req.user }}
          title={app.i18n.t('Error.invalidParameters')}
          error={err}
        />
      );
      return;
    }

    rep.code(500);
    rep.html(
      <ErrorPage
        ctx={{ app, user: req.user }}
        title={app.i18n.t('Error.unhandledError')}
        error={err}
      />
    );
  });
};

export default router;
