// In-memory checkout state shared across the invest/apply → KYC → place order → PG flow.
// Cleared on placement or explicit cancel.

import type { ApiBondDetail } from './api/bonds';
import type { IpoIssuance, IpoSeries } from './api/ipos';

export type BondCheckout = {
  kind: 'bond';
  bond: ApiBondDetail;
  amount: number;
  qty: number;                  // amount / minInvest
  settlementType: '1' | '2';    // 1 = T+0, 2 = T+1
  startedAt: number;
};

export type IpoCheckout = {
  kind: 'ipo';
  issuance: IpoIssuance;
  series: IpoSeries;
  amount: number;
  startedAt: number;
};

export type Checkout = BondCheckout | IpoCheckout;

let state: Checkout | null = null;
const subscribers = new Set<() => void>();

export function setCheckout(c: Checkout) {
  state = c;
  subscribers.forEach((fn) => fn());
}

export function getCheckout(): Checkout | null {
  return state;
}

export function clearCheckout() {
  state = null;
  subscribers.forEach((fn) => fn());
}

export function subscribeCheckout(fn: () => void): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}
