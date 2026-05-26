import { Panel } from './Panel';
import { t } from '@/services/i18n';
import { escapeHtml, sanitizeUrl } from '@/utils/sanitize';
import { toApiUrl } from '@/services/runtime';

interface PanNewsItem {
  slug: string;
  title: string;
  summary: string;
  url: string;
  time: string;
  category: string;
  categorySlug: string;
  country: string;
  sentiment: { pos: number; neu: number; neg: number };
}

interface PanNewsResponse {
  source: string;
  items: PanNewsItem[];
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

function renderItem(item: PanNewsItem): string {
  const safeUrl = sanitizeUrl(item.url);
  const meta: string[] = [];
  if (item.time) meta.push(escapeHtml(item.time));
  if (item.category) {
    const cls = item.categorySlug ? `pan-tag pan-tag--${escapeHtml(item.categorySlug)}` : 'pan-tag';
    meta.push(`<span class="${cls}">${escapeHtml(item.category)}</span>`);
  }
  if (item.country) meta.push(`<span class="pan-country">${escapeHtml(item.country)}</span>`);

  const sentiment = item.sentiment;
  const sentimentBar = sentiment && (sentiment.pos + sentiment.neu + sentiment.neg) > 0
    ? `<div class="pan-sentiment" aria-hidden="true">
        <span class="pan-sentiment__seg pan-sentiment__pos" style="flex:${sentiment.pos}"></span>
        <span class="pan-sentiment__seg pan-sentiment__neu" style="flex:${sentiment.neu}"></span>
        <span class="pan-sentiment__seg pan-sentiment__neg" style="flex:${sentiment.neg}"></span>
      </div>`
    : '';

  const inner = `
    <div class="pan-card__meta">${meta.join('<span class="pan-dot">·</span>')}</div>
    <div class="pan-card__title">${escapeHtml(item.title)}</div>
    ${item.summary ? `<div class="pan-card__summary">${escapeHtml(item.summary)}</div>` : ''}
    ${sentimentBar}
  `;

  if (!safeUrl) return `<div class="pan-card">${inner}</div>`;
  return `<a class="pan-card" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
}

export class PanPanel extends Panel {
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super({
      id: 'pan',
      title: t('panels.pan') ?? 'PAN',
      infoTooltip: t('components.pan.infoTooltip') ?? 'Live news from PAN (Parallax AI Network) — pan.parallax.kr',
      className: 'panel-wide',
      closable: true,
      collapsible: true,
    });
    this.insertPanBadge();
    void this.fetchData();
    this.refreshTimer = setInterval(() => void this.fetchData(), REFRESH_INTERVAL_MS);
  }

  private insertPanBadge(): void {
    const headerLeft = this.element.querySelector('.panel-header-left');
    if (!headerLeft) return;
    const badge = document.createElement('a');
    badge.className = 'pan-source-badge';
    badge.href = 'https://pan.parallax.kr';
    badge.target = '_blank';
    badge.rel = 'noopener noreferrer';
    badge.textContent = 'pan.parallax.kr';
    headerLeft.appendChild(badge);
  }

  public async fetchData(): Promise<void> {
    try {
      this.setFetching(true);
      const url = toApiUrl('/api/pan-news?limit=20');
      const res = await fetch(url, { signal: this.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as PanNewsResponse;
      if (!this.element?.isConnected) return;
      this.renderList(data);
    } catch (err) {
      if (this.isAbortError(err)) return;
      if (!this.element?.isConnected) return;
      this.showError(
        t('components.pan.loadError') ?? 'Failed to load PAN news',
        () => void this.fetchData(),
      );
    } finally {
      this.setFetching(false);
    }
  }

  private renderList(data: PanNewsResponse): void {
    if (!data.items?.length) {
      this.showError(
        t('components.pan.empty') ?? 'No PAN articles available',
        () => void this.fetchData(),
      );
      return;
    }
    const cards = data.items.map(renderItem).join('');
    this.setContent(`<div class="pan-list">${cards}</div>`);
    this.setDataBadge('live');
  }

  public destroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    super.destroy();
  }
}
