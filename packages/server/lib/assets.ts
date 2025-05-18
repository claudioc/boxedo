import { VENDOR_ASSETS } from 'boxedo-core';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { ASSETS_MOUNT_POINT, CACHE_BUSTER } from '~/constants';

type Bundle = 'app' | 'editor' | 'appMini';

const bundleNames: Record<Bundle, string> = {
  app: '',
  editor: '',
  appMini: '',
};

export const getVendorFilePaths = () =>
  VENDOR_ASSETS.map(
    (asset) => `/${ASSETS_MOUNT_POINT}/vendor/${asset.file}?_=${CACHE_BUSTER}`
  );

export const getCssFilePath = () =>
  `/${ASSETS_MOUNT_POINT}/css/global.css?_=${CACHE_BUSTER}`;

export const getAssetsFsPath = () => path.join(__dirname, '../assets');

export const getBundleFilename = (bundle: Bundle): string => {
  // In production, we know the name of the JS bundle as we start
  // and we don't need to read the directory again and again
  if (process.env.NODE_ENV === 'production' && bundleNames[bundle] !== '') {
    return bundleNames[bundle];
  }

  try {
    const files = readdirSync(path.join(getAssetsFsPath(), 'js')).filter(
      (file) => file.startsWith(`${bundle}-`) && file.endsWith('.js')
    );

    if (files.length === 1) {
      bundleNames[bundle] = `/${ASSETS_MOUNT_POINT}/js/${files[0]}`;
      return bundleNames[bundle];
    }
  } catch {
    // Never mind
  }

  return '';
};
