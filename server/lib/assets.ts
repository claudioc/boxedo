import {
  ASSETS_MOUNT_POINT,
  CACHE_BUSTER,
  CLIENT_BUNDLE_LOCATION,
} from '~/constants';
import path from 'path';
import { fileURLToPath } from 'url';
import { readdirSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const cssFile = `/${ASSETS_MOUNT_POINT}/css/style.css?_=${CACHE_BUSTER}`;
type Bundle = 'app' | 'editor';

const bundleNames: Record<Bundle, string> = {
  app: '',
  editor: '',
};

export const getBundleFilename = (bundle: Bundle): string => {
  // In production, we know the name of the JS bundle as we start
  // and we don't need to read the directory again and again
  if (process.env.NODE_ENV === 'production' && bundleNames[bundle] !== '') {
    return bundleNames[bundle];
  }

  try {
    const files = readdirSync(
      path.join(__dirname, CLIENT_BUNDLE_LOCATION)
    ).filter((file) => file.startsWith(`${bundle}-`) && file.endsWith('.js'));

    if (files.length === 1) {
      return (bundleNames[bundle] = `/${ASSETS_MOUNT_POINT}/js/${files[0]}`);
    }

    return '';
  } catch (err) {
    return '';
  }
};
