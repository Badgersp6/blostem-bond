// NCD IPO (primary issuance) offers — different envelope from secondary offers.
// Each item is one SERIES of an issuance (issuers usually float multiple series
// at different tenures), with the issuer details under the embedded `product`.

export type IpoSeries = {
  securityId: string;       // parent issuance id (e.g., 'MFL0326')
  seriesId: string;         // unique key for this series (`${securityId}-${seriesCode}`)
  series: string;           // 'Series 12'
  seriesCode: string;       // '12'
  effectiveYield: number;
  couponRate: number;
  couponType?: string;
  ipFrequency?: string;     // 'Monthly', 'Cumulative', etc.
  isCumulative: boolean;
  tenureLabel: string;      // '6y'
  tenureMonths: number;
  issuePrice: number;
  redemptionAmount?: number;
  minAmount: number;
  incrementAmount: number;
  maxAmount: number;
  putCallOption?: string;
  remarks?: string;
};

export type IpoIssuance = {
  securityId: string;
  issuerName: string;
  issuerNameShort: string;
  type: 'Secured' | 'Unsecured' | 'Subordinated' | 'NCD';
  rating: string;
  ratingAgency?: string;
  issueOpen?: string;
  issueClose?: string;
  imFileUrl?: string;
  issuerLink?: string;
  issuerDescription?: string;
  series: IpoSeries[];
  // Computed display helpers
  yieldMin: number;
  yieldMax: number;
  tenureMin: string;
  tenureMax: string;
  minAmount: number;
};

// Curate to the top N series shown to users (by coupon, then effective yield).
// Commission and other partner-facing fields are intentionally not surfaced.
const SERIES_DISPLAY_LIMIT = 3;

const FREQ: Record<string, string> = {
  '1': 'Monthly',
  '2': 'Quarterly',
  '3': 'Semi-annual',
  '4': 'Half-yearly',
  '5': 'Annual',
  '6': 'Cumulative',
};

const SECURED_LABEL: Record<number, Ipo['type']> = {
  1: 'Secured',
  2: 'Unsecured',
  3: 'Subordinated',
};

