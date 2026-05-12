// Portfolio: holdings derived from successfully-credited orders. Pending /
// in-progress orders live on /orders and don't count here.
//
// Layout:
//   - KPI hero (current value, gain, invested, earned, avg yield)
//   - Pending orders banner (if any)
//   - Upcoming repayments card (mini bar chart, tap → tabular sheet)
//   - Holdings list (tap row → HoldingSheet with Sell flow)

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, ChevronLeft, Wallet } from 'lucide-react';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import HoldingSheet from '../components/HoldingSheet';
import RepaymentsSheet from '../components/RepaymentsSheet';
import {
  bucketRepaymentsByMonth,
  estimatedAccruedGain,
  getHoldings,
  getPendingOrders,
  getRepaymentSchedule,
  subscribeOrder,
  summarizeHoldings,
  type OrderRecord,
} from '../api/orders';

function fmtINR(n: number): string {
  return n.toLocaleString('en-IN');
}

function fmtINRShort(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `₹${n}`;
}

export default function Portfolio() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [, force] = useState(0);
  const [openHolding, setOpenHolding] = useState<OrderRecord | null>(null);
  const [repaymentsOpen, setRepaymentsOpen] = useState(false);

  const holdings = getHoldings();
  const pendingCount = getPendingOrders().length;
  const summary = summarizeHoldings(holdings);

  const repaymentRows = useMemo(() => getRepaymentSchedule(12, 3), [holdings.length]);
  const monthBuckets = useMemo(
    () => bucketRepaymentsByMonth(repaymentRows, new Date(), 3, 12),
    [repaymentRows],
  );
  const upcomingTotal = useMemo(
    () => monthBuckets.filter((b) => !b.isPast).reduce((s, b) => s + b.amount, 0),
    [monthBuckets],
  );

  useEffect(() => {
    const all = [...holdings, ...getPendingOrders()];
    const unsubs = all.map((o) => subscribeOrder(o.orderNo, () => force((n) => n + 1)));
    return () => unsubs.forEach((u) => u());
  }, [holdings.length, pendingCount]);

  const isEmpty = searchParams.get('empty') === '1' || holdings.length === 0;

  if (isEmpty) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
        <Header onBack={() => navigate('/')} />
        <div className="flex-1 px-5 pb-6 flex items-center justify-center">
          <div className="max-w-sm w-full">
            <EmptyState
              icon={<Wallet className="w-5 h-5 text-[#737373]" strokeWidth={1.75} />}
              title="No holdings yet"
              message="Your portfolio is empty. Once an order settles to demat it shows here. In-progress orders live on the Orders screen."
              actionLabel="Browse bonds"
              onAction={() => navigate('/')}
            />
          </div>
        </div>
        {pendingCount > 0 && (
          <div className="px-5 pb-4">
            <button
              onClick={() => navigate('/orders')}
              className="w-full bg-white border border-[#EBEBEB] rounded-[14px] p-3.5 flex items-center justify-between active:scale-[0.99] transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: '#D97706' }} />
                <div className="text-[13px] font-medium">
                  {pendingCount} {pendingCount === 1 ? 'order' : 'orders'} in progress
                </div>
              </div>
              <div className="text-[12px] font-semibold text-[#0A0A0A]">View →</div>
            </button>
          </div>
        )}
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <Header onBack={() => navigate('/')} />

      <div className="flex-1 px-5 pb-6 overflow-y-auto">
        {/* KPI hero */}
        <div className="bg-white border border-[#EBEBEB] rounded-[18px] p-5 mb-3 rise" style={{ animationDelay: '0ms' }}>
          <div className="text-[12px] font-semibold text-[#737373] uppercase tracking-wider">Current value</div>
          <div className="flex items-baseline gap-2.5 mt-1.5 flex-wrap">
            <div className="text-[30px] font-bold tracking-tight leading-none tnum">
              ₹{fmtINR(summary.totalValue)}
            </div>
            {summary.totalGain > 0 && (
              <div className="text-[13px] font-semibold tnum" style={{ color: '#16A34A' }}>
                +₹{fmtINR(summary.totalGain)}
              </div>
            )}
          </div>
          <div className="h-px bg-[#F0F0F0] my-4" />
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Invested" value={`₹${fmtINR(summary.totalInvested)}`} />
            <Stat label="Earned" value={`₹${fmtINR(summary.totalGain)}`} color="#16A34A" />
            <Stat label="Avg yield" value={`${summary.avgYtm}%`} />
          </div>
        </div>

        {/* Pending orders banner */}
        {pendingCount > 0 && (
          <button
            onClick={() => navigate('/orders')}
            className="w-full bg-white border border-[#EBEBEB] rounded-[14px] p-3.5 mb-3 flex items-center justify-between active:scale-[0.99] transition rise"
            style={{ animationDelay: '40ms' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: '#D97706' }} />
              <div className="text-[13px] font-medium">
                {pendingCount} {pendingCount === 1 ? 'order' : 'orders'} in progress
              </div>
            </div>
            <div className="text-[12px] font-semibold text-[#0A0A0A]">View →</div>
          </button>
        )}

        {/* Repayments card */}
        {monthBuckets.length > 0 && (
          <button
            onClick={() => setRepaymentsOpen(true)}
            className="w-full text-left bg-white border border-[#EBEBEB] rounded-[16px] p-5 mb-3 active:scale-[0.99] transition rise"
            style={{ animationDelay: '80ms' }}
          >
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <div className="text-[12px] font-semibold text-[#737373] uppercase tracking-wider">
                  Upcoming repayments
                </div>
                <div className="text-[17px] font-semibold mt-1 tnum">
                  ₹{fmtINR(upcomingTotal)}
                  <span className="text-[12px] font-normal text-[#737373] ml-1.5">over 12 months</span>
                </div>
              </div>
              <div className="text-[12px] font-medium text-[#0A0A0A] shrink-0">View all →</div>
            </div>
            <RepaymentChart buckets={monthBuckets} />
          </button>
        )}

        {/* Holdings */}
        <div className="flex justify-between items-baseline pt-1 pb-2.5">
          <div className="text-[12px] font-semibold text-[#737373] uppercase tracking-wider">Your holdings</div>
          <div className="text-[12px] text-[#737373]">
            {holdings.length} {holdings.length === 1 ? 'bond' : 'bonds'}
          </div>
        </div>

        {holdings.map((h, i) => (
          <div
            key={h.orderNo}
            className="rise mb-2.5"
            style={{ animationDelay: `${120 + i * 40}ms` }}
          >
            <HoldingRow holding={h} onClick={() => setOpenHolding(h)} />
          </div>
        ))}

        <Footer />
      </div>

      {openHolding && (
        <HoldingSheet holding={openHolding} onClose={() => setOpenHolding(null)} />
      )}
      {repaymentsOpen && (
        <RepaymentsSheet rows={repaymentRows} onClose={() => setRepaymentsOpen(false)} />
      )}
    </div>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 pt-2 pb-3.5">
      <button
        onClick={onBack}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#EBEBEB] active:scale-95 transition"
      >
        <ChevronLeft className="w-5 h-5" strokeWidth={1.75} />
      </button>
      <div className="text-[18px] font-semibold tracking-tight">Portfolio</div>
      <button className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#EBEBEB] active:scale-95 transition">
        <ArrowUpRight className="w-4 h-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-[12px] text-[#A3A3A3] uppercase tracking-wider font-medium">{label}</div>
      <div className="text-[14px] font-semibold mt-1 tnum" style={color ? { color } : {}}>
        {value}
      </div>
    </div>
  );
}

