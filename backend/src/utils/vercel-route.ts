export const restoreApiRequestUrl = (requestUrl = '/api') => {
  const url = new URL(requestUrl, 'http://localhost');
  const rewrittenPath = url.searchParams.get('path');

  if (rewrittenPath === null && url.pathname.startsWith('/api/') && url.pathname !== '/api/index') {
    return `${url.pathname}${url.search}`;
  }

  const path = rewrittenPath?.replace(/^\/+|\/+$/g, '') ?? '';
  url.searchParams.delete('path');
  const search = url.searchParams.toString();

  return `/api${path ? `/${path}` : ''}${search ? `?${search}` : ''}`;
};
