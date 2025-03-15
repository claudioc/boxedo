import { AppContext } from '~/lib/AppContext';
import { loadConfig } from '~/lib/helpers';

export const getAppContext = async (): Promise<AppContext | null> => {
  const config = loadConfig();

  const contextResult = await AppContext.create({
    config,
    logger: console,
  });

  if (contextResult.isErr()) {
    console.error(contextResult.error.message);
    return null;
  }

  return contextResult.value;
};
