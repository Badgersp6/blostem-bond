import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import KycLayout from '../../components/KycLayout';
import { fetchKra } from '../../api/kyc';
import { patchKyc, type PersonalData } from '../../kyc-progress';

const MARITAL = ['Single', 'Married', 'Other'];
const INCOME = ['< 1 Lakh', '1–5 Lakh', '5–10 Lakh', '10–25 Lakh', '25 Lakh – 1 Cr', '> 1 Cr'];
const OCCUPATION = [
  'Salaried · Private sector',
  'Salaried · Public sector',
  'Self-employed',
  'Business',
  'Retired',
  'Student',
  'Other',
];
const QUALIFICATION = ['Under 10th', '10th', '12th', 'Graduate', 'Post-graduate', 'Doctorate'];
const TRADING_EXP = ['No experience', '< 1 year', '1–3 years', '3–5 years', '> 5 years'];

export default function KycPersonal() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PersonalData>({
    fatherName: '',
    motherName: '',
    maritalStatus: '',
    income: '',
    occupation: '',
    qualification: '',
    tradingExperience: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await fetchKra();
      if (cancelled) return;
      if (r.personal) setData(r.personal);
      if (r.address) patchKyc({ address: r.address });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const valid = Object.values(data).every((v) => v.trim().length > 0);

  const handleSubmit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    patchKyc({ personal: data });
    // Branch: KRA validated + contact match → esign;
    //        KRA validated + !contact match → esign-form;
    //        not KRA validated → digilocker → esign-form
    const r = await fetchKra();
    if (r.validated && r.contactMatches) {
      navigate('/kyc/esign?mode=full', { replace: true });
    } else if (r.validated) {
      navigate('/kyc/esign?mode=form', { replace: true });
    } else {
      navigate('/kyc/digilocker', { replace: true });
    }
  };

  const update = (key: keyof PersonalData) => (v: string) => setData((d) => ({ ...d, [key]: v }));

  if (loading) {
    return (
      <KycLayout step={5} title="Loading your details">
        <div className="bg-white border border-[#EBEBEB] rounded-[14px] p-8 flex flex-col items-center text-center">
          <Loader2 className="w-5 h-5 text-[#737373] animate-spin mb-2" strokeWidth={2} />
          <div className="text-[12px] text-[#737373]">Pre-filling from KRA…</div>
        </div>
      </KycLayout>
    );
  }

  return (
    <KycLayout
      step={5}
      title="Confirm your personal details"
      subtitle="We've pre-filled what KRA has on record. Update anything that's incorrect or missing."
      cta
      ctaLabel="Save & continue"
      ctaDisabled={!valid}
      ctaLoading={submitting}
      onCta={handleSubmit}
    >
      <Text label="Father's name" value={data.fatherName} onChange={update('fatherName')} />
      <Text label="Mother's name" value={data.motherName} onChange={update('motherName')} />
      <Picker label="Marital status" options={MARITAL} value={data.maritalStatus} onChange={update('maritalStatus')} />
      <Picker label="Annual income" options={INCOME} value={data.income} onChange={update('income')} />
      <Picker label="Occupation" options={OCCUPATION} value={data.occupation} onChange={update('occupation')} />
      <Picker label="Qualification" options={QUALIFICATION} value={data.qualification} onChange={update('qualification')} />
      <Picker
        label="Trading experience"
        options={TRADING_EXP}
        value={data.tradingExperience}
        onChange={update('tradingExperience')}
      />
    </KycLayout>
  );
}

function Text({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-3">
      <div className="text-[12px] text-[#737373] uppercase tracking-wider font-medium mb-1.5">
        {label}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-[#EBEBEB] rounded-[12px] px-4 h-12 text-[15px] font-medium outline-none focus:border-[#0A0A0A] transition"
      />
    </div>
  );
}

function Picker({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-3">
      <div className="text-[12px] text-[#737373] uppercase tracking-wider font-medium mb-1.5">
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-[#EBEBEB] rounded-[12px] px-4 h-12 text-[15px] font-medium outline-none focus:border-[#0A0A0A] transition appearance-none"
      >
        <option value="" disabled>
          Select
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
