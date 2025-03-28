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
