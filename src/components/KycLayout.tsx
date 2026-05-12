import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Footer from './Footer';

// All KYC steps in canonical order. The progress bar fills based on `step`.
// Branching steps (digilocker / esign) don't add to total since they're
// alternates, not extras.
export const KYC_TOTAL_STEPS = 8;

export default function KycLayout({
  step,
  title,
  subtitle,
  children,
  cta,
  ctaDisabled,
  ctaLoading,
  ctaLabel = 'Continue',
  onCta,
  hideBack = false,
  consent,
}: {
  step: number; // 1-indexed
  title: string;
  subtitle?: string;
  children: ReactNode;
  cta?: boolean;
  ctaDisabled?: boolean;
  ctaLoading?: boolean;
  ctaLabel?: string;
  onCta?: () => void;
  hideBack?: boolean;
  consent?: string;
}) {
  const navigate = useNavigate();
  const pct = Math.min(100, Math.round((step / KYC_TOTAL_STEPS) * 100));

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <div className="flex items-center justify-between px-4 pt-2 pb-2.5">
        {hideBack ? (
          <div className="w-9 h-9" />
        ) : (
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#EBEBEB] active:scale-95 transition"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={1.75} />
          </button>
        )}
        <div className="text-[12px] font-semibold tracking-tight text-[#737373]">
          KYC · Step {step} of {KYC_TOTAL_STEPS}
        </div>
        <div className="w-9 h-9" />
      </div>

      <div className="px-5 pb-3">
        <div className="h-1 rounded-full bg-[#EBEBEB] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, background: '#0A0A0A' }}
          />
        </div>
      </div>

      <div className="px-5 pt-3 pb-2">
        <div className="text-[22px] font-semibold tracking-tight leading-[1.2]">{title}</div>
        {subtitle && (
          <div className="text-[13px] text-[#737373] mt-1.5 leading-[1.45]">{subtitle}</div>
        )}
      </div>

      <div className="flex-1 px-5 pb-6 overflow-y-auto">{children}</div>

      {cta && (
        <div className="bg-white border-t border-[#EBEBEB] px-5 pt-3.5 pb-6">
          {consent && (
            <div className="text-[11px] text-[#737373] text-center mb-2.5 leading-[1.45]">
              {consent}
            </div>
          )}
          <button
            onClick={onCta}
            disabled={ctaDisabled || ctaLoading}
            className="w-full bg-[#0A0A0A] text-white py-[15px] rounded-[12px] text-[14px] font-semibold disabled:opacity-50 active:scale-[0.98] transition"
          >
            {ctaLoading ? 'Please wait…' : ctaLabel}
          </button>
        </div>
      )}

      <Footer />
    </div>
  );
}
