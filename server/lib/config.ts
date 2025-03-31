// In server/lib/configValidator.ts
import type { ConfigEnv } from '~/../types';
import { isValidUrl } from '~/lib/helpers';

export const validateConfig = (config: ConfigEnv): string[] => {
  const errors: string[] = [];

  [
    'JNGL_BASE_EXTERNAL_URL',
    'JNGL_BASE_INTERNAL_URL',
    'JNGL_LIVERELOAD_URL',
    'JNGL_DB_REMOTE_URL',
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
  const internalUrl = new URL(config.JNGL_BASE_INTERNAL_URL);
  if (internalUrl.pathname.length > 1) {
    errors.push(
      'The JNGL_BASE_INTERNAL_URL cannot contain a path because it is only used to extract the hostname and the port to bind the local server to.'
    );
  }

  // If the authentication type is magiclink, the email provider must be provided
  if (
    config.JNGL_AUTHENTICATION_TYPE === 'magiclink' &&
    config.JNGL_EMAIL_PROVIDER === ''
  ) {
    errors.push(
      'The JNGL_AUTHENTICATION_TYPE "magiclink" needs an email provider.'
    );
  }
  return errors;
};
