export type BondCategory = 'gsec' | 'bond-secondary' | 'sgb';

export const BOND_CATEGORIES: BondCategory[] = ['gsec', 'bond-secondary', 'sgb'];

export type ApiBond = {
  isin: string;
  category: BondCategory;
  name: string;
  fullName: string;
  type: string;
  rating: string;
  ratingAgency?: string;
  ratingOutlook?: string;
  ytm: number;
  coupon: number;
  couponFreq: string;
  minInvest: number;
  unitPrice: number;
  minUnits: number;
  maturityShort: string;
  maturityFull: string;
  tenureMonths: number;
  tenureLabel?: string;
  // Per-lot cash split: principal (face × price/100) + accrued = minInvest
  principalPerLot: number;
  accruedPerLot: number;
};

export type BondsResponse = {
  data: ApiBondDetail[];
  total: number;
};

export type PayoutKind = 'ip' | 'principal' | 'combined';

export type PayoutEntry = {
  date: string;
  day?: string;
  label: string;
  amount: number;
  isNext: boolean;
  kind: PayoutKind;
};

export type DocumentLink = {
  label: string;
  url: string;
};

export type ApiBondDetail = ApiBond & {
  issuerDescription?: string;
  issuerTypeLabel: string;
  security: string;
  listing: string;
  tax: string;
  perPayoutPerMin: number;
  totalPayouts: number;
  payoutSchedule: PayoutEntry[];
  fullSchedule: PayoutEntry[];
  documents: DocumentLink[];
  remarks?: string;
  // Offer-specific
  pricePerHundred?: number;
  settlementDate?: string;
  tradeDate?: string;
  quoteValidUntil?: string;
  // Optional richer fields (populated for the demo/test bond and any future
  // bonds with structured financials in the API)
  ratingReviewedAt?: string;
  ratingChangeNote?: string;
  financials?: {
    auditedNote?: string;
    metrics?: { label: string; value: string; delta?: string }[];
    summary?: string;
  };
};

