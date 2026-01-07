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

/**
 * Recursively converts all empty strings ("") in an object or array to null.
 * Useful for cleaning up PrimeNG form data before API submission.
 */
export const sanitizeEmptyStrings = (data: any): any => {
  if (data === '') return null;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeEmptyStrings(item));
  }

  if (typeof data === 'object' && data !== null) {
    return Object.keys(data).reduce((acc, key) => {
      acc[key] = sanitizeEmptyStrings(data[key]);
      return acc;
    }, {} as any);
  }

  return data;
};
