import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
import { jsonResponse } from './_json-response.js';

export const config = { runtime: 'edge' };

const PAN_BASE = 'https://pan.parallax.kr';
const FETCH_TIMEOUT_MS = 12_000;

const FETCH_HEADERS = Object.freeze({
  'User-Agent': 'Mozilla/5.0 (compatible; Orb/1.0; +https://orb.parallax.kr)',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
});

const CATEGORY_LABELS = Object.freeze({
  war: 'War',
  tech: 'Technology',
  biz: 'Business',
  business: 'Business',
  energy: 'Energy',
  technology: 'Technology',
  news: 'News',
});

async function fetchWithTimeout(url, init = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

function decodeEntities(s) {
  if (!s) return '';
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function pickFirst(re, source) {
  const m = source.match(re);
  return m ? decodeEntities(m[1]).trim() : '';
}

function pickAll(re, source) {
  const out = [];
  let m;
  while ((m = re.exec(source)) !== null) {
    out.push(m[1]);
    if (re.lastIndex === m.index) re.lastIndex++;
  }
  return out;
}

function parseTimelineItems(html) {
  const items = [];
  // Each timeline item is an <article class="tl-item">...
  const itemRe = /<article class="tl-item"[\s\S]*?(?=<article class="tl-item"|<\/ul>|<\/section>|$)/g;
  const blocks = [];
  let m;
  while ((m = itemRe.exec(html)) !== null) {
    blocks.push(m[0]);
    if (itemRe.lastIndex === m.index) itemRe.lastIndex++;
  }

  for (const block of blocks) {
    const slug = pickFirst(/href="\/article\/([a-z0-9-]+)"/i, block);
    if (!slug) continue;

    const title = pickFirst(/<h2 class="tl-item__title"[^>]*>([^<]+)<\/h2>/i, block);
    if (!title) continue;

    const lede = pickFirst(/<p class="tl-item__lede"[^>]*>([^<]+)<\/p>/i, block);
    const timeText = pickFirst(/<div class="tl-item__time"[^>]*>\s*<span[^>]*>([^<]+)<\/span>/i, block);
    const tagSlug = pickFirst(/<span class="tl-tag tl-tag--([a-z]+)"/i, block);
    const tagLabel = pickFirst(/<span class="tl-tag tl-tag--[a-z]+"[^>]*>([^<]+)<\/span>/i, block);

    // Optional country code (2-letter uppercase) - appears as <span>XX</span>
    const country = pickFirst(/tl-tag--[a-z]+"[^>]*>[^<]+<\/span>\s*<span[^>]*>·<\/span>\s*<span[^>]*>([A-Z]{2})<\/span>/i, block);

    const sentiments = block.match(/<span><i class="dot dot--(pos|neu|neg)"><\/i>(\d+)<!-- -->%<\/span>/g) || [];
    const sentiment = { pos: 0, neu: 0, neg: 0 };
    for (const s of sentiments) {
      const m = s.match(/dot--(pos|neu|neg)"[^>]*><\/i>(\d+)/);
      if (m) sentiment[m[1]] = Number(m[2]);
    }

    const categoryLabel = tagLabel || CATEGORY_LABELS[tagSlug] || (tagSlug ? tagSlug.charAt(0).toUpperCase() + tagSlug.slice(1) : '');

    items.push({
      slug,
      title: decodeEntities(title),
      summary: decodeEntities(lede),
      url: `${PAN_BASE}/article/${slug}`,
      time: decodeEntities(timeText),
      category: decodeEntities(categoryLabel),
      categorySlug: tagSlug || '',
      country: country || '',
      sentiment,
    });
  }

  return items;
}

export default async function handler(req) {
  const corsHeaders = getCorsHeaders(req, 'GET, OPTIONS');

  if (isDisallowedOrigin(req)) {
    return jsonResponse({ error: 'Origin not allowed' }, 403, corsHeaders);
  }
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
  }

  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(50, parseInt(url.searchParams.get('limit') || '20', 10) || 20));

  try {
    const response = await fetchWithTimeout(`${PAN_BASE}/timeline`, { headers: FETCH_HEADERS });
    if (!response.ok) {
      return jsonResponse({ error: 'Upstream unavailable', status: response.status }, 502, corsHeaders);
    }
    const html = await response.text();
    const items = parseTimelineItems(html).slice(0, limit);

    return new Response(JSON.stringify({ source: 'pan.parallax.kr', items }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=120, s-maxage=300, stale-while-revalidate=600, stale-if-error=3600',
        'CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600, stale-if-error=3600',
        ...corsHeaders,
      },
    });
  } catch (error) {
    const isTimeout = error?.name === 'AbortError';
    return jsonResponse({
      error: isTimeout ? 'Upstream timeout' : 'Failed to fetch PAN timeline',
      details: error?.message,
    }, isTimeout ? 504 : 502, corsHeaders);
  }
}