const FREQ: Record<string, string> = {
  '1': 'Monthly',
  '2': 'Quarterly',
  '3': 'Semi-annual',
  '4': 'Half-yearly',
  '5': 'At maturity',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ISSUER_TYPE: Record<number, string> = {
  1: 'Corporate',
  2: 'Sovereign',
  3: 'NBFC',
  4: 'PSU',
  5: 'Bank',
};

const SECURED_LABEL: Record<number, string> = {
  1: 'Secured',
  2: 'Unsecured',
  3: 'Subordinated',
};

const LISTING_LABEL: Record<number | string, string> = {
  1: 'BSE',
  2: 'NSE',
  3: 'BSE & NSE',
};

const INTEREST_TAX: Record<number, string> = {
  1: 'Tax-free',
  2: 'As per slab',
};

function parseMaturity(d: string | null | undefined): Date | null {
  if (!d) return null;
  const parsed = new Date(d.replace(/\//g, '-') + 'T00:00:00Z');
  return isNaN(parsed.getTime()) ? null : parsed;
}

function shortMat(d: Date | null): string {
  if (!d) return '—';
  return `${MONTHS[d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(2)}`;
}

function fullMat(d: Date | null): string {
  if (!d) return '—';
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function fmtDate(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${dd} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function shortIssuer(name: string, securityName?: string): string {
  // Prefer first meaningful word from issuer; for Govt of India and SDLs, give cleaner short name
  if (/government of india/i.test(name)) return 'Govt of India';
  const sdlMatch = securityName?.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+SDL\b/);
  if (sdlMatch) return `${sdlMatch[1]} SDL`;
  const cleaned = name
    .replace(/\b(LIMITED|LTD|PRIVATE|PVT|CORPORATION|COMPANY|FINANCIERS?|BOARD)\b\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  const titled = cleaned.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  const parts = titled.split(' ').filter(Boolean);
  return parts.slice(0, 4).join(' ') || name;
}

function pickRating(raw: any, isSovereign: boolean): { rating: string; agency?: string; outlook?: string } {
  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const first = arr[0];
  if (first && first.product_rating) {
    return {
      rating: String(first.product_rating),
      agency: first.product_ratings_agency,
      outlook: first.product_outlook,
    };
  }
  if (isSovereign) return { rating: 'SOV' };
  return { rating: '—' };
}

// Per-100-face thresholds for classifying a payout row.
// The API's `interest` field mirrors `interest_topay` on the maturity row (both = 100 + coupon),
// so we can't derive a principal portion by subtraction. Instead, classify by the topay magnitude:
//   topay <= IP_CEILING       → just an interest coupon (typically 0.5–5)
//   topay >  COMBINED_FLOOR   → principal (~100) + accrued interest on top
//   in between                → principal-only payment (rare, partial amortization)
const IP_CEILING = 50;
const COMBINED_FLOOR = 100.5;

function classifyPayout(rawTopay: number): PayoutKind {
  if (rawTopay <= IP_CEILING) return 'ip';
  if (rawTopay > COMBINED_FLOOR) return 'combined';
  return 'principal';
}

function buildPayoutSchedule(
  rawProduct: any,
  minInvest: number,
): { schedule: PayoutEntry[]; full: PayoutEntry[]; total: number; perPayout: number } {
  const cf = rawProduct?.cashflow;
  let details: any = null;
  if (Array.isArray(cf)) {
    details = cf[0]?.details;
  } else if (cf && typeof cf === 'object') {
    details = cf.details;
  }
  if (!Array.isArray(details) || details.length === 0) {
    return { schedule: [], full: [], total: 0, perPayout: 0 };
  }
  // The API quotes interest_topay in rupees per ₹100 of face value.
  // Scale to actual rupees the holder of `minInvest` would receive.
  const scale = minInvest / 100;
  const now = Date.now();
  const total = details.length;

  const full: PayoutEntry[] = details.map((d: any) => {
    const dt = new Date(d.date);
    const rawTopay = typeof d.interest_topay === 'number' ? d.interest_topay : (d.interest ?? 0);
    const amount = Math.round(rawTopay * scale * 100) / 100;
    return {
      date: fmtDate(dt),
      day: d.day,
      label: '',
      amount,
      isNext: false,
      kind: classifyPayout(rawTopay),
    };
  });

  const upcomingIdx = full.findIndex((_, i) => {
    const t = new Date(details[i].date).getTime();
    return !isNaN(t) && t >= now;
  });
  const startIdx = upcomingIdx >= 0 ? upcomingIdx : Math.max(0, full.length - 3);
  const next3 = full.slice(startIdx, startIdx + 3).map((entry, i) => {
    const dt = new Date(details[startIdx + i].date);
    const days = daysBetween(dt, new Date());
    const ord = i === 0 ? 'Next' : i === 1 ? '2nd' : '3rd';
    return {
      ...entry,
      label: i === 0 ? `Next payout · in ${Math.max(0, days)} days` : `${ord} payout`,
      isNext: i === 0,
    };
  });

  // Mark the corresponding entry as `isNext` in the full schedule too
  if (upcomingIdx >= 0) {
    full[upcomingIdx] = { ...full[upcomingIdx], isNext: true };
  }

  const firstAmount = next3[0]?.amount ?? 0;
  return { schedule: next3, full, total, perPayout: Math.round(firstAmount * 100) / 100 };
}

function buildDocuments(rawProduct: any): DocumentLink[] {
  const docs: DocumentLink[] = [];
  // Order: most-formal disclosures first, then supporting docs, then rating rationales
  if (rawProduct?.im_file) docs.push({ label: 'Information memorandum', url: rawProduct.im_file });
  if (rawProduct?.termsheet_file) docs.push({ label: 'Term sheet', url: rawProduct.termsheet_file });
  if (rawProduct?.issue_highlights_file)
    docs.push({ label: 'Issue highlights', url: rawProduct.issue_highlights_file });
  if (rawProduct?.briefissuer_file)
    docs.push({ label: 'Issuer brief', url: rawProduct.briefissuer_file });

  // Rating rationales from each rating agency (one row per agency that publishes a URL)
  const ratingsRaw = rawProduct?.product_rating;
  const ratings = Array.isArray(ratingsRaw) ? ratingsRaw : ratingsRaw ? [ratingsRaw] : [];
  for (const r of ratings) {
    if (r?.rationale_url) {
      const agency = r.product_ratings_agency || 'Agency';
      docs.push({ label: `Rating rationale · ${agency}`, url: r.rationale_url });
    }
  }

  return docs;
}

function fmtTime(t: string | null | undefined): string | undefined {
  if (!t) return undefined;
  // "18:30:00" → "6:30 PM"
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return t;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${min} ${ampm}`;
}

function fmtDateString(s: string | null | undefined): string | undefined {
  if (!s) return undefined;
  const d = new Date(s.replace(/\//g, '-') + (s.includes('T') ? '' : 'T00:00:00Z'));
  if (isNaN(d.getTime())) return s;
  return fmtDate(d);
}

function deriveType(category: BondCategory, product: any, isSovereign: boolean): string {
  if (category === 'sgb') return 'Sovereign Gold Bond';
  if (category === 'gsec') {
    if (product.security_name?.includes('SDL')) return 'State Loan';
    return 'GSec';
  }
  // bond-secondary
  if (product.secured === 1) return 'Secured NCD';
  if (product.secured === 2) return 'NCD';
  if (product.secured === 3) return 'Subordinated NCD';
  return isSovereign ? 'Govt Bond' : 'Bond';
}

export function mapOffer(offer: any, category: BondCategory): ApiBondDetail {
  const product = offer.product || {};
  const matDate = parseMaturity(product.maturity_date);
  const months = matDate
    ? Math.max(0, Math.round((matDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44)))
    : 0;
  const isSovereign = product.issuer_type === 2;
  const ratingInfo = pickRating(product.product_rating, isSovereign);
  const ytm = typeof offer.yield === 'number' ? offer.yield : product.coupon_rate ?? 0;
  const minInvest = offer.min_investment_amount || product.face_value || 10000;
  // NTV breakdown: per-lot principal = min_qty × face_value × (price / 100).
  // Accrued = whatever's left to reach the API's pre-computed min_investment_amount.
  const minQty = Number(offer.min_qty) || 0;
  const productFace = Number(product.face_value) || 100;
  const pricePer100 = typeof offer.price === 'number' ? offer.price : 100;
  const principalPerLot =
    minQty > 0 ? Math.round(minQty * productFace * pricePer100) / 100 : minInvest;
  const accruedPerLot = Math.max(0, Math.round((minInvest - principalPerLot) * 100) / 100);
  const { schedule, full, total, perPayout } = buildPayoutSchedule(product, minInvest);
  return {
    isin: product.isin,
    category,
    name: shortIssuer(product.issuer_name || '', product.security_name),
    fullName: product.security_name || offer.offer_title,
    type: deriveType(category, product, isSovereign),
    rating: ratingInfo.rating,
    ratingAgency: ratingInfo.agency,
    ratingOutlook: ratingInfo.outlook,
    ytm,
    coupon: product.coupon_rate ?? ytm,
    couponFreq: FREQ[String(product.ip_frequency)] || 'Half-yearly',
    minInvest,
    unitPrice: minInvest,
    minUnits: 1,
    principalPerLot,
    accruedPerLot,
    maturityShort: shortMat(matDate),
    maturityFull: fullMat(matDate),
    tenureMonths: months,
    tenureLabel: offer.tenure || undefined,
    issuerDescription: product.issuer_description || undefined,
    issuerTypeLabel: ISSUER_TYPE[product.issuer_type] || '—',
    security: SECURED_LABEL[product.secured] || (isSovereign ? 'Sovereign-backed' : '—'),
    listing: LISTING_LABEL[product.listing_status] || (isSovereign ? 'NDS-OM' : '—'),
    tax: INTEREST_TAX[product.interest_tax_status] || 'As per slab',
    perPayoutPerMin: perPayout,
    totalPayouts: total,
    payoutSchedule: schedule,
    fullSchedule: full,
    documents: buildDocuments(product),
    remarks: product.remarks || undefined,
    pricePerHundred: typeof offer.price === 'number' ? offer.price : undefined,
    settlementDate: fmtDateString(offer.settlement_date),
    tradeDate: fmtDateString(offer.trade_date),
    quoteValidUntil: fmtTime(offer.quote_validity_time),
  };
}

/* ───────── Test / demo bond ─────────
 * A curated fixture that exercises every BondDetails feature:
 *   - All stat-card fields populated
 *   - Cashflow schedule with next 3 + full 24 (last row = combined IP + Principal)
 *   - Filled-out Bond Info (security, maturity, coupon, freq)
 *   - About the Company with issuer description, key financials, business summary
 *   - Credit Health with agency, reviewed date, rating change note
 *   - Disclosures with IM + Term sheet + Issue highlights + Issuer brief + 2 rating rationales
 *   - All chips on AllBonds (min10k / highYield10 / monthly / bond-secondary)
 */

const TEST_ISIN = 'TEST-INE000000099';

function generateTestSchedule(): {
  schedule: PayoutEntry[];
  full: PayoutEntry[];
  total: number;
  perPayout: number;
} {
  const DAYS_ARR = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const COUNT = 24;
  const monthlyPayout = 95.83;
  const principalLot = 10000;
  const today = new Date();
  // Cursor starts at the 15th of next month
  let cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 15));

  const full: PayoutEntry[] = [];
  for (let i = 0; i < COUNT; i++) {
    const dd = String(cursor.getUTCDate()).padStart(2, '0');
    const dateStr = `${dd} ${MONTHS[cursor.getUTCMonth()]} ${cursor.getUTCFullYear()}`;
    const isLast = i === COUNT - 1;
    const isFirst = i === 0;
    const daysFromNow = Math.max(0, Math.round((cursor.getTime() - today.getTime()) / 86400000));
    let label: string;
    if (isFirst) label = `Next payout · in ${daysFromNow} days`;
    else if (i === 1) label = '2nd payout';
    else if (i === 2) label = '3rd payout';
    else label = `Payout ${i + 1}`;

    full.push({
      date: dateStr,
      day: DAYS_ARR[cursor.getUTCDay()],
      label,
      amount: isLast
        ? Math.round((principalLot + monthlyPayout) * 100) / 100
        : monthlyPayout,
      isNext: isFirst,
      kind: isLast ? 'combined' : 'ip',
    });

    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 15));
  }
  return { schedule: full.slice(0, 3), full, total: COUNT, perPayout: monthlyPayout };
}

function buildTestBond(): ApiBondDetail {
  const { schedule, full, total, perPayout } = generateTestSchedule();
  // Maturity = 24 months out, same day-of-month
  const today = new Date();
  const matDate = new Date(Date.UTC(today.getUTCFullYear() + 2, today.getUTCMonth(), 15));
  const matLabel = `${MONTHS[matDate.getUTCMonth()]} ${matDate.getUTCFullYear()}`;
  return {
    isin: TEST_ISIN,
    category: 'bond-secondary',
    name: 'TEST · Sample Capital',
    fullName: '11.5% SAMPLE CAPITAL LIMITED — Test bond',
    type: 'Secured NCD',
    rating: 'AA+',
    ratingAgency: 'CRISIL',
    ratingOutlook: 'Stable',
    ytm: 13.99,
    coupon: 11.5,
    couponFreq: 'Monthly',
    minInvest: 10000,
    unitPrice: 10000,
    minUnits: 1,
    principalPerLot: 9965,
    accruedPerLot: 35,
    maturityShort: `${MONTHS[matDate.getUTCMonth()]} '${String(matDate.getUTCFullYear()).slice(2)}`,
    maturityFull: matLabel,
    tenureMonths: 24,
    tenureLabel: '2y',
    issuerDescription:
      'Sample Capital Limited is a fictional non-banking financial company created to demonstrate Blostem\'s bond-presentation features. With assets under management of ₹38,400 crore as of FY24, the company specialises in mid-market lending across retail consumer credit, MSME financing, and affordable housing. Founded in 1998 and listed on both NSE and BSE, Sample Capital operates 240 branches across 18 states and serves 12.4 million customers.',
    issuerTypeLabel: 'NBFC',
    security: 'Secured · First charge on receivables',
    listing: 'NSE & BSE',
    tax: 'As per slab',
    perPayoutPerMin: perPayout,
    totalPayouts: total,
    payoutSchedule: schedule,
    fullSchedule: full,
    documents: [
      { label: 'Information memorandum', url: 'https://example.com/sample-im.pdf' },
      { label: 'Term sheet', url: 'https://example.com/sample-termsheet.pdf' },
      { label: 'Issue highlights', url: 'https://example.com/sample-highlights.pdf' },
      { label: 'Issuer brief', url: 'https://example.com/sample-brief.pdf' },
      { label: 'Rating rationale · CRISIL', url: 'https://crisilratings.com/sample' },
      { label: 'Rating rationale · ICRA', url: 'https://icra.in/sample' },
    ],
    remarks:
      'Investment in non-convertible debentures involves credit risk, liquidity risk, and reinvestment risk. AA+ ratings are investment-grade but do not eliminate default risk. Read the full information memorandum and term sheet before investing.',
    pricePerHundred: 99.65,
    settlementDate: '17 May 2026',
    quoteValidUntil: '6:30 PM',
    ratingReviewedAt: '12 Sep 2026',
    ratingChangeNote: 'Upgraded from AA in Aug 2026 due to improved asset quality and capital coverage.',
    financials: {
      auditedNote: 'FY24 audited · CRISIL rated',
      metrics: [
        { label: 'Revenue', value: '₹4,820 Cr', delta: '↑ 12%' },
        { label: 'Net profit', value: '₹398 Cr', delta: '↑ 8%' },
        { label: 'AUM', value: '₹38,400 Cr', delta: '↑ 14%' },
        { label: 'Capital adequacy', value: '21.4%', delta: '↑ 1.8 pp' },
      ],
      summary:
        'Sample Capital is a diversified NBFC with a stable funding profile and strong granular retail book. The recent AA+ upgrade reflects improved asset quality (gross NPA at 1.8%), higher coverage, and consistent profitability across cycles.',
    },
  };
}

const TEST_BOND = buildTestBond();

let cache: BondsResponse | null = null;

// Default page size large enough to capture every offer per category in one
// shot. Server's ?length= param controls page size; bond-secondary's natural
// page size is 12 — without this we drop 2 of 14 items. Bump if categories grow.
const PAGE_SIZE = 200;

async function fetchCategory(category: BondCategory): Promise<{ items: ApiBondDetail[]; total: number; error?: string }> {
  try {
    const res = await fetch(`/api/offers/${category}?length=${PAGE_SIZE}`);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { items: [], total: 0, error: `${category}: API ${res.status} ${body || res.statusText}` };
    }
    const json = await res.json();
    const items = (json.data || []).map((o: any) => mapOffer(o, category));
    return { items, total: json.total ?? items.length };
  } catch (e: any) {
    return { items: [], total: 0, error: `${category}: ${e?.message || 'fetch failed'}` };
  }
}

export async function fetchBonds(): Promise<BondsResponse> {
  if (cache) return cache;
  const results = await Promise.all(BOND_CATEGORIES.map(fetchCategory));
  const merged: ApiBondDetail[] = [TEST_BOND];
  let total = 1;
  const errors: string[] = [];
  for (const r of results) {
    merged.push(...r.items);
    total += r.total;
    if (r.error) errors.push(r.error);
  }
  if (merged.length === 1 && errors.length > 0) {
    // Only the test bond — surface the API failure rather than silently
    // showing just the demo item.
    throw new Error(errors.join(' | '));
  }
  const mapped: BondsResponse = { data: merged, total };
  cache = mapped;
  return mapped;
}

export function getCachedBond(isin: string): ApiBondDetail | undefined {
  return cache?.data.find((b) => b.isin === isin);
}

export async function fetchBondDetail(isin: string): Promise<ApiBondDetail> {
  const list = await fetchBonds();
  const found = list.data.find((b) => b.isin === isin);
  if (!found) {
    throw new Error(`Bond ${isin} not in current offers`);
  }
  return found;
}
