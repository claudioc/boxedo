// Last 5 digits of the current timestamp are used to bust the cache
import {
  ASSETS_MOUNT_POINT,
  CACHE_BUSTER,
  CLIENT_ENTRY_POINT,
} from './constants.js';
import * as fs from 'fs';
import path from 'path';

export const cssFile = `/${ASSETS_MOUNT_POINT}/css/style.css?_=${CACHE_BUSTER}`;

export const getJsBundleName = (): string => {
  // Read the client-meta.json file
  const buffer = fs.readFileSync(
    path.join(__dirname, '../../client-meta.json')
  );

  if (!buffer) {
    return '';
  }

  const meta = JSON.parse(buffer.toString());
  for (const key in meta.outputs) {
    if (meta.outputs[key].entryPoint === CLIENT_ENTRY_POINT) {
      return `/${ASSETS_MOUNT_POINT}/js/${key}`.replace('dist/client/', '');
    }
  }

  return '';
};
