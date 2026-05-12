// In-progress orders list: anything that isn't yet a holding (payment
// pending, payment failed, awaiting allotment, etc.). Once an order has
// SECURITY.CREDITED + payment SUCCESS, it moves to /portfolio as a holding.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Inbox } from 'lucide-react';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import {
  getPendingOrders,
  subscribeOrder,
  type OrderRecord,
  type PaymentStatus,
} from '../api/orders';

const STATUS_BADGE: Record<
  PaymentStatus,
  { label: string; bg: string; fg: string }
> = {
  PENDING: { label: 'Pending payment', bg: '#FEF3C7', fg: '#92400E' },
  SUCCESS: { label: 'Settling', bg: '#E0F2FE', fg: '#0369A1' },
  FAILED: { label: 'Failed', bg: '#FEE2E2', fg: '#DC2626' },
  DROPPED: { label: 'Dropped', bg: '#FEE2E2', fg: '#DC2626' },
};

function fmtINR(n: number): string {
  return n.toLocaleString('en-IN');
}

function fmtDate(ts: number): string {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, '0');
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  return `${dd} ${M}, ${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
}

export default function OrdersList() {
  const navigate = useNavigate();
  const [, force] = useState(0);
  const orders = getPendingOrders();

  // Subscribe to all pending orders so the list updates as webhooks arrive
  useEffect(() => {
    const unsubs = orders.map((o) => subscribeOrder(o.orderNo, () => force((n) => n + 1)));
    return () => unsubs.forEach((u) => u());
  }, [orders.length]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <div className="flex items-center justify-between px-4 pt-2 pb-3.5">
        <button
          onClick={() => navigate('/')}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#EBEBEB] active:scale-95 transition"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={1.75} />
        </button>
        <div className="text-[18px] font-semibold tracking-tight">Orders in progress</div>
        <div className="w-9 h-9" />
      </div>

      <div className="px-5 pb-2 flex justify-between items-baseline">
        <div className="text-[12px] font-semibold text-[#737373] uppercase tracking-wider">
          {orders.length} {orders.length === 1 ? 'order' : 'orders'}
        </div>
        <button
          onClick={() => navigate('/portfolio')}
          className="text-[12px] font-medium"
        >
          View holdings →
        </button>
      </div>

      <div className="flex-1 px-5 pb-6 flex flex-col gap-2.5">
        {orders.length === 0 ? (
          <EmptyState
            icon={<Inbox className="w-5 h-5 text-[#737373]" strokeWidth={1.75} />}
            title="No orders in progress"
            message="Anything you've placed but not yet credited to demat will show here. Completed orders are in your Portfolio."
            actionLabel="Browse bonds"
            onAction={() => navigate('/')}
          />
        ) : (
          orders.map((o, i) => (
            <div key={o.orderNo} className="rise" style={{ animationDelay: `${60 + i * 40}ms` }}>
              <OrderRow order={o} onClick={() => navigate(`/orders/${o.orderNo}`)} />
            </div>
          ))
        )}
      </div>

      <Footer />
    </div>
  );
}

function OrderRow({ order, onClick }: { order: OrderRecord; onClick: () => void }) {
  const badge = STATUS_BADGE[order.paymentStatus];
  const isBond = order.kind === 'bond';
  const title = isBond ? order.bondName ?? 'Bond' : `${order.issuerName} · ${order.seriesLabel}`;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-[#EBEBEB] rounded-[14px] p-4 active:scale-[0.99] transition"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 pr-2">
          <div className="text-[14px] font-semibold tracking-tight truncate">{title}</div>
          <div className="text-[11px] text-[#A3A3A3] mt-0.5 tnum">
            {order.orderNo} · {fmtDate(order.createdAt)}
          </div>
        </div>
        <span
          className="text-[10px] font-semibold px-2 py-1 rounded uppercase tracking-wider whitespace-nowrap shrink-0"
          style={{ background: badge.bg, color: badge.fg }}
        >
          {badge.label}
        </span>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-[#F0F0F0]">
        <div className="flex items-baseline gap-2">
          <div className="text-[16px] font-semibold tracking-tight tnum">
            ₹{fmtINR(order.amount)}
          </div>
          <div className="text-[12px] text-[#737373] tnum">{order.ytm}% YTM</div>
        </div>
        <div className="text-[12px] font-semibold text-[#0A0A0A]">View →</div>
      </div>
    </button>
  );
}
