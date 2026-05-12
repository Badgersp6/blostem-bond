import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KycLayout from '../../components/KycLayout';
import { validatePanItd } from '../../api/kyc';
import { patchKyc } from '../../kyc-progress';

function fmtDob(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length < 3) return digits;
  if (digits.length < 5) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export default function KycPanInput() {
  const navigate = useNavigate();
  const [pan, setPan] = useState('');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const valid = pan.length === 10 && name.trim().length >= 3 && dob.length === 10;

  const handleSubmit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    const r = await validatePanItd({ pan: pan.toUpperCase(), fullName: name.trim(), dob });
    if (!r.ok) {
      setError(r.reason);
      setSubmitting(false);
      return;
    }
    patchKyc({ pan: { pan: pan.toUpperCase(), fullName: name.trim(), dob } });
    navigate('/kyc/pan-verify', { replace: true });
  };

  return (
    <KycLayout
      step={1}
      title="Enter your PAN details"
      subtitle="We couldn't fetch your PAN automatically. Please enter the details exactly as they appear on your PAN card."
      cta
      ctaLabel="Verify with ITD"
      ctaDisabled={!valid}
      ctaLoading={submitting}
      onCta={handleSubmit}
    >
      <Field label="PAN number" hint="10-character alphanumeric">
        <input
          value={pan}
          onChange={(e) => setPan(e.target.value.toUpperCase().slice(0, 10))}
          placeholder="ABCDE1234F"
          autoComplete="off"
          spellCheck={false}
          className="w-full bg-white border border-[#EBEBEB] rounded-[12px] px-4 h-12 text-[15px] font-medium tnum tracking-[0.05em] outline-none focus:border-[#0A0A0A] transition"
        />
      </Field>

      <Field label="Full name (as per PAN)">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sukhad Pathak"
          autoComplete="off"
          className="w-full bg-white border border-[#EBEBEB] rounded-[12px] px-4 h-12 text-[15px] font-medium outline-none focus:border-[#0A0A0A] transition"
        />
      </Field>

      <Field label="Date of birth (as per PAN)" hint="DD/MM/YYYY">
        <input
          value={dob}
          onChange={(e) => setDob(fmtDob(e.target.value))}
          placeholder="DD/MM/YYYY"
          inputMode="numeric"
          autoComplete="off"
          className="w-full bg-white border border-[#EBEBEB] rounded-[12px] px-4 h-12 text-[15px] font-medium tnum outline-none focus:border-[#0A0A0A] transition"
        />
      </Field>

      {error && (
        <div className="text-[12px] mt-1.5" style={{ color: '#DC2626' }}>
          {error}
        </div>
      )}
    </KycLayout>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="text-[12px] text-[#737373] uppercase tracking-wider font-medium">{label}</div>
        {hint && <div className="text-[11px] text-[#A3A3A3]">{hint}</div>}
      </div>
      {children}
    </div>
  );
}