function shortIssuer(name: string): string {
  if (!name) return '—';
  const cleaned = name
    .replace(/\b(LIMITED|LTD|PRIVATE|PVT|CORPORATION|COMPANY|FINANCIERS?|BOARD)\b\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  const titled = cleaned.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return titled.split(' ').filter(Boolean).slice(0, 4).join(' ') || name;
}

function pickRating(raw: any): { rating: string; agency?: string } {
  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const first = arr[0];
  if (first && first.product_rating) {
    return { rating: String(first.product_rating), agency: first.product_ratings_agency };
  }
  return { rating: '—' };
}

function tenureLabel(d: number, m: number, y: number): string {
  // Normalize: months may be > 12 (e.g., 72 = 6y). Convert into y/m/d display.
  let totalMonths = y * 12 + m;
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts: string[] = [];
  if (years) parts.push(`${years}y`);
  if (months) parts.push(`${months}m`);
  if (d) parts.push(`${d}d`);
  return parts.join(' ') || '—';
}

function tenureToMonths(d: number, m: number, y: number): number {
  return y * 12 + m + Math.round(d / 30.44);
}

function fmtDt(s: string | null | undefined): string | undefined {
  if (!s) return undefined;
  const d = new Date(s.replace(' ', 'T'));
  if (isNaN(d.getTime())) return s;
  const dd = String(d.getDate()).padStart(2, '0');
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  return `${dd} ${M} ${d.getFullYear()}`;
}

type RawSeries = {
  raw: any;
  product: any;
  securityId: string;
  seriesCode: string;
};

function mapSeries({ raw, product, securityId, seriesCode }: RawSeries): IpoSeries {
  const d = Number(raw.day) || 0;
  const m = Number(raw.month) || 0;
  const y = Number(raw.year) || 0;
  const couponRate = Number(raw.coupon_rate) || 0;
  const isCumulative =
    String(raw.ip_frequency) === '6' ||
    (couponRate === 0 && Number(raw.redemption_amount) > Number(raw.issue_price));
  return {
    securityId,
    seriesId: `${securityId}-${seriesCode}`,
    series: `Series ${seriesCode}`,
    seriesCode,
    effectiveYield: Number(raw.effective_yield) || couponRate || 0,
    couponRate,
    couponType: raw.coupon_type ? String(raw.coupon_type) : undefined,
    ipFrequency: isCumulative ? 'Cumulative' : FREQ[String(raw.ip_frequency)] || undefined,
    isCumulative,
    tenureLabel: tenureLabel(d, m, y),
    tenureMonths: tenureToMonths(d, m, y),
    issuePrice: Number(raw.issue_price) || 0,
    redemptionAmount: raw.redemption_amount != null ? Number(raw.redemption_amount) : undefined,
    minAmount: Number(raw.minallowed_amount) || 10000,
    incrementAmount: Number(raw.incremental_amount) || 1000,
    maxAmount: Number(raw.maxallowed_amount) || 1000000,
    putCallOption: raw.putcall_option ? String(raw.putcall_option) : undefined,
    remarks: raw.remark || undefined,
  };
}

function buildIssuance(items: any[]): IpoIssuance {
  const first = items[0];
  const product = first.product || {};
  const securityId = product.security_id || 'IPO';
  const issuerName = product.security_name || '—';
  const ratingInfo = pickRating(product.product_rating);
  const allSeries = items.map((raw) =>
    mapSeries({
      raw,
      product,
      securityId,
      seriesCode: raw.series_code != null ? String(raw.series_code) : '0',
    }),
  );

  // Top N by coupon (effective yield as tiebreaker). For cumulative bonds where
  // coupon is 0, effective yield wins — those still surface if they're the best returns.
  const ranked = [...allSeries].sort((a, b) => {
    if (b.couponRate !== a.couponRate) return b.couponRate - a.couponRate;
    return b.effectiveYield - a.effectiveYield;
  });
  const topSeries = ranked.slice(0, SERIES_DISPLAY_LIMIT)
    // Display in ascending tenure so the picker reads short → long
    .sort((a, b) => a.tenureMonths - b.tenureMonths);

  const yields = topSeries.map((s) => s.effectiveYield);
  const tenures = topSeries.map((s) => ({ label: s.tenureLabel, m: s.tenureMonths }));
  const sortedTenures = [...tenures].sort((a, b) => a.m - b.m);
  const minAmounts = topSeries.map((s) => s.minAmount).filter((n) => n > 0);

  return {
    securityId,
    issuerName,
    issuerNameShort: shortIssuer(issuerName),
    type: SECURED_LABEL[Number(first.secured)] || 'NCD',
    rating: ratingInfo.rating,
    ratingAgency: ratingInfo.agency,
    issueOpen: fmtDt(product.issue_open_datetime),
    issueClose: fmtDt(product.issue_close_datetime),
    imFileUrl: product.im_file || undefined,
    issuerLink: product.issuer_link || undefined,
    issuerDescription: product.issuer_description || undefined,
    series: topSeries,
    yieldMin: Math.min(...yields),
    yieldMax: Math.max(...yields),
    tenureMin: sortedTenures[0]?.label ?? '—',
    tenureMax: sortedTenures[sortedTenures.length - 1]?.label ?? '—',
    minAmount: minAmounts.length ? Math.min(...minAmounts) : 10000,
  };
}

export type IpoResponse = {
  issuances: IpoIssuance[];
  total: number;
};

let cache: IpoResponse | null = null;

export async function fetchIpos(): Promise<IpoResponse> {
  if (cache) return cache;
  const res = await fetch('/api/primary');
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }
  const json = await res.json();
  const items = json.data || [];
  // Group raw items by security_id so each issuance becomes one card.
  const groups = new Map<string, any[]>();
  for (const it of items) {
    const sid = it.product?.security_id || 'IPO';
    if (!groups.has(sid)) groups.set(sid, []);
    groups.get(sid)!.push(it);
  }
  const issuances = Array.from(groups.values()).map(buildIssuance);
  cache = { issuances, total: issuances.length };
  return cache;
}

export function getCachedIssuance(securityId: string): IpoIssuance | undefined {
  return cache?.issuances.find((i) => i.securityId === securityId);
}
