// Cloudflare Worker for orb.parallax.kr (replaces the Vercel project).
// - /api/* runs the same handlers Vercel ran from api/ (routes.generated.ts).
//   Edge handlers get (Request, ctx); the few Node-style (req, res) handlers
//   go through a small adapter.
// - Everything else is the Vite build in dist/ (ASSETS), with index.html as
//   the SPA fallback, plus the redirects and headers from vercel.json.
import { API_ROUTES, type ApiRoute } from './routes.generated';

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  // pan-web Worker. A Worker's fetch to another Worker route on the same zone
  // goes to that host's origin instead, so pan.parallax.kr calls use this binding.
  PAN?: { fetch(request: Request): Promise<Response> };
}

let fetchPatched = false;

function routeSameZoneFetches(env: Env): void {
  if (fetchPatched || !env.PAN) return;
  fetchPatched = true;
  const pan = env.PAN;
  const original = globalThis.fetch.bind(globalThis);
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    return new URL(request.url).hostname === 'pan.parallax.kr' ? pan.fetch(request) : original(request);
  }) as typeof fetch;
}

interface Ctx {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException?(): void;
}

type EdgeHandler = (req: Request, ctx: Ctx) => Response | Promise<Response>;
type NodeHandler = (req: unknown, res: unknown) => unknown;

function matchRoute(pathname: string): ApiRoute | null {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  for (const route of API_ROUTES) {
    if (route.segments.length !== parts.length) continue;
    if (route.segments.every((s, i) => s.startsWith('[') || s === parts[i])) return route;
  }
  return null;
}

// The handlers read Vercel's edge headers for client IP and geo.
function withVercelHeaders(request: Request): Request {
  const headers = new Headers(request.headers);
  const cf = (request as Request & { cf?: Record<string, unknown> }).cf ?? {};
  const ip = headers.get('cf-connecting-ip');
  if (ip) {
    headers.set('x-real-ip', ip);
    if (!headers.has('x-forwarded-for')) headers.set('x-forwarded-for', ip);
  }
  const country = headers.get('cf-ipcountry') ?? (cf.country as string | undefined);
  if (country) headers.set('x-vercel-ip-country', country);
  if (cf.city) headers.set('x-vercel-ip-city', encodeURIComponent(String(cf.city)));
  if (cf.regionCode) {
    headers.set('x-vercel-ip-country-region', String(cf.regionCode));
    headers.set('x-vercel-ip-region', String(cf.regionCode));
  }
  const ray = headers.get('cf-ray');
  if (ray) headers.set('x-vercel-id', ray);
  return new Request(request, { headers });
}

async function runNodeHandler(handler: NodeHandler, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => (headers[k] = v));
  const req = {
    method: request.method,
    url: url.pathname + url.search,
    headers,
    query: Object.fromEntries(url.searchParams),
  };
  let status = 200;
  const out = new Headers();
  let body: BodyInit | null = null;
  let done!: () => void;
  const finished = new Promise<void>((resolve) => (done = resolve));
  const res = {
    statusCode: 200,
    setHeader(k: string, v: string | number | string[]) {
      out.set(k, Array.isArray(v) ? v.join(', ') : String(v));
      return res;
    },
    getHeader: (k: string) => out.get(k) ?? undefined,
    status(code: number) {
      status = code;
      res.statusCode = code;
      return res;
    },
    writeHead(code: number, h?: Record<string, string>) {
      res.status(code);
      if (h) for (const [k, v] of Object.entries(h)) out.set(k, v);
      return res;
    },
    send(data?: unknown) {
      if (data != null && typeof data === 'object' && !(data instanceof Uint8Array)) return res.json(data);
      body = data == null ? null : (data as BodyInit);
      done();
      return res;
    },
    json(data: unknown) {
      if (!out.has('content-type')) out.set('content-type', 'application/json; charset=utf-8');
      body = JSON.stringify(data);
      done();
      return res;
    },
    end(data?: unknown) {
      if (data != null) body = data as BodyInit;
      done();
      return res;
    },
    redirect(a: number | string, b?: string) {
      const [code, location] = typeof a === 'number' ? [a, b as string] : [302, a];
      res.status(code).setHeader('Location', location);
      return res.end();
    },
  };
  res.statusCode = status;
  await handler(req, res);
  await finished;
  return new Response(body, { status, headers: out });
}

async function handleApi(route: ApiRoute, request: Request, ctx: Ctx): Promise<Response> {
  const handler = route.mod.default;
  if (typeof handler !== 'function') return new Response('Not Found', { status: 404 });
  const req = withVercelHeaders(request);
  if (route.mod.config?.runtime === 'edge') return (handler as EdgeHandler)(req, ctx);
  return runNodeHandler(handler as NodeHandler, req);
}

// Paths Vercel served as files rather than rewriting to index.html. sitemap.xml
// is listed in vercel.json too, but Vercel answered it with index.html while
// the file was missing, so it keeps the fallback here.
const NO_SPA_FALLBACK =
  /^\/(api|assets|favico|map-styles|data|textures|sw\.js|workbox-[a-f0-9]+\.js|manifest\.webmanifest|offline\.html|site\.webmanifest|robots\.txt|llms\.txt|\.well-known)/;

const IMMUTABLE = /^\/(assets|map-styles|data|textures)\//;

function applyHeaders(pathname: string, response: Response): Response {
  const res = new Response(response.body, response);
  const h = res.headers;
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('X-Frame-Options', 'SAMEORIGIN');
  h.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (pathname.startsWith('/api/')) {
    h.set('Access-Control-Allow-Origin', h.get('Access-Control-Allow-Origin') ?? '*');
    h.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    h.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res;
  }
  const isHtml = (h.get('content-type') ?? '').startsWith('text/html');
  if (pathname === '/offline.html') {
    h.set('Cache-Control', 'public, max-age=86400');
  } else if (pathname === '/' || pathname === '/index.html' || isHtml) {
    h.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  } else if (IMMUTABLE.test(pathname)) {
    h.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (pathname.startsWith('/favico/')) {
    h.set('Cache-Control', 'public, max-age=604800');
  }
  if (pathname === '/sitemap.xml' && !isHtml) h.set('Content-Type', 'application/xml; charset=utf-8');
  return res;
}

export default {
  async fetch(request: Request, env: Env, ctx: Ctx): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname === '/security.txt') {
      return Response.redirect(new URL('/.well-known/security.txt', url).toString(), 308);
    }

    if (pathname === '/api' || pathname.startsWith('/api/')) {
      routeSameZoneFetches(env);
      const route = matchRoute(pathname);
      const response = route ? await handleApi(route, request, ctx) : new Response('Not Found', { status: 404 });
      return applyHeaders(pathname, response);
    }

    // html_handling is "none" (Vercel served /offline.html as is), so "/" maps to index.html here.
    const assetUrl = pathname === '/' ? new URL('/index.html', url) : url;
    let response = await env.ASSETS.fetch(new Request(assetUrl, request));
    if (response.status === 404 && !NO_SPA_FALLBACK.test(pathname) && (request.method === 'GET' || request.method === 'HEAD')) {
      response = await env.ASSETS.fetch(new Request(new URL('/index.html', url), request));
    }
    return applyHeaders(pathname, response);
  },
};
