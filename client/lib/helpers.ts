export const removeQueryParam = (url: string, param: string): string => {
  const urlObj = new URL(url);
  urlObj.searchParams.delete(param);
  return urlObj.toString();
};

export const isUrl = (str: string) =>
  /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(str);
