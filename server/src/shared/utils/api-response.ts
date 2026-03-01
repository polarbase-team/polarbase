/**
 * Standard success response format.
 */
export const json = (data: any, meta?: any) => ({
  success: true,
  data,
  meta,
  timestamp: new Date().toISOString(),
});

/**
 * Standard error response format.
 */
export const err = (message: string, status = 400) => ({
  success: false,
  error: message,
  timestamp: new Date().toISOString(),
});
