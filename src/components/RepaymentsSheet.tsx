// Tabular view of upcoming repayments grouped by month. Opens from the
// Repayments card on /portfolio when the user taps the mini chart.

import { X } from 'lucide-react';
import { useDialogA11y } from '../hooks/useDialogA11y';
import type { RepaymentRow } from '../api/orders';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtINR(n: number): string {
  return n.toLocaleString('en-IN');
}

function fmtDate(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]}`;
}

function fmtMonthLong(monthKey: string): string {
  const [y, m] = monthKey.split('-');
  return `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][parseInt(m, 10) - 1]} ${y}`;
}

export default function RepaymentsSheet({
  rows,
  onClose,
}: {
  rows: RepaymentRow[];
  onClose: () => void;
}) {
  const dialogRef = useDialogA11y(true, onClose);
  const totalInterest = rows
    .filter((r) => !r.isPrincipal)
    .reduce((s, r) => s + r.amount, 0);
  const totalPrincipal = rows
    .filter((r) => r.isPrincipal)
    .reduce((s, r) => s + r.amount, 0);

  // Group by monthKey, preserving sorted order
  const grouped: { monthKey: string; rows: RepaymentRow[] }[] = [];
  let current: { monthKey: string; rows: RepaymentRow[] } | null = null;
  for (const r of rows) {
    if (!current || current.monthKey !== r.monthKey) {
      current = { monthKey: r.monthKey, rows: [] };
      grouped.push(current);
    }
    current.rows.push(r);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="fade-in flex-1 bg-black/55" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="repayments-sheet-title"
        className="sheet-up bg-white rounded-t-[24px] flex flex-col max-h-[88vh]"
      >
        <div className="px-5 pt-3 pb-2 shrink-0">
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 rounded-full bg-[#E5E5E5]" />
          </div>
          <div className="flex justify-between items-start mb-3">
            <div className="min-w-0 pr-2">
              <div className="text-[12px] text-[#737373] uppercase tracking-wider font-medium">
                Upcoming repayments
              </div>
              <div id="repayments-sheet-title" className="text-[17px] font-semibold tracking-tight mt-0.5">
                Next 12 months
              </div>
              <div className="text-[12px] text-[#737373] mt-0.5 tnum">{rows.length} payouts</div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-[#F5F5F5] active:scale-95 transition shrink-0"
            >
              <X className="w-4 h-4 text-[#737373]" strokeWidth={2} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 bg-[#F5F5F5] rounded-[12px] p-3">
            <Cell label="Interest" value={`₹${fmtINR(totalInterest)}`} color="#16A34A" />
            <Cell label="Principal" value={`₹${fmtINR(totalPrincipal)}`} color="#0369A1" />
            <Cell
              label="Total"
              value={`₹${fmtINR(totalInterest + totalPrincipal)}`}
              color="#0A0A0A"
            />
          </div>
        </div>

        <div className="overflow-y-auto px-5 pb-6 flex-1">
          {grouped.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-[#737373]">
              No repayments in the next 12 months
            </div>
          ) : (
            grouped.map(({ monthKey, rows: monthRows }) => {
              const monthTotal = monthRows.reduce((s, r) => s + r.amount, 0);
              return (
                <div key={monthKey} className="mt-4">
                  <div className="flex justify-between items-baseline mb-1.5">
                    <div className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider">
                      {fmtMonthLong(monthKey)}
                    </div>
                    <div className="text-[11px] text-[#A3A3A3] tnum">
                      ₹{fmtINR(monthTotal)}
                    </div>
                  </div>
                  <div className="bg-white border border-[#EBEBEB] rounded-[12px] overflow-hidden">
                    {monthRows.map((r, i, a) => (
                      <div
                        key={`${r.holdingNo}-${r.date}`}
                        className={`flex items-center gap-3 px-4 py-3 ${
                          i < a.length - 1 ? 'border-b border-[#F0F0F0]' : ''
                        }`}
                      >
                        <div className="w-9 text-[11px] text-[#A3A3A3] tnum text-right shrink-0">
                          {fmtDate(r.date)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium truncate">
                            {r.holdingName}
                          </div>
                          <div className="text-[11px] text-[#A3A3A3] mt-0.5">
                            {r.isPrincipal ? 'IP + Principal' : 'Coupon'}
                          </div>
                        </div>
                        <div
                          className="text-[13px] font-semibold tnum text-right"
                          style={r.isPrincipal ? { color: '#0369A1' } : { color: '#16A34A' }}
                        >
                          ₹{fmtINR(r.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function Cell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="text-[10px] text-[#737373] uppercase tracking-wider font-medium">{label}</div>
      <div className="text-[13px] font-semibold mt-1 tnum truncate" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
