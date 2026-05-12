// Confirm-the-deal screen. Renders a formal dealsheet (contract no, security,
// trade breakdown, settlement, counterparties) for bond orders, and an ASBA
// application summary for IPOs. CTA on success routes through the PG simulation;
// failure path drops into the OrderStatus screen with the appropriate reason.

import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';
import {
  getOrderRecord,
  setPaymentStatus,
  simulatePostPaymentEvents,
  type OrderRecord,
  type PaymentFailureReason,
} from '../api/orders';
import { getSession } from '../api/auth';
import Footer from '../components/Footer';
import { emit } from '../telemetry';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtINR(n: number): string {
  return n.toLocaleString('en-IN');
}

function fmtDateTime(ts: number): string {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = d.getHours() % 12 || 12;
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
  return `${dd} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm} ${ampm}`;
}

function maskTail(s: string | undefined, visible = 4): string {
  if (!s) return '—';
  if (s.length <= visible) return s;
  return '••••' + s.slice(-visible);
}

export default function Payment() {
  const navigate = useNavigate();
  const { orderNo } = useParams();
  const record = orderNo ? getOrderRecord(orderNo) : undefined;
  const session = getSession();
  const [phase, setPhase] = useState<'idle' | 'processing'>('idle');
  const [showFailureMenu, setShowFailureMenu] = useState(false);

  if (!record || !session) return <Navigate to="/" replace />;

  const isBond = record.kind === 'bond';

  const handleSuccess = () => {
    if (phase === 'processing' || !orderNo) return;
    setPhase('processing');
    setTimeout(() => {
      setPaymentStatus(orderNo, 'SUCCESS');
      simulatePostPaymentEvents(orderNo);
      emit('bonds.payment.success', { orderNo, amount: record.amount, kind: record.kind });
      navigate(`/orders/${orderNo}`, { replace: true });
    }, 1400);
  };

  const handleFailure = (reason: PaymentFailureReason) => {
    if (phase === 'processing' || !orderNo) return;
    setPhase('processing');
    setShowFailureMenu(false);
    setTimeout(() => {
      setPaymentStatus(orderNo, 'FAILED', reason);
      emit('bonds.payment.failed', {
        orderNo,
        reason,
        amount: record.amount,
        kind: record.kind,
      });
      navigate(`/orders/${orderNo}`, { replace: true });
    }, 900);
  };

  const failureOptions: { reason: PaymentFailureReason; label: string }[] = [
    { reason: 'GATEWAY_TIMEOUT', label: 'Gateway timeout' },
    { reason: 'INSUFFICIENT_FUNDS', label: 'Insufficient funds' },
    { reason: 'UPI_NOT_INSTALLED', label: 'No UPI app' },
    { reason: 'BANK_DOWN', label: 'Bank server down' },
    { reason: 'USER_CANCELLED', label: 'User cancelled' },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <div className="flex items-center justify-between px-4 pt-2 pb-3.5">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#EBEBEB] active:scale-95 transition"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={1.75} />
        </button>
        <div className="text-[15px] font-semibold tracking-tight">
          {isBond ? 'Confirm deal' : 'Confirm application'}
        </div>
        <div className="w-9 h-9" />
      </div>

      <div className="flex-1 px-5 pb-6 overflow-y-auto">
        {isBond ? (
          <BondDealsheet record={record} session={session} />
        ) : (
          <IpoApplicationSheet record={record} session={session} />
        )}

        <div
          className="text-[11px] text-[#A3A3A3] leading-[1.55] mt-3 px-1 rise"
          style={{ animationDelay: '120ms' }}
        >
          By proceeding to pay, you accept the {isBond ? 'deal' : 'application'} terms above.
          This sheet is a binding record of the {isBond ? 'trade' : 'application'} subject to
          settlement at ICCL.
        </div>

        <Footer />
      </div>

      <div className="bg-white border-t border-[#EBEBEB] px-5 pt-3.5 pb-6">
        <button
          onClick={handleSuccess}
          disabled={phase === 'processing'}
          className="w-full bg-[#0A0A0A] text-white py-[15px] rounded-[12px] text-[14px] font-semibold disabled:opacity-50 active:scale-[0.98] transition flex items-center justify-center gap-2"
        >
          {phase === 'processing' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
              {isBond ? 'Processing payment…' : 'Authorising mandate…'}
            </>
          ) : (
            <>{isBond ? `Pay ₹${fmtINR(record.amount)}` : `Authorise ₹${fmtINR(record.amount)}`}</>
          )}
        </button>

        {showFailureMenu ? (
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {failureOptions.map((o) => (
              <button
                key={o.reason}
                onClick={() => handleFailure(o.reason)}
                disabled={phase === 'processing'}
                className="bg-[#F5F5F5] py-2 px-3 rounded-[8px] text-[11px] font-medium text-[#737373] active:scale-95 transition"
              >
                {o.label}
              </button>
            ))}
            <button
              onClick={() => setShowFailureMenu(false)}
              className="col-span-2 py-1.5 text-[10px] uppercase tracking-wider text-[#A3A3A3]"
            >
              Hide
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowFailureMenu(true)}
            disabled={phase === 'processing'}
            className="w-full text-[#A3A3A3] py-2.5 mt-1.5 text-[11px] uppercase tracking-wider transition active:scale-[0.99]"
          >
            Simulate failure
          </button>
        )}
      </div>
    </div>
  );
}

