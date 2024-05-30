export const removeQueryParam = (url: string, param: string): string => {
  const urlObj = new URL(url);
  urlObj.searchParams.delete(param);
  return urlObj.toString();
};
