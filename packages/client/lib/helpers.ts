export const removeQueryParam = (url: string, param: string): string => {
  const urlObj = new URL(url);
  urlObj.searchParams.delete(param);
  return urlObj.toString();
};

export const isUrl = (str: string) =>
  /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(str);

// This same function is duplicated in the server code's helpers.ts
export const compilePageTitle = (
  siteTitle: string,
  title: string,
  pattern: string
): string =>
  pattern.replace('{siteTitle}', siteTitle).replace('{pageTitle}', title);

export const joinPaths = (path1: string, path2: string): string => {
  // Trim slashes from the ends
  const normalizedPath1 = path1.trim().replace(/\/+$/, '');
  const normalizedPath2 = path2.trim().replace(/^\/+/, '');

  // Handle empty path1 case
  if (!normalizedPath1) {
    return `/${normalizedPath2}`;
  }

  // Join paths with a single slash
  return `${normalizedPath1}/${normalizedPath2}`;
};
