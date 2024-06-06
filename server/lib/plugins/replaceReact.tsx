/* Thanks to this comment: https://github.com/airbnb/polyglot.js/issues/93#issuecomment-1401558445 */
export function replaceReact(
  this: string,
  interpolationRegex: RegExp,
  cb: (substring: string, ...args: unknown[]) => string,
) {
  let i = 0;
  const children = [];
  const matches = Array.from(this.matchAll(interpolationRegex));

  matches.forEach((match) => {
    if (match.index > i) {
      children.push(this.substring(i, match.index));
    }
    children.push(cb(match[0], match[1]));
    i = match.index + match[0].length;
  });
  if (i < this.length) {
    children.push(this.substring(i));
  }

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  return children as any;
}
