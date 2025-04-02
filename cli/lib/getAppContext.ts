import { AppContext } from '~/lib/AppContext';
import { loadConfig } from '~/lib/helpers';
import { UrlService } from '~/services/UrlService';
import { AnyLogger } from '../../types';

export const getAppContext = async (
  logger: AnyLogger = console
): Promise<AppContext | null> => {
  const config = loadConfig();

  UrlService.create(config);
  const urlService = UrlService.getInstance();

  const contextResult = await AppContext.create({
    config,
    logger,
    urlService,
  });

  if (contextResult.isErr()) {
    console.error(contextResult.error.message);
    return null;
  }

  return contextResult.value;
};
