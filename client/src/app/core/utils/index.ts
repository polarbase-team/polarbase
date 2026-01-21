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

export const getRecordDisplayLabel = (data: Record<string, any>) => {
  if (!data || typeof data !== 'object') return data;

  const priorityKeys = ['name', 'display_name', 'title', 'label', 'full_name', 'username'];

  for (const key of priorityKeys) {
    if (data[key] && typeof data[key] === 'string') {
      return data[key];
    }
  }

  const blacklist = [
    'id',
    'uuid',
    'at',
    'by',
    'is_',
    'has_',
    'url',
    'website',
    'link',
    'phone',
    'email',
    'address',
  ];

  const fallbackKey = Object.keys(data).find((key) => {
    const value = data[key];
    const isString = typeof value === 'string';
    const isTechnical = blacklist.some((word) => key.toLowerCase().includes(word));
    const isShortEnough = isString && value.length < 100;
    return isString && !isTechnical && isShortEnough;
  });

  return data[fallbackKey] || data['email'] || data['id'] || 'Unknown';
};
