import { AnyLogger } from 'boxedo-core/types';
import { AppContext } from '~/lib/AppContext';
import { loadConfig } from '~/lib/helpers';
import { UrlService } from '~/services/UrlService';

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
