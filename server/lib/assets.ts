import {
  ASSETS_MOUNT_POINT,
  CACHE_BUSTER,
  CLIENT_BUNDLE_PREFIX,
  CLIENT_BUNDLE_LOCATION,
} from '~/constants';
import path from 'path';
import { fileURLToPath } from 'url';
import { readdirSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const cssFile = `/${ASSETS_MOUNT_POINT}/css/style.css?_=${CACHE_BUSTER}`;
const jsFile = '';

export const getJsBundleName = (): string => {
  // In production, we know the name of the JS bundle as we start
  // and we don't need to read the directory again and again
  if (process.env.NODE_ENV === 'production' && jsFile !== '') {
    return jsFile;
  }

  try {
    const files = readdirSync(
      path.join(__dirname, CLIENT_BUNDLE_LOCATION)
    ).filter(
      (file) => file.startsWith(CLIENT_BUNDLE_PREFIX) && file.endsWith('.js')
    );

    if (files.length === 1) {
      return `/${ASSETS_MOUNT_POINT}/js/${files[0]}`;
    }

    return '';
  } catch (err) {
    return '';
  }
};
