// Live order status screen. Subscribes to mock webhook events on the order
// record and renders the appropriate timeline: deal-style for bond orders,
// allotment-style for IPO applications. Each timeline step maps to a documented
// webhook event (DEAL.SETTLED / SECURITY.CREDITED / FUND.DEBITCONFIRMED /
// FUND.BLOCKED / ALLOTMENT.DONE …).

import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Check, Loader2, RefreshCw, Wallet, X as XIcon } from 'lucide-react';
import {
  getOrderRecord,
  removeOrder,
  subscribeOrder,
  type BondStage,
  type IpoStage,
  type OrderRecord,
  type PaymentFailureReason,
  type StageEvent,
} from '../api/orders';
import Footer from '../components/Footer';

// Per-reason failure copy. Secondary CTA is always "Cancel order" (handled
// uniformly below), so only the primary action label varies.
const FAILURE_COPY: Record<PaymentFailureReason, { title: string; message: string; primary: string }> = {
  GATEWAY_TIMEOUT: {
    title: 'Payment gateway timed out',
    message: "The bank gateway didn't respond in time. Your money is safe — try again.",
    primary: 'Retry payment',
  },
  INSUFFICIENT_FUNDS: {
    title: 'Insufficient balance',
    message: 'Your bank reported insufficient funds. Add money to your account and retry.',
    primary: 'Retry payment',
  },
  UPI_NOT_INSTALLED: {
    title: 'No UPI app found',
    message: 'No UPI app was available to authorise the payment. Install one or try Netbanking.',
    primary: 'Try Netbanking',
  },
  BANK_DOWN: {
    title: 'Bank server unavailable',
    message: "Your bank's payment system is temporarily unavailable. Retry in a few minutes.",
    primary: 'Retry payment',
  },
  USER_CANCELLED: {
    title: 'Payment cancelled',
    message: 'You exited before completing payment. Your order is held — pay anytime within the quote validity.',
    primary: 'Pay now',
  },
  GENERIC: {
    title: 'Payment failed',
    message: 'Bank declined the transaction. Retry or try a different method.',
    primary: 'Retry payment',
  },
};

type TimelineStep = {
  id: BondStage | IpoStage;
  label: string;
  description: string;
};

const BOND_TIMELINE: TimelineStep[] = [
  { id: 'ORDER.PLACED', label: 'Order placed', description: 'Confirmed with the dealer' },
  { id: 'PAYMENT.SUCCESS', label: 'Payment successful', description: 'Funds received from your bank' },
  { id: 'FUND.DEBITED', label: 'Fund debited', description: 'Sent to clearing' },
  { id: 'FUND.DEBITCONFIRMED', label: 'Fund debit confirmed', description: 'Clearing house has the funds' },
  { id: 'DEAL.SETTLED', label: 'Deal settled', description: 'Trade matched with the seller' },
  { id: 'SECURITY.CREDITED', label: 'Settled to demat', description: 'Units credited to your demat account' },
];

const IPO_TIMELINE: TimelineStep[] = [
  { id: 'APPLICATION.SUBMITTED', label: 'Application submitted', description: 'Validated and queued for allotment' },
  { id: 'PAYMENT.SUCCESS', label: 'Mandate authorised', description: 'ASBA accepted by your bank' },
  { id: 'FUND.BLOCKED', label: 'Funds blocked', description: 'Held in your bank pending allotment' },
  { id: 'ALLOTMENT.DONE', label: 'Allotment confirmed', description: 'Issuer has allotted your units' },
  { id: 'SECURITY.CREDITED', label: 'Settled to demat', description: 'Units credited to your demat account' },
];

function fmtINR(n: number): string {
  return n.toLocaleString('en-IN');
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const hh = d.getHours();
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h = hh % 12 || 12;
  return `${h}:${mm} ${ampm}`;
}

