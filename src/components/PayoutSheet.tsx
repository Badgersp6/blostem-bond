import { useMemo } from 'react';
import { X } from 'lucide-react';
import type { PayoutEntry, PayoutKind } from '../api/bonds';
import { useDialogA11y } from '../hooks/useDialogA11y';

const KIND_LABEL: Record<PayoutKind, string> = {
  ip: 'IP',
  principal: 'Principal',
  combined: 'IP + Principal',
};

const KIND_STYLE: Record<PayoutKind, { bg: string; fg: string }> = {
  ip: { bg: '#F5F5F5', fg: '#737373' },
  principal: { bg: '#E0F2FE', fg: '#0369A1' },
  combined: { bg: '#DCFCE7', fg: '#16A34A' },
};

export default function PayoutSheet({
  bondName,
  schedule,
  minInvest,
  onClose,
}: {
  bondName: string;
  schedule: PayoutEntry[];
  minInvest: number;
  onClose: () => void;
}) {
  const dialogRef = useDialogA11y(true, onClose);

  const totals = useMemo(() => {
    let interest = 0;
    let principal = 0;
    schedule.forEach((p) => {
      if (p.kind === 'ip') interest += p.amount;
      else if (p.kind === 'principal') principal += p.amount;
      else {
        // For combined rows, split via heuristic: the principal portion is roughly minInvest
        principal += minInvest;
        interest += Math.max(0, p.amount - minInvest);
      }
    });
    return {
      interest: Math.round(interest * 100) / 100,
      principal: Math.round(principal * 100) / 100,
      total: Math.round((interest + principal) * 100) / 100,
    };
  }, [schedule, minInvest]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="fade-in flex-1 bg-black/55" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payout-sheet-title"
        className="sheet-up bg-white rounded-t-[24px] flex flex-col max-h-[88vh]"
      >
        <div className="px-5 pt-3 pb-2 shrink-0">
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 rounded-full bg-[#E5E5E5]" />
          </div>
          <div className="flex justify-between items-start mb-3">
            <div className="min-w-0 pr-2">
              <div className="text-[12px] text-[#737373] uppercase tracking-wider font-medium">Full payout schedule</div>
              <div id="payout-sheet-title" className="text-[17px] font-semibold tracking-tight mt-0.5 truncate">
                {bondName}
              </div>
              <div className="text-[12px] text-[#737373] mt-0.5 tnum">
                {schedule.length} payouts · on ₹{minInvest.toLocaleString('en-IN')}
              </div>
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
            <SummaryCell label="Interest" value={`₹${totals.interest.toLocaleString('en-IN')}`} color="#16A34A" />
            <SummaryCell label="Principal" value={`₹${totals.principal.toLocaleString('en-IN')}`} color="#0369A1" />
            <SummaryCell label="Total" value={`₹${totals.total.toLocaleString('en-IN')}`} color="#0A0A0A" />
          </div>
        </div>

        <div className="overflow-y-auto px-5 pb-6 flex-1">
          {schedule.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-[#737373]">No payout data available</div>
          ) : (
            <div className="bg-white border border-[#EBEBEB] rounded-[14px] overflow-hidden mt-2">
              {schedule.map((p, i) => {
                const style = KIND_STYLE[p.kind];
                return (
                  <div
                    key={`${p.date}-${i}`}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      i < schedule.length - 1 ? 'border-b border-[#F0F0F0]' : ''
                    }`}
                  >
                    <div className="w-7 text-[11px] text-[#A3A3A3] tnum text-right">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-[13px] font-medium tnum">{p.date}</div>
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider"
                          style={{ background: style.bg, color: style.fg }}
                        >
                          {KIND_LABEL[p.kind]}
                        </span>
                        {p.isNext && (
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider"
                            style={{ background: '#0A0A0A', color: '#FFFFFF' }}
                          >
                            Next
                          </span>
                        )}
                      </div>
                      {p.day && (
                        <div className="text-[11px] text-[#A3A3A3] mt-0.5">{p.day}</div>
                      )}
                    </div>
                    <div
                      className="text-[13px] font-semibold tnum text-right"
                      style={{ color: p.isNext ? '#16A34A' : '#0A0A0A' }}
                    >
                      ₹{p.amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="text-[10px] text-[#737373] uppercase tracking-wider font-medium">{label}</div>
      <div className="text-[13px] font-semibold mt-1 tnum truncate" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
