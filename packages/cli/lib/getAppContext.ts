import { type AnyLogger, loadConfig } from 'boxedo-core';
import { AppContext } from 'boxedo-server/lib/AppContext';
import { UrlService } from 'boxedo-server/services/UrlService';

export const getAppContext = async (
  logger: AnyLogger = console,
  withDb = true
): Promise<AppContext | null> => {
  const config = loadConfig();

  UrlService.create(config);
  const urlService = UrlService.getInstance();

  const contextResult = await AppContext.create({
    config,
    logger,
    urlService,
    withDb,
  });

  if (contextResult.isErr()) {
    console.error(contextResult.error.message);
    return null;
  }

  return contextResult.value;
};
