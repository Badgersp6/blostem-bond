import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, Smartphone } from 'lucide-react';
import KycLayout from '../../components/KycLayout';
import { checkNameMatch, fetchBankFromPartner, validateBankUpi } from '../../api/kyc';
import { patchKyc, type BankData } from '../../kyc-progress';

type Phase = 'fetching' | 'shown-partner' | 'awaiting-upi' | 'verifying-upi' | 'verified';

export default function KycBank() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('fetching');
  const [bank, setBank] = useState<BankData | null>(null);
  const [upiId, setUpiId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await fetchBankFromPartner();
      if (cancelled) return;
      if (r.source === 'partner') {
        const match = await checkNameMatch();
        if (cancelled) return;
        setBank({
          accountNumber: r.accountNumber,
          ifsc: r.ifsc,
          beneficiaryName: r.beneficiaryName,
          source: 'partner',
          nameMatchPercent: match.percent,
        });
        setPhase('shown-partner');
      } else {
        setPhase('awaiting-upi');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUpiVerify = async () => {
    if (!upiId.trim()) return;
    setPhase('verifying-upi');
    setError(null);
    try {
      const r = await validateBankUpi(upiId.trim());
      const match = await checkNameMatch();
      setBank({
        accountNumber: r.accountNumber,
        ifsc: r.ifsc,
        beneficiaryName: r.beneficiaryName,
        source: 'upi',
        nameMatchPercent: match.percent,
      });
      setPhase('verified');
    } catch (e: any) {
      setError(e?.message || 'Validation failed');
      setPhase('awaiting-upi');
    }
  };

  const requiresAck = bank ? bank.nameMatchPercent < 60 : false;
  const canContinue = bank && (!requiresAck || acknowledged);

  const handleContinue = () => {
    if (!bank) return;
    patchKyc({
      bank: { ...bank, nameMatchAcknowledged: requiresAck ? acknowledged : undefined },
    });
    navigate('/kyc/kra-fetch', { replace: true });
  };

  return (
    <KycLayout
      step={2}
      title="Verify your bank account"
      subtitle={
        phase === 'awaiting-upi' || phase === 'verifying-upi'
          ? 'We need your bank to receive payouts. Verify with any UPI app on this device.'
          : 'Confirm the bank account where your bond payouts will land.'
      }
      cta={!!bank}
      ctaDisabled={!canContinue}
      onCta={handleContinue}
    >
      {phase === 'fetching' && (
        <div className="bg-white border border-[#EBEBEB] rounded-[14px] p-8 flex flex-col items-center text-center">
          <Loader2 className="w-5 h-5 text-[#737373] animate-spin mb-2" strokeWidth={2} />
          <div className="text-[12px] text-[#737373]">Looking up bank details from your partner app…</div>
        </div>
      )}

      {(phase === 'awaiting-upi' || phase === 'verifying-upi') && !bank && (
        <>
          <div className="bg-white border border-[#EBEBEB] rounded-[14px] p-4 mb-3 flex items-start gap-3">
            <Smartphone className="w-4 h-4 text-[#737373] mt-0.5 shrink-0" strokeWidth={2} />
            <div className="text-[12px] text-[#737373] leading-[1.5]">
              Enter any UPI ID linked to the bank account you want to use. We'll do a ₹1 reverse-credit
              to verify ownership.
            </div>
          </div>
          <div className="text-[12px] text-[#737373] uppercase tracking-wider font-medium mb-1.5">
            UPI ID
          </div>
          <input
            value={upiId}
            onChange={(e) => setUpiId(e.target.value.toLowerCase())}
            placeholder="yourname@upi"
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-white border border-[#EBEBEB] rounded-[12px] px-4 h-12 text-[15px] font-medium outline-none focus:border-[#0A0A0A] transition mb-3"
          />
          {error && (
            <div className="text-[12px] mb-2" style={{ color: '#DC2626' }}>
              {error}
            </div>
          )}
          <button
            onClick={handleUpiVerify}
            disabled={!upiId.trim() || phase === 'verifying-upi'}
            className="w-full bg-[#0A0A0A] text-white py-3 rounded-[12px] text-[14px] font-semibold disabled:opacity-50 active:scale-[0.98] transition flex items-center justify-center gap-2"
          >
            {phase === 'verifying-upi' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                Verifying…
              </>
            ) : (
              'Verify with UPI'
            )}
          </button>
        </>
      )}

      {bank && (
        <>
          <div className="bg-white border border-[#EBEBEB] rounded-[14px] p-4 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} style={{ color: '#16A34A' }} />
              <div className="text-[12px] font-semibold" style={{ color: '#16A34A' }}>
                {bank.source === 'partner' ? 'Bank fetched from partner' : 'Bank verified via UPI'}
              </div>
            </div>
            <Row k="Account holder" v={bank.beneficiaryName} />
            <Divider />
            <Row k="Account number" v={`••••${bank.accountNumber.slice(-4)}`} mono />
            <Divider />
            <Row k="IFSC" v={bank.ifsc} mono />
            <Divider />
            <div className="flex justify-between gap-3 py-2">
              <div className="text-[12px] text-[#737373]">Name match with PAN</div>
              <div
                className="text-[13px] font-semibold tnum"
                style={{ color: requiresAck ? '#DC2626' : '#16A34A' }}
              >
                {bank.nameMatchPercent}%
              </div>
            </div>
          </div>

          {requiresAck && (
            <button
              onClick={() => setAcknowledged((v) => !v)}
              className="w-full flex items-start gap-3 p-3.5 rounded-[12px] mb-2 text-left transition active:scale-[0.99]"
              style={{ background: '#FEF3C7' }}
            >
              <div
                className="w-[20px] h-[20px] rounded shrink-0 mt-0.5 flex items-center justify-center transition"
                style={{
                  border: acknowledged ? 'none' : '1.5px solid #D97706',
                  background: acknowledged ? '#D97706' : 'transparent',
                }}
              >
                {acknowledged && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
              </div>
              <div className="text-[12px] leading-[1.5]" style={{ color: '#92400E' }}>
                The names on my bank ({bank.beneficiaryName}) and PAN refer to the same person. I confirm
                this account belongs to me.
              </div>
            </button>
          )}
        </>
      )}
    </KycLayout>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-2">
      <div className="text-[12px] text-[#737373]">{k}</div>
      <div className={`text-[13px] font-medium text-right ${mono ? 'tnum' : ''}`}>{v}</div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-[#F0F0F0]" />;
}
