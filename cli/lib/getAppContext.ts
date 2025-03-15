import { AppContext } from '~/lib/AppContext';
import { loadConfig } from '~/lib/helpers';
import { AnyLogger } from '../../types';

export const getAppContext = async (
  logger: AnyLogger = console
): Promise<AppContext | null> => {
  const config = loadConfig();

  const contextResult = await AppContext.create({
    config,
    logger,
  });

  if (contextResult.isErr()) {
    console.error(contextResult.error.message);
    return null;
  }

  return contextResult.value;
};
