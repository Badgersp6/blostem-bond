import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, Loader2, X } from 'lucide-react';
import KycLayout from '../../components/KycLayout';
import { verifyDemat } from '../../api/kyc';
import { patchKyc } from '../../kyc-progress';
import { useDialogA11y } from '../../hooks/useDialogA11y';

function fmtDpId(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  // Group as 4-4-4-4 for readability
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export default function KycDemat() {
  const navigate = useNavigate();
  const [dpId, setDpId] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const helpRef = useDialogA11y(showHelp, () => setShowHelp(false));

  const cleaned = dpId.replace(/\s+/g, '');
  const valid = cleaned.length === 16;

  const submit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    const r = await verifyDemat(cleaned);
    if (!r.ok) {
      setError(r.reason);
      setSubmitting(false);
      return;
    }
    patchKyc({ demat: { dpId: cleaned, verified: true } });
    navigate('/kyc/done', { replace: true });
  };

  return (
    <KycLayout
      step={8}
      title="Link your Demat account"
      subtitle="Bonds are credited directly to your demat. Enter the 16-digit Demat (BO) ID associated with your CDSL or NSDL account."
      cta
      ctaLabel="Verify with depository"
      ctaDisabled={!valid}
      ctaLoading={submitting}
      onCta={submit}
    >
      <div className="text-[12px] text-[#737373] uppercase tracking-wider font-medium mb-1.5">
        Demat / BO ID
      </div>
      <input
        value={dpId}
        onChange={(e) => setDpId(fmtDpId(e.target.value))}
        placeholder="0000 0000 0000 0000"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        className="w-full bg-white border border-[#EBEBEB] rounded-[12px] px-4 h-12 text-[16px] font-semibold tnum tracking-[0.1em] outline-none focus:border-[#0A0A0A] transition mb-2"
      />
      <button
        onClick={() => setShowHelp(true)}
        className="flex items-center gap-1.5 text-[12px] font-medium text-[#0A0A0A] active:opacity-60 transition"
      >
        <Info className="w-3 h-3" strokeWidth={2.25} />
        Where do I find my Demat ID?
      </button>

      {error && (
        <div className="text-[12px] mt-3" style={{ color: '#DC2626' }}>
          {error}
        </div>
      )}

      {submitting && (
        <div className="flex items-center gap-2 mt-3 text-[12px] text-[#737373]">
          <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
          <span>Validating with CDSL/NSDL…</span>
        </div>
      )}

      {showHelp && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="fade-in flex-1 bg-black/55" onClick={() => setShowHelp(false)} aria-hidden="true" />
          <div
            ref={helpRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="demat-help-title"
            className="sheet-up bg-white rounded-t-[24px] px-5 pt-3 pb-6 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex justify-center mb-3.5">
              <div className="w-10 h-1 rounded-full bg-[#E5E5E5]" />
            </div>
            <div className="flex justify-between items-start mb-4">
              <div id="demat-help-title" className="text-[17px] font-semibold tracking-tight">
                Finding your Demat ID
              </div>
              <button
                onClick={() => setShowHelp(false)}
                aria-label="Close"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F5F5F5] active:scale-95 transition"
              >
                <X className="w-4 h-4 text-[#737373]" strokeWidth={2} />
              </button>
            </div>

            <Block
              title="If you have CDSL"
              body="Open your demat broker app (Zerodha, Groww, Upstox, etc.) and go to Profile → Demat. Your 16-digit BO ID starts with 1208, 1801, 1300 etc. — that's your Demat ID."
            />
            <Block
              title="If you have NSDL"
              body="Your Demat ID has the format IN followed by 14 digits (e.g., IN30012345678901). For this form, enter only the 14 digits after IN, padded with zeros to 16."
            />
            <Block
              title="Don't have a demat account?"
              body="Most fintech apps offer free demat accounts. Open one from your partner app first, then come back to complete this step."
            />
          </div>
        </div>
      )}
    </KycLayout>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <div className="mb-4">
      <div className="text-[12px] font-semibold text-[#737373] uppercase tracking-wider mb-1">
        {title}
      </div>
      <div className="text-[13px] leading-[1.5]">{body}</div>
    </div>
  );
}
