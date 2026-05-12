// Mock order placement for both bonds (place-order) and IPOs (place-application).
// In production these would POST to the partner backend. The payload shapes
// match the documented contracts so swapping mock-fetch for real-fetch is
// localized to fetch URLs.

import { getSession } from './auth';
import type { BondCheckout, IpoCheckout } from '../checkout';

export type OrderKind = 'bond' | 'ipo';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'DROPPED';

export type PaymentFailureReason =
  | 'GATEWAY_TIMEOUT'
  | 'INSUFFICIENT_FUNDS'
  | 'UPI_NOT_INSTALLED'
  | 'BANK_DOWN'
  | 'USER_CANCELLED'
  | 'GENERIC';

// Webhook order_status values from the contract, mapped to UI stages.
// Bond stages map onto the FUND.* / DEAL.* / SECURITY.* webhook events;
// IPO stages map onto an ASBA + allotment progression.
export type BondStage =
  | 'ORDER.PLACED'
  | 'PAYMENT.SUCCESS'
  | 'FUND.DEBITED'
  | 'FUND.DEBITCONFIRMED'
  | 'DEAL.SETTLED'
  | 'SECURITY.CREDITED';

export type IpoStage =
  | 'APPLICATION.SUBMITTED'
  | 'PAYMENT.SUCCESS'
  | 'FUND.BLOCKED'
  | 'ALLOTMENT.DONE'
  | 'SECURITY.CREDITED';

export type StageEvent = {
  stage: BondStage | IpoStage;
  at: number;
};

export type OrderRecord = {
  orderNo: string;
  kind: OrderKind;
  amount: number;
  createdAt: number;
  paymentStatus: PaymentStatus;
  paymentFailureReason?: PaymentFailureReason;
  events: StageEvent[];
  // Snapshot fields used by Portfolio + Order history (captured at placement
  // so the screens don't need to re-fetch the source bond/IPO).
  ytm: number;
  tenureMonths: number;
  couponFreq: string;
  rating?: string;
  // Bond-only
  bondName?: string;
  bondIsin?: string;
  qty?: number;
  settlementType?: '1' | '2';
  // Bond dealsheet snapshot (captured at placement so /payment doesn't need
  // to re-fetch the source bond)
  pricePerHundred?: number;
  principalAmount?: number;
  accruedAmount?: number;
  settlementDateLabel?: string;
  bondType?: string;
  // IPO-only
  issuerName?: string;
  seriesCode?: string;
  seriesLabel?: string;
  securityId?: string;
  redirectUrl?: string;
};

const subscribers = new Map<string, Set<() => void>>();

function notify(orderNo: string) {
  subscribers.get(orderNo)?.forEach((fn) => fn());
}

export function subscribeOrder(orderNo: string, cb: () => void): () => void {
  if (!subscribers.has(orderNo)) subscribers.set(orderNo, new Set());
  subscribers.get(orderNo)!.add(cb);
  return () => {
    subscribers.get(orderNo)?.delete(cb);
  };
}

export function appendEvent(orderNo: string, stage: BondStage | IpoStage) {
  const r = orders.get(orderNo);
  if (!r) return;
  if (r.events.some((e) => e.stage === stage)) return; // idempotent
  r.events.push({ stage, at: Date.now() });
  notify(orderNo);
}

const orders = new Map<string, OrderRecord>();