function RepaymentChart({
  buckets,
}: {
  buckets: { monthLabel: string; amount: number; hasPrincipal: boolean; isPast: boolean }[];
}) {
  const max = Math.max(...buckets.map((b) => b.amount), 1);
  return (
    <div>
      <div className="flex items-end gap-1 h-16">
        {buckets.map((b, i) => {
          const h = Math.max(b.amount > 0 ? 8 : 2, (b.amount / max) * 56);
          const color = b.isPast
            ? '#D4D4D4'
            : b.hasPrincipal
              ? '#0369A1'
              : '#16A34A';
          return (
            <div
              key={i}
              className="flex-1 rounded-t-[3px]"
              style={{
                height: h,
                background: color,
                opacity: b.amount === 0 ? 0.32 : 1,
              }}
            />
          );
        })}
      </div>
      <div className="flex gap-1 mt-1.5">
        {buckets.map((b, i) => {
          const monthOnly = b.monthLabel.split(' ')[0];
          return (
            <div
              key={i}
              className="flex-1 text-center text-[10px] tnum"
              style={{ color: b.isPast ? '#A3A3A3' : '#737373' }}
            >
              {monthOnly}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-2.5 flex-wrap">
        <Legend dot="#D4D4D4" label="Past" />
        <Legend dot="#16A34A" label="Coupon" />
        <Legend dot="#0369A1" label="Coupon + Principal" />
      </div>
    </div>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full" style={{ background: dot }} />
      <div className="text-[10px] text-[#737373]">{label}</div>
    </div>
  );
}

function HoldingRow({ holding, onClick }: { holding: OrderRecord; onClick: () => void }) {
  const isBond = holding.kind === 'bond';
  const title = isBond ? holding.bondName ?? 'Bond' : `${holding.issuerName} · ${holding.seriesLabel}`;
  const sub = isBond
    ? `${holding.qty ?? 1} ${(holding.qty ?? 1) === 1 ? 'lot' : 'lots'}${holding.rating ? ` · ${holding.rating}` : ''}`
    : `${holding.couponFreq}${holding.rating ? ` · ${holding.rating}` : ''}`;
  const gain = estimatedAccruedGain(holding);
  const value = holding.amount + gain;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-[#EBEBEB] rounded-[14px] p-4 active:scale-[0.99] transition"
    >
      <div className="flex justify-between items-start mb-3 gap-3">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold truncate">{title}</div>
          <div className="text-[12px] text-[#A3A3A3] mt-0.5 truncate">{sub}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[14px] font-semibold tnum">₹{fmtINR(value)}</div>
          {gain > 0 && (
            <div className="text-[12px] tnum" style={{ color: '#16A34A' }}>
              +₹{fmtINR(gain)}
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-between items-center pt-3 border-t border-[#F0F0F0]">
        <div className="text-[12px] text-[#737373]">
          {holding.ytm}% YTM · {holding.tenureMonths} mo
        </div>
        <div className="text-[12px] font-semibold text-[#0A0A0A]">Manage →</div>
      </div>
    </button>
  );
}

// Helper kept for the empty-state's potential use (and avoids tree-shake issues
// when re-enabling abbreviated formatting elsewhere)
void fmtINRShort;
