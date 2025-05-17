// In server/lib/configValidator.ts
import type { ConfigEnv } from 'boxedo-core/types';
import { isValidUrl } from '~/lib/helpers';

export const validateConfig = (config: ConfigEnv): string[] => {
  const errors: string[] = [];

  [
    'BXD_BASE_EXTERNAL_URL',
    'BXD_BASE_INTERNAL_URL',
    'BXD_LIVERELOAD_URL',
    'BXD_DB_REMOTE_URL',
  ].reduce((stack, key) => {
    if (
      config[key as keyof ConfigEnv] &&
      !isValidUrl(config[key as keyof ConfigEnv] as string)
    ) {
      stack.push(
        `${key} is not a valid URL: ${config[key as keyof ConfigEnv]}.`
      );
    }
    return stack;
  }, errors);

  // The internal URL cannot contain a path, because it only serves
  // to extract hostname and port
  const internalUrl = new URL(config.BXD_BASE_INTERNAL_URL);
  if (internalUrl.pathname.length > 1) {
    errors.push(
      'The BXD_BASE_INTERNAL_URL cannot contain a path because it is only used to extract the hostname and the port to bind the local server to.'
    );
  }

  // If the authentication type is magiclink, the email provider must be provided
  if (
    config.BXD_AUTHENTICATION_TYPE === 'magiclink' &&
    config.BXD_EMAIL_PROVIDER === ''
  ) {
    errors.push(
      'The BXD_AUTHENTICATION_TYPE "magiclink" needs an email provider.'
    );
  }
  return errors;
};