export default function OrderStatus() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [, force] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    const unsub = subscribeOrder(orderId, () => force((n) => n + 1));
    return unsub;
  }, [orderId]);

  const handleRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    // Mock: simulated round-trip. In production this would re-fetch the order
    // and its webhook events from the partner backend. Subscribers already
    // propagate state changes live, so this is mainly a UX affordance.
    setTimeout(() => {
      force((n) => n + 1);
      setRefreshing(false);
    }, 800);
  };

  const record = orderId ? getOrderRecord(orderId) : undefined;

  if (!record) return <Navigate to="/" replace />;

  const isBond = record.kind === 'bond';
  const timeline = isBond ? BOND_TIMELINE : IPO_TIMELINE;
  const eventMap = new Map<string, StageEvent>();
  record.events.forEach((e) => eventMap.set(e.stage, e));

  const failed = record.paymentStatus === 'FAILED';
  const failureCopy = failed ? FAILURE_COPY[record.paymentFailureReason ?? 'GENERIC'] : null;
  const lastDoneIdx = timeline.reduce(
    (acc, step, i) => (eventMap.has(step.id) ? i : acc),
    -1,
  );
  const fullyDone = lastDoneIdx === timeline.length - 1;
  const activeIdx = !failed && !fullyDone ? lastDoneIdx + 1 : -1;

  const heroState: 'pending' | 'done' | 'failed' = failed ? 'failed' : fullyDone ? 'done' : 'pending';

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <div className="flex items-center justify-between px-4 pt-2 pb-3.5">
        <button
          onClick={() => navigate('/')}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#EBEBEB] active:scale-95 transition"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={1.75} />
        </button>
        <div className="text-[14px] font-semibold tracking-tight tnum">{record.orderNo}</div>
        <div className="w-9 h-9" />
      </div>

      <div className="flex-1 px-5 pb-6 overflow-y-auto">
        {/* Hero */}
        <Hero record={record} state={heroState} isBond={isBond} failureTitle={failureCopy?.title} />

        {/* Timeline */}
        <div
          className="bg-white border border-[#EBEBEB] rounded-[16px] p-5 mb-3.5 rise"
          style={{ animationDelay: '60ms' }}
        >
          <div className="text-[12px] font-semibold text-[#737373] uppercase tracking-wider mb-4">
            {isBond ? 'Settlement progress' : 'Allotment progress'}
          </div>
          {timeline.map((step, i) => {
            const ev = eventMap.get(step.id);
            const isDone = !!ev;
            const isActive = i === activeIdx;
            const isLast = i === timeline.length - 1;
            const next = timeline[i + 1];
            const nextDone = next && eventMap.has(next.id);
            const stageFailed = failed && i === activeIdx;
            return (
              <div key={step.id} className="flex gap-3.5">
                <div className="flex flex-col items-center">
                  <Bullet state={stageFailed ? 'failed' : isDone ? 'done' : isActive ? 'active' : 'pending'} />
                  {!isLast && (
                    <div
                      className="w-0.5 flex-1 mt-1"
                      style={{
                        background: isDone && nextDone ? '#16A34A' : '#E5E5E5',
                        minHeight: 22,
                      }}
                    />
                  )}
                </div>
                <div className={`flex-1 ${isLast ? '' : 'pb-4'}`}>
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <div
                      className={`text-[13px] font-semibold ${
                        !isDone && !isActive && !stageFailed ? 'text-[#737373]' : ''
                      }`}
                      style={stageFailed ? { color: '#DC2626' } : {}}
                    >
                      {stageFailed ? failureCopy?.title ?? 'Payment failed' : step.label}
                    </div>
                    {ev && (
                      <div className="text-[11px] text-[#A3A3A3] tnum">{fmtTime(ev.at)}</div>
                    )}
                  </div>
                  <div
                    className={`text-[12px] mt-0.5 ${
                      isDone || isActive || stageFailed ? 'text-[#737373]' : 'text-[#A3A3A3]'
                    }`}
                  >
                    {stageFailed
                      ? failureCopy?.message ?? 'Bank declined the transaction. Retry from payment.'
                      : step.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2.5 rise" style={{ animationDelay: '120ms' }}>
          {failed ? (
            <>
              <button
                onClick={() => navigate(`/payment/${record.orderNo}`, { replace: true })}
                className="bg-[#0A0A0A] text-white rounded-[12px] py-3.5 text-[13px] font-semibold active:scale-[0.99] transition"
              >
                {failureCopy?.primary ?? 'Retry payment'}
              </button>
              <button
                onClick={() => {
                  removeOrder(record.orderNo);
                  navigate('/orders', { replace: true });
                }}
                className="bg-white border border-[#EBEBEB] rounded-[12px] py-3.5 text-[13px] font-semibold active:scale-[0.99] transition"
                style={{ color: '#DC2626' }}
              >
                Cancel order
              </button>
            </>
          ) : fullyDone ? (
            <>
              <button
                onClick={() => navigate('/portfolio')}
                className="bg-[#0A0A0A] text-white rounded-[12px] py-3.5 text-[13px] font-semibold active:scale-[0.99] transition flex items-center justify-center gap-1.5"
              >
                <Wallet className="w-3.5 h-3.5" strokeWidth={2} />
                View Portfolio
              </button>
              <button
                onClick={() => navigate('/')}
                className="bg-white border border-[#EBEBEB] rounded-[12px] py-3.5 text-[13px] font-semibold active:scale-[0.99] transition"
              >
                Back to bonds
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-[#0A0A0A] text-white rounded-[12px] py-3.5 text-[13px] font-semibold disabled:opacity-60 active:scale-[0.99] transition flex items-center justify-center gap-1.5"
              >
                {refreshing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
                    Refreshing…
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" strokeWidth={2.25} />
                    Refresh status
                  </>
                )}
              </button>
              <button
                onClick={() => navigate('/portfolio')}
                className="bg-white border border-[#EBEBEB] rounded-[12px] py-3.5 text-[13px] font-semibold active:scale-[0.99] transition flex items-center justify-center gap-1.5"
              >
                <Wallet className="w-3.5 h-3.5 text-[#737373]" strokeWidth={2} />
                View Portfolio
              </button>
            </>
          )}
        </div>

        <Footer />
      </div>
    </div>
  );
}

function Bullet({ state }: { state: 'done' | 'active' | 'pending' | 'failed' }) {
  if (state === 'done') {
    return (
      <div
        className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-white"
        style={{ background: '#16A34A' }}
      >
        <Check className="w-3 h-3" strokeWidth={3} />
      </div>
    );
  }
  if (state === 'active') {
    return (
      <div
        className="w-[22px] h-[22px] rounded-full bg-white flex items-center justify-center"
        style={{ border: '2px solid #0A0A0A' }}
      >
        <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: '#0A0A0A' }} />
      </div>
    );
  }
  if (state === 'failed') {
    return (
      <div
        className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-white"
        style={{ background: '#DC2626' }}
      >
        <XIcon className="w-3 h-3" strokeWidth={3} />
      </div>
    );
  }
  return <div className="w-[22px] h-[22px] rounded-full bg-white" style={{ border: '2px solid #E5E5E5' }} />;
}

function Hero({
  record,
  state,
  isBond,
  failureTitle,
}: {
  record: OrderRecord;
  state: 'pending' | 'done' | 'failed';
  isBond: boolean;
  failureTitle?: string;
}) {
  const titleByState = {
    pending: isBond ? 'Order in progress' : 'Application in progress',
    done: isBond ? 'Settled to demat' : 'Allotment complete',
    failed: failureTitle ?? 'Payment failed',
  };
  const palette = {
    pending: { ringBg: '#E0F2FE', dotBg: '#0369A1', icon: 'loader' as const },
    done: { ringBg: '#DCFCE7', dotBg: '#16A34A', icon: 'check' as const },
    failed: { ringBg: '#FEE2E2', dotBg: '#DC2626', icon: 'x' as const },
  }[state];
  return (
    <div
      className="bg-white border border-[#EBEBEB] rounded-[18px] py-7 px-5 text-center mb-3.5 rise"
      style={{ animationDelay: '0ms' }}
    >
      <div
        className="w-14 h-14 rounded-full mx-auto mb-3.5 flex items-center justify-center"
        style={{ background: palette.ringBg }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white"
          style={{ background: palette.dotBg }}
        >
          {palette.icon === 'loader' && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={3} />}
          {palette.icon === 'check' && <Check className="w-4 h-4" strokeWidth={3} />}
          {palette.icon === 'x' && <XIcon className="w-4 h-4" strokeWidth={3} />}
        </div>
      </div>
      <div className="text-[19px] font-semibold tracking-tight">{titleByState[state]}</div>
      <div className="text-[13px] text-[#737373] mt-1.5">
        ₹{fmtINR(record.amount)} ·{' '}
        {isBond
          ? `${record.bondName} · ${record.qty} ${record.qty === 1 ? 'lot' : 'lots'}`
          : `${record.issuerName} · ${record.seriesLabel}`}
      </div>
    </div>
  );
}
