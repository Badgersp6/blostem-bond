import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import KycLayout from '../../components/KycLayout';
import { getKyc, patchKyc } from '../../kyc-progress';

export default function KycPanVerify() {
  const navigate = useNavigate();
  const { pan } = getKyc();
  const [notPep, setNotPep] = useState(true);
  const [indianCitizen, setIndianCitizen] = useState(true);

  if (!pan) return <Navigate to="/kyc/pan-input" replace />;

  const canProceed = notPep && indianCitizen;

  const handleSubmit = () => {
    if (!canProceed) return;
    patchKyc({ panDeclarations: { notPep, indianCitizen } });
    navigate('/kyc/bank', { replace: true });
  };

  return (
    <KycLayout
      step={1}
      title="Verify your PAN"
      subtitle="Confirm the details fetched from the Income Tax Department are correct."
      cta
      ctaLabel="Verify & proceed"
      ctaDisabled={!canProceed}
      onCta={handleSubmit}
      consent="By proceeding you give consent to fetch and share your KYC data with regulatory authorities."
    >
      <div className="bg-white border border-[#EBEBEB] rounded-[14px] p-4 mb-4">
        <Row k="PAN number" v={pan.pan} mono />
        <Divider />
        <Row k="Full name" v={pan.fullName} />
        <Divider />
        <Row k="Date of birth" v={pan.dob} mono />
      </div>

      <div className="text-[12px] font-semibold text-[#737373] uppercase tracking-wider mb-2.5">
        Required declarations
      </div>

      <Declaration
        checked={notPep}
        onToggle={() => setNotPep((v) => !v)}
        text="I am not a politically exposed person (PEP) or related to a PEP."
      />
      <Declaration
        checked={indianCitizen}
        onToggle={() => setIndianCitizen((v) => !v)}
        text="I am an Indian citizen."
      />

      {!canProceed && (
        <div
          className="text-[12px] leading-[1.5] mt-2 px-3.5 py-2.5 rounded-[10px]"
          style={{ background: '#FEF3C7', color: '#92400E' }}
        >
          Both declarations are required by SEBI to proceed. Please review and re-tick.
        </div>
      )}
    </KycLayout>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-2">
      <div className="text-[12px] text-[#737373]">{k}</div>
      <div className={`text-[13px] font-medium text-right ${mono ? 'tnum tracking-[0.05em]' : ''}`}>
        {v}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-[#F0F0F0]" />;
}

function Declaration({
  checked,
  onToggle,
  text,
}: {
  checked: boolean;
  onToggle: () => void;
  text: string;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-start gap-3 p-3.5 rounded-[12px] mb-2 text-left transition active:scale-[0.99] bg-white border border-[#EBEBEB]"
    >
      <div
        className="w-[20px] h-[20px] rounded shrink-0 mt-0.5 flex items-center justify-center transition"
        style={{
          border: checked ? 'none' : '1.5px solid #A3A3A3',
          background: checked ? '#0A0A0A' : 'transparent',
        }}
      >
        {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
      </div>
      <div className="text-[13px] leading-[1.5] flex-1">{text}</div>
    </button>
  );
}