/* ───────── Bond dealsheet ───────── */

function BondDealsheet({
  record,
  session,
}: {
  record: OrderRecord;
  session: NonNullable<ReturnType<typeof getSession>>;
}) {
  const sName = `T+${record.settlementType === '1' ? '0' : '1'}`;
  return (
    <div
      className="bg-white border border-[#EBEBEB] rounded-[16px] rise"
      style={{ animationDelay: '0ms' }}
    >
      <Section label="Deal confirmation">
        <Row k="Contract no." v={record.orderNo} mono />
        <Row k="Trade date" v={fmtDateTime(record.createdAt)} />
        <Row k="Settlement" v={`${record.settlementDateLabel ?? '—'} · ${sName}`} />
      </Section>

      <Section label="Security">
        <Row k="Issuer" v={record.bondName ?? '—'} />
        <Row k="ISIN" v={record.bondIsin ?? '—'} mono />
        <Row k="Type" v={record.bondType ?? '—'} />
        <Row k="Rating" v={record.rating ?? '—'} />
        <Row k="Coupon" v={`${record.couponFreq} · YTM ${record.ytm}%`} />
        <Row k="Tenure" v={`${record.tenureMonths} months`} />
      </Section>

      <Section label="Trade breakdown">
        <Row k="Quantity" v={`${record.qty ?? 1} ${(record.qty ?? 1) === 1 ? 'lot' : 'lots'}`} />
        {record.pricePerHundred != null && (
          <Row k="Clean price" v={`₹${record.pricePerHundred} / ₹100 face`} mono />
        )}
        {record.principalAmount != null && (
          <Row k="Principal" v={`₹${fmtINR(record.principalAmount)}`} mono />
        )}
        {record.accruedAmount != null && record.accruedAmount > 0 && (
          <Row k="Accrued interest" v={`₹${fmtINR(record.accruedAmount)}`} mono />
        )}
        <Row k="Net traded value" v={`₹${fmtINR(record.amount)}`} mono bold />
      </Section>

      <Section label="Settlement">
        <Row
          k="Bank"
          v={`${maskTail(session.bank.acc_no)} · ${session.bank.ifsc}`}
          mono
        />
        <Row k="Demat" v={maskTail(session.demat.dp_id)} mono />
        <Row k="Clearing" v="ICCL · Indian Clearing Corporation" />
      </Section>

      <Section label="Counterparties" last>
        <Row k="Buyer" v={session.email} />
        <Row k="Dealer desk" v="TheFixedIncome (Tipsons)" />
      </Section>
    </div>
  );
}

/* ───────── IPO application sheet ───────── */

function IpoApplicationSheet({
  record,
  session,
}: {
  record: OrderRecord;
  session: NonNullable<ReturnType<typeof getSession>>;
}) {
  return (
    <div
      className="bg-white border border-[#EBEBEB] rounded-[16px] rise"
      style={{ animationDelay: '0ms' }}
    >
      <Section label="Application">
        <Row k="Application no." v={record.orderNo} mono />
        <Row k="Date" v={fmtDateTime(record.createdAt)} />
      </Section>

      <Section label="Security">
        <Row k="Issuer" v={record.issuerName ?? '—'} />
        <Row k="Series" v={record.seriesLabel ?? '—'} mono />
        <Row k="Security ID" v={record.securityId ?? '—'} mono />
        <Row k="Coupon" v={`${record.couponFreq} · Effective yield ${record.ytm}%`} />
        <Row k="Tenure" v={`${record.tenureMonths} months`} />
      </Section>

      <Section label="Application amount">
        <Row k="Amount applied" v={`₹${fmtINR(record.amount)}`} mono bold />
      </Section>

      <Section label="ASBA mandate" last>
        <Row
          k="Block from"
          v={`${maskTail(session.bank.acc_no)} · ${session.bank.ifsc}`}
          mono
        />
        <Row k="Demat for credit" v={maskTail(session.demat.dp_id)} mono />
        <Row k="Allotment" v="On issue close · refund of unallocated portion" />
      </Section>
    </div>
  );
}

function Section({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <>
      <div className="px-5 pt-4 pb-2">
        <div className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider">
          {label}
        </div>
      </div>
      <div className="px-5 pb-2">{children}</div>
      {!last && <div className="h-px bg-[#F0F0F0] mx-5" />}
    </>
  );
}

function Row({
  k,
  v,
  mono,
  bold,
}: {
  k: string;
  v: string;
  mono?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3 py-2 items-baseline">
      <div className="text-[12px] text-[#737373] shrink-0">{k}</div>
      <div
        className={`text-right break-words ${bold ? 'text-[15px] font-bold' : 'text-[13px] font-medium'} ${mono ? 'tnum tracking-[0.04em]' : ''}`}
      >
        {v}
      </div>
    </div>
  );
}