function newOrderNo(prefix: string): string {
  // Realistic-looking order id: PREFIX-YYMMDD-XXXX
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${yy}${mm}${dd}-${rand}`;
}

// Documented place-order payload shape — kept verbatim so the contract is visible
// when we swap mock for real.
type PlaceOrderPayload = {
  userId: string;
  offerId: string[];
  data: Record<
    string,
    {
      settlement_type: string;
      bank: { acc_no: number; ifsc: string };
      demat: { dp_id: number };
      qty: string;
    }
  >;
};

function buildBondPayload(c: BondCheckout): PlaceOrderPayload {
  const session = getSession();
  if (!session) throw new Error('No active session');
  // No real offer_id from the API yet — synthesize from ISIN. Easy swap when surfaced.
  const offerId = c.bond.isin;
  return {
    userId: session.userId,
    offerId: [offerId],
    data: {
      [offerId]: {
        settlement_type: c.settlementType,
        bank: {
          acc_no: Number(session.bank.acc_no),
          ifsc: session.bank.ifsc,
        },
        demat: {
          dp_id: Number(session.demat.dp_id),
        },
        qty: String(c.qty),
      },
    },
  };
}

type PlaceApplicationPayload = {
  userId: string;
  securityId: string;
  seriesCode: string;
  amount: number;
  bank: { acc_no: number; ifsc: string };
};

function buildIpoPayload(c: IpoCheckout): PlaceApplicationPayload {
  const session = getSession();
  if (!session) throw new Error('No active session');
  return {
    userId: session.userId,
    securityId: c.issuance.securityId,
    seriesCode: c.series.seriesCode,
    amount: c.amount,
    bank: {
      acc_no: Number(session.bank.acc_no),
      ifsc: session.bank.ifsc,
    },
  };
}

export async function placeBondOrder(c: BondCheckout): Promise<OrderRecord> {
  const payload = buildBondPayload(c);
  // Simulate network latency (≈ real PG handshake)
  await new Promise((r) => setTimeout(r, 1100));
  // Mock: payload constructed for visibility — uncomment to inspect during dev.
  // console.debug('[mock placeBondOrder] payload', payload);
  void payload;

  const orderNo = newOrderNo('BSC');
  const record: OrderRecord = {
    orderNo,
    kind: 'bond',
    amount: c.amount,
    createdAt: Date.now(),
    paymentStatus: 'PENDING',
    events: [{ stage: 'ORDER.PLACED', at: Date.now() }],
    ytm: c.bond.ytm,
    tenureMonths: c.bond.tenureMonths,
    couponFreq: c.bond.couponFreq,
    rating: c.bond.rating,
    bondName: c.bond.name,
    bondIsin: c.bond.isin,
    qty: c.qty,
    settlementType: c.settlementType,
    pricePerHundred: c.bond.pricePerHundred,
    principalAmount: Math.round(c.bond.principalPerLot * c.qty),
    accruedAmount: Math.round(c.bond.accruedPerLot * c.qty),
    settlementDateLabel: c.bond.settlementDate,
    bondType: c.bond.type,
    redirectUrl: `/payment/${orderNo}`,
  };
  orders.set(orderNo, record);
  return record;
}

export async function placeIpoApplication(c: IpoCheckout): Promise<OrderRecord> {
  const payload = buildIpoPayload(c);
  await new Promise((r) => setTimeout(r, 1100));
  void payload;

  const orderNo = newOrderNo('NCD');
  const record: OrderRecord = {
    orderNo,
    kind: 'ipo',
    amount: c.amount,
    createdAt: Date.now(),
    paymentStatus: 'PENDING',
    events: [{ stage: 'APPLICATION.SUBMITTED', at: Date.now() }],
    ytm: c.series.effectiveYield,
    tenureMonths: c.series.tenureMonths,
    couponFreq: c.series.isCumulative ? 'Cumulative' : c.series.ipFrequency || 'Periodic',
    rating: c.issuance.rating,
    issuerName: c.issuance.issuerNameShort,
    seriesCode: c.series.seriesCode,
    seriesLabel: c.series.series,
    securityId: c.issuance.securityId,
    redirectUrl: `/payment/${orderNo}`,
  };
  orders.set(orderNo, record);
  return record;
}

export function getOrderRecord(orderNo: string): OrderRecord | undefined {
  return orders.get(orderNo);
}

// Permanently remove an order from history. Used when the user cancels a
// failed order — there's no value in keeping a dead order around.
export function removeOrder(orderNo: string): boolean {
  const existed = orders.delete(orderNo);
  if (existed) {
    subscribers.get(orderNo)?.forEach((fn) => fn());
    subscribers.delete(orderNo);
  }
  return existed;
}

/* ───────── Portfolio + Order-history helpers ───────── */

// A holding is an order whose money has cleared and units (or allotment) have
// been credited to demat. Anything else is "in progress" and lives on /orders.
export function isHolding(o: OrderRecord): boolean {
  return (
    o.paymentStatus === 'SUCCESS' &&
    o.events.some((e) => e.stage === 'SECURITY.CREDITED')
  );
}

export function isPending(o: OrderRecord): boolean {
  return !isHolding(o);
}

export function getAllOrders(): OrderRecord[] {
  return Array.from(orders.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function getPendingOrders(): OrderRecord[] {
  return getAllOrders().filter(isPending);
}

export function getHoldings(): OrderRecord[] {
  return getAllOrders().filter(isHolding);
}

// Compute estimated current value: principal + accrued interest pro-rated by
// days elapsed × annual yield. Quick approximation for the portfolio KPIs.
export function estimatedAccruedGain(o: OrderRecord, now: number = Date.now()): number {
  const days = Math.max(0, (now - o.createdAt) / (1000 * 60 * 60 * 24));
  const annual = o.amount * (o.ytm / 100);
  return Math.round((annual * days) / 365);
}

/* ───────── Repayment schedule (derived from snapshot fields) ───────── */

const PERIODS_PER_YEAR: Record<string, number> = {
  Monthly: 12,
  Quarterly: 4,
  'Semi-annual': 2,
  'Half-yearly': 2,
  Annual: 1,
};

export type RepaymentRow = {
  date: number; // epoch ms
  monthKey: string; // 'YYYY-MM'
  monthLabel: string; // 'May 26'
  holdingNo: string;
  holdingName: string;
  amount: number;
  isPrincipal: boolean; // includes principal repayment (typically maturity)
  isPast: boolean;     // payout date is before `from`
};

const REPAY_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthKeyFor(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabelFor(d: Date): string {
  return `${REPAY_MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

function holdingDisplayName(r: OrderRecord): string {
  if (r.kind === 'bond') return r.bondName ?? 'Bond';
  return r.issuerName ? `${r.issuerName} · ${r.seriesLabel ?? ''}`.trim() : 'IPO holding';
}

// Generates expected repayment rows in a window [from - monthsBack, from + monthsAhead].
// Past rows are flagged isPast so the chart can render them distinctly.
// Uses snapshot fields (ytm, tenureMonths, couponFreq, amount) — a real impl
// would pull the actual cashflow schedule from the source bond/series API.
export function getRepaymentSchedule(
  monthsAhead = 12,
  monthsBack = 0,
  from: Date = new Date(),
): RepaymentRow[] {
  const horizon = new Date(from);
  horizon.setMonth(horizon.getMonth() + monthsAhead);
  const floor = new Date(from);
  floor.setMonth(floor.getMonth() - monthsBack);
  const rows: RepaymentRow[] = [];

  for (const h of getHoldings()) {
    const maturity = new Date(h.createdAt);
    maturity.setMonth(maturity.getMonth() + h.tenureMonths);
    const freq = h.couponFreq;
    const periodsPerYear = PERIODS_PER_YEAR[freq];

    if (!periodsPerYear || freq === 'Cumulative') {
      // Single lump-sum at maturity (principal + accumulated interest)
      if (maturity >= floor && maturity <= horizon) {
        const totalReturn = (h.amount * h.ytm * h.tenureMonths) / 100 / 12;
        rows.push({
          date: maturity.getTime(),
          monthKey: monthKeyFor(maturity),
          monthLabel: monthLabelFor(maturity),
          holdingNo: h.orderNo,
          holdingName: holdingDisplayName(h),
          amount: Math.round(h.amount + totalReturn),
          isPrincipal: true,
          isPast: maturity < from,
        });
      }
      continue;
    }

    const monthStep = 12 / periodsPerYear;
    const perPayout = Math.round((h.amount * h.ytm) / 100 / periodsPerYear);

    // Start from first scheduled coupon, then walk through every period
    // that falls within the window.
    let cursor = new Date(h.createdAt);
    cursor.setMonth(cursor.getMonth() + monthStep);
    while (cursor < floor && cursor < maturity) {
      cursor.setMonth(cursor.getMonth() + monthStep);
    }
    while (cursor <= horizon && cursor <= maturity) {
      const daysToMat = Math.abs(cursor.getTime() - maturity.getTime()) / 86400000;
      const isMaturity = daysToMat < 14;
      rows.push({
        date: cursor.getTime(),
        monthKey: monthKeyFor(cursor),
        monthLabel: monthLabelFor(cursor),
        holdingNo: h.orderNo,
        holdingName: holdingDisplayName(h),
        amount: isMaturity ? perPayout + h.amount : perPayout,
        isPrincipal: isMaturity,
        isPast: cursor < from,
      });
      cursor = new Date(cursor);
      cursor.setMonth(cursor.getMonth() + monthStep);
    }
  }

  rows.sort((a, b) => a.date - b.date);
  return rows;
}

export type MonthBucket = {
  monthKey: string;
  monthLabel: string;
  amount: number;
  hasPrincipal: boolean;
  isPast: boolean;
};

// Always returns a contiguous range of months [from - monthsBack, from + monthsAhead),
// even months with no payouts (amount = 0). Lets the chart render a stable
// number of bars regardless of how many actual rows fall in the window.
export function bucketRepaymentsByMonth(
  rows: RepaymentRow[],
  from: Date = new Date(),
  monthsBack = 0,
  monthsAhead = 12,
): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  for (let i = -monthsBack; i < monthsAhead; i++) {
    const d = new Date(from);
    d.setMonth(d.getMonth() + i);
    buckets.push({
      monthKey: monthKeyFor(d),
      monthLabel: monthLabelFor(d),
      amount: 0,
      hasPrincipal: false,
      isPast: i < 0,
    });
  }
  const byKey = new Map(buckets.map((b) => [b.monthKey, b]));
  for (const r of rows) {
    const b = byKey.get(r.monthKey);
    if (!b) continue;
    b.amount += r.amount;
    if (r.isPrincipal) b.hasPrincipal = true;
  }
  return buckets;
}

/* ───────── Sell requests ───────── */

export type SellRequest = {
  requestNo: string;
  orderNo: string;
  amount: number;
  holdingName: string;
  createdAt: number;
};

const sellRequests = new Map<string, SellRequest>();

export async function placeSellRequest(orderNo: string): Promise<SellRequest> {
  const holding = orders.get(orderNo);
  if (!holding) throw new Error('Holding not found');
  // Simulated round-trip with the place-order API
  await new Promise((r) => setTimeout(r, 900));
  const requestNo = `SELL-${newOrderNo('').replace(/^-/, '')}`;
  const record: SellRequest = {
    requestNo,
    orderNo,
    amount: holding.amount,
    holdingName: holdingDisplayName(holding),
    createdAt: Date.now(),
  };
  sellRequests.set(requestNo, record);
  return record;
}

export function getSellRequests(): SellRequest[] {
  return Array.from(sellRequests.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function summarizeHoldings(holdings: OrderRecord[], now: number = Date.now()) {
  const totalInvested = holdings.reduce((s, o) => s + o.amount, 0);
  const totalGain = holdings.reduce((s, o) => s + estimatedAccruedGain(o, now), 0);
  const totalValue = totalInvested + totalGain;
  const weightedYtm =
    totalInvested === 0
      ? 0
      : holdings.reduce((s, o) => s + o.ytm * o.amount, 0) / totalInvested;
  return {
    count: holdings.length,
    totalInvested,
    totalGain,
    totalValue,
    avgYtm: Math.round(weightedYtm * 100) / 100,
  };
}

export function setPaymentStatus(
  orderNo: string,
  status: PaymentStatus,
  reason?: PaymentFailureReason,
) {
  const r = orders.get(orderNo);
  if (r) {
    r.paymentStatus = status;
    r.paymentFailureReason = status === 'FAILED' ? reason : undefined;
    orders.set(orderNo, r);
    notify(orderNo);
  }
}

// Drives the post-payment timeline. In production these arrive as webhook
// pushes from the partner backend; here we sequence them with timeouts.
export function simulatePostPaymentEvents(orderNo: string) {
  const r = orders.get(orderNo);
  if (!r) return;
  if (r.kind === 'bond') {
    setTimeout(() => appendEvent(orderNo, 'PAYMENT.SUCCESS'), 800);
    setTimeout(() => appendEvent(orderNo, 'FUND.DEBITED'), 1800);
    setTimeout(() => appendEvent(orderNo, 'FUND.DEBITCONFIRMED'), 3000);
    setTimeout(() => appendEvent(orderNo, 'DEAL.SETTLED'), 3600);
    setTimeout(() => appendEvent(orderNo, 'SECURITY.CREDITED'), 5000);
  } else {
    setTimeout(() => appendEvent(orderNo, 'PAYMENT.SUCCESS'), 800);
    setTimeout(() => appendEvent(orderNo, 'FUND.BLOCKED'), 1800);
    setTimeout(() => appendEvent(orderNo, 'ALLOTMENT.DONE'), 3500);
    setTimeout(() => appendEvent(orderNo, 'SECURITY.CREDITED'), 5000);
  }
}
