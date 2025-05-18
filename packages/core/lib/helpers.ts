import { createId } from '@paralleldrive/cuid2';
import type { ModelName, UrlParts } from '../types';

export const parsePort = (input: string | undefined): number | undefined => {
  if (!input?.trim()) return;
  const port = Number.parseInt(input.trim(), 10);
  return Number.isNaN(port) ? undefined : port;
};

export const parseBaseUrl = (baseUrl: string | undefined): UrlParts | null => {
  const trimmed = baseUrl ? baseUrl.trim() : '';

  try {
    const url = new URL(trimmed);

    return {
      protocol: url.protocol.replace(':', ''),
      hostname: url.hostname,
      port: parsePort(url.port) ?? (url.protocol === 'https:' ? 443 : 80),
      baseUrl: trimmed,
      host: url.host,
      isLocalhost: url.hostname === 'localhost' || url.hostname === '127.0.0.1',
      pathname: url.pathname,
    } as UrlParts;
  } catch {
    if (trimmed !== '') {
      return null;
    }
  }

  return null;
};

export const generateIdFor = (model: ModelName, id?: string) =>
  `${model}:${id ? id : createId()}`;

export const nop = () => {};
