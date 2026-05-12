import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, Minus, Plus } from 'lucide-react';
import type { ApiBondDetail } from '../api/bonds';
import { setCheckout } from '../checkout';
import { useDialogA11y } from '../hooks/useDialogA11y';
import { emit } from '../telemetry';

const SUB_IG = new Set(['BBB-', 'BB+', 'BB', 'BB-', 'B+', 'B', 'B-', 'CCC', 'CC', 'C', 'D']);

function isSubInvestmentGrade(rating?: string): boolean {
  if (!rating) return false;
  const stripped = rating.replace(/\s*\(.*?\)\s*$/, '').trim();
  return SUB_IG.has(stripped);
}

function fmtINR(n: number): string {
  return n.toLocaleString('en-IN');
}

const MIN_LOTS = 1;
const MAX_LOTS = 100;
const QUICK_LOTS = [1, 3, 5, 10];

export default function InvestSheet({ bond, onClose }: { bond: ApiBondDetail; onClose: () => void }) {
  const navigate = useNavigate();
  const minLot = bond.minInvest || 10000;

  const [lots, setLots] = useState(MIN_LOTS);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const amount = lots * minLot;
  const subIG = isSubInvestmentGrade(bond.rating);
  const months = bond.tenureMonths || 12;
  const annualIncome = (amount * bond.ytm) / 100;
  const totalReturn = (annualIncome * months) / 12;
  const maturityAmount = amount + totalReturn;

  const canDec = lots > MIN_LOTS;
  const canInc = lots < MAX_LOTS;
  const canContinue = !submitting && (!subIG || agreed);

  const dec = () => canDec && setLots((n) => n - 1);
  const inc = () => canInc && setLots((n) => n + 1);

  const handleContinue = () => {
    if (!canContinue) return;
    setSubmitting(true);
    setCheckout({
      kind: 'bond',
      bond,
      amount,
      qty: lots,
      settlementType: '2',
      startedAt: Date.now(),
    });
    emit('bonds.invest.continued', { isin: bond.isin, amount, qty: lots, ytm: bond.ytm });
    setTimeout(() => navigate('/checkout'), 300);
  };

  useEffect(() => {
    emit('bonds.invest.opened', { isin: bond.isin, ytm: bond.ytm, minLot });
  }, [bond.isin, bond.ytm, minLot]);

  const dialogRef = useDialogA11y(true, onClose);

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="fade-in flex-1 bg-black/55" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invest-sheet-title"
        className="sheet-up bg-white rounded-t-[24px] px-5 pt-3 pb-6 flex flex-col max-h-[88vh] overflow-y-auto"
      >
        <div className="flex justify-center mb-3.5">
          <div className="w-10 h-1 rounded-full bg-[#E5E5E5]" />
        </div>

        <div className="flex justify-between items-start mb-5">
          <div className="min-w-0 pr-2">
            <div className="text-[12px] text-[#737373] uppercase tracking-wider font-medium">Invest in</div>
            <div id="invest-sheet-title" className="text-[17px] font-semibold tracking-tight mt-0.5 truncate">
              {bond.name}
            </div>
          </div>
          <div
            className="text-[12px] font-semibold px-2.5 py-1.5 rounded-lg shrink-0 tnum"
            style={{ background: '#DCFCE7', color: '#16A34A' }}
          >
            {bond.ytm}% YTM
          </div>
        </div>

        <div className="text-[12px] text-[#737373] uppercase tracking-wider font-medium mb-2.5">
          Investment amount
        </div>
        <div className="flex items-center justify-between p-1.5 bg-[#F5F5F5] rounded-[14px] mb-3">
          <button
            onClick={dec}
            disabled={!canDec}
            aria-label="Decrease lots"
            className="w-11 h-11 bg-white rounded-[10px] flex items-center justify-center active:scale-95 transition disabled:opacity-40"
          >
            <Minus className="w-5 h-5 text-[#737373]" strokeWidth={2} />
          </button>
          <div className="text-center px-2 min-w-0">
            <div className="text-[24px] font-bold tracking-tight leading-none tnum truncate">
              ₹{fmtINR(amount)}
            </div>
            <div className="text-[12px] text-[#737373] mt-1">
              {lots} {lots === 1 ? 'lot' : 'lots'}
            </div>
          </div>
          <button
            onClick={inc}
            disabled={!canInc}
            aria-label="Increase lots"
            className="w-11 h-11 bg-[#0A0A0A] text-white rounded-[10px] flex items-center justify-center active:scale-95 transition disabled:opacity-40"
          >
            <Plus className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex gap-2 mb-[18px]">
          {QUICK_LOTS.map((v) => {
            const active = lots === v;
            return (
              <button
                key={v}
                onClick={() => setLots(Math.min(MAX_LOTS, v))}
                className={`flex-1 py-2.5 rounded-lg text-[12px] font-semibold transition tnum ${
                  active ? 'bg-[#0A0A0A] text-white' : 'bg-[#F5F5F5] text-[#0A0A0A]'
                }`}
              >
                {v} {v === 1 ? 'lot' : 'lots'}
              </button>
            );
          })}
        </div>

        <div className="bg-[#F5F5F5] rounded-[12px] p-4 mb-4">
          <div className="flex justify-between py-1">
            <div className="text-[13px] text-[#737373]">You'll invest</div>
            <div className="text-[13px] font-semibold tnum">₹{fmtINR(amount)}</div>
          </div>
          <div className="flex justify-between py-1">
            <div className="text-[13px] text-[#737373]">Annual interest</div>
            <div className="text-[13px] font-semibold tnum" style={{ color: '#16A34A' }}>
              ~₹{fmtINR(Math.round(annualIncome))}
            </div>
          </div>
          <div className="flex justify-between py-1">
            <div className="text-[13px] text-[#737373]">Total interest ({months} mo)</div>
            <div className="text-[13px] font-semibold tnum" style={{ color: '#16A34A' }}>
              ₹{fmtINR(Math.round(totalReturn))}
            </div>
          </div>
          <div className="h-px bg-[#E5E5E5] my-1.5" />
          <div className="flex justify-between py-1">
            <div className="text-[13px] font-semibold">Maturity amount</div>
            <div className="text-[15px] font-bold tnum">₹{fmtINR(Math.round(maturityAmount))}</div>
          </div>
        </div>

        {subIG && (
          <button
            onClick={() => setAgreed(!agreed)}
            className="flex items-start gap-2.5 p-3 px-3.5 rounded-[12px] mb-3.5 text-left transition active:scale-[0.99]"
            style={{ background: '#FEF3C7' }}
          >
            <div
              className="w-[18px] h-[18px] rounded shrink-0 mt-0.5 flex items-center justify-center transition"
              style={{
                border: agreed ? 'none' : '1.5px solid #D97706',
                background: agreed ? '#D97706' : 'transparent',
              }}
            >
              {agreed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </div>
            <div className="text-[12px] leading-[1.5]" style={{ color: '#92400E' }}>
              I understand <b>{bond.rating}</b> is sub-investment-grade and carries default risk.
            </div>
          </button>
        )}

        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="bg-[#0A0A0A] text-white py-4 rounded-[14px] text-[15px] font-semibold disabled:opacity-50 active:scale-[0.98] transition flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
              Continuing…
            </>
          ) : (
            <>Continue · ₹{fmtINR(amount)}</>
          )}
        </button>
        <div className="text-center text-[12px] text-[#A3A3A3] mt-2.5">
          Settled in 2 working days · SEBI registered
        </div>
      </div>
    </div>
  );
}
