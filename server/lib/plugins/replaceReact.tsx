/* Thanks to this comment: https://github.com/airbnb/polyglot.js/issues/93#issuecomment-1401558445 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function replaceReact(
  this: string,
  interpolationRegex: RegExp,
  cb: (substring: string, ...args: unknown[]) => string
) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-this-alias
  const phrase: string = this;
  let i = 0;
  const children = [];
  const matches = Array.from(phrase.matchAll(interpolationRegex));

  matches.forEach((match) => {
    if (match.index > i) {
      children.push(phrase.substring(i, match.index));
    }
    children.push(cb(match[0], match[1]));
    i = match.index + match[0].length;
  });
  if (i < phrase.length) {
    children.push(phrase.substring(i));
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return (<>{children}</>) as any;
}
