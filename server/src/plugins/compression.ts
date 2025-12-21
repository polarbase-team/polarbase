import { Elysia } from 'elysia';

export const compression = new Elysia({ name: 'compressResponses' })
  .mapResponse(({ request, response, set }) => {
    const isJson = typeof response === 'object';
    const compressionRequested = request.headers
      .get('Accept-Encoding')
      ?.includes('gzip');

    const text = isJson
      ? JSON.stringify(response)
      : (response?.toString() ?? '');

    // Only compress if content is larger than 2KB and compression is requested
    if (!compressionRequested || text.length < 2048) {
      return response as Response;
    }

    set.headers['Content-Encoding'] = 'gzip';

    return new Response(Bun.gzipSync(new TextEncoder().encode(text)), {
      headers: {
        'Content-Type': `${isJson ? 'application/json' : 'text/plain'}; charset=utf-8`,
      },
    });
  })
  .as('plugin' as any);
