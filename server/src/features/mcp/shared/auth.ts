import { apiKeyAuth } from '../../auth/api-key.auth';

export async function authenticate(request: any) {
  const apiKey = request.headers['x-api-key'];
  try {
    const authData = await apiKeyAuth(apiKey as string);
    if (!authData.scopes.mcp) {
      throw new Response(null, {
        status: 403,
        statusText: 'Forbidden',
      });
    }
    return authData;
  } catch {
    throw new Response(null, {
      status: 401,
      statusText: 'Unauthorized',
    });
  }
}
