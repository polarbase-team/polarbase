export const convertToHtmlPattern = (regex: RegExp) => {
  let pattern = regex.source;

  pattern = pattern.replace(/\\\//g, '/');

  if (regex.ignoreCase) {
    pattern = pattern.replace(/[a-z]-[a-z]/g, (match) => {
      const upper = match.toUpperCase();
      return match === upper ? match : `${match}${upper}`;
    });
  }

  return pattern;
};
