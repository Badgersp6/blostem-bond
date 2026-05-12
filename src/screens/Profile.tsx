// Lean profile view: KYC state at the top, then the identity / bank / demat
// the session was opened with. Nudge to complete KYC when pending.

import { Navigate, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  ChevronLeft,
  IdCard,
  Landmark,
  Mail,
  Phone,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import Footer from '../components/Footer';
import { clearSession, getSession } from '../api/auth';
import { clearKyc } from '../kyc-progress';
import { clearCheckout } from '../checkout';

function maskTail(s: string, visible = 4): string {
  if (!s || s.length <= visible) return s || '—';
  return '••••' + s.slice(-visible);
}

export default function Profile() {
  const navigate = useNavigate();
  const session = getSession();

  if (!session) return <Navigate to="/" replace />;

  const isKycDone = session.kycStatus === 'done';
  const initial = (session.email?.[0] ?? session.phone?.[0] ?? '?').toUpperCase();
  const displayName = session.email?.split('@')[0]?.replace(/\./g, ' ') ?? 'You';

  // Reset local session — wipes auth, KYC, and checkout state, then reloads.
  // On next mount AuthGate rebuilds from profileMock (kycStatus: 'pending'),
  // forcing the user to complete KYC before they can invest again.
  const handleReset = () => {
    clearSession();
    clearKyc();
    clearCheckout();
    window.location.replace('/');
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <div className="flex items-center justify-between px-4 pt-2 pb-3.5">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#EBEBEB] active:scale-95 transition"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={1.75} />
        </button>
        <div className="text-[15px] font-semibold tracking-tight">Profile</div>
        <div className="w-9 h-9" />
      </div>

      <div className="flex-1 px-5 pb-6 overflow-y-auto">
        {/* Identity hero */}
        <div
          className="flex items-center gap-3.5 mb-4 rise"
          style={{ animationDelay: '0ms' }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center bg-[#0A0A0A] text-white text-[22px] font-bold tracking-tighter"
          >
            {initial}
          </div>
          <div className="min-w-0">
            <div className="text-[17px] font-semibold tracking-tight capitalize truncate">
              {displayName}
            </div>
            <div className="text-[12px] text-[#737373] tnum truncate">{session.phone}</div>
          </div>
        </div>

        {/* KYC status card */}
        {isKycDone ? (
          <div
            className="bg-white border border-[#EBEBEB] rounded-[16px] p-4 mb-3.5 rise flex items-start gap-3"
            style={{ animationDelay: '40ms' }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ background: '#DCFCE7' }}
            >
              <ShieldCheck className="w-4 h-4" strokeWidth={2.25} style={{ color: '#16A34A' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold">KYC verified</div>
              <div className="text-[12px] text-[#737373] mt-0.5 leading-[1.5]">
                You can invest in any bond on the platform. This KYC is portable across SEBI-registered
                intermediaries.
              </div>
            </div>
          </div>
        ) : (
          <div
            className="bg-white border rounded-[16px] p-4 mb-3.5 rise"
            style={{ animationDelay: '40ms', borderColor: '#FEF3C7' }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: '#FEF3C7' }}
              >
                <ShieldAlert className="w-4 h-4" strokeWidth={2.25} style={{ color: '#D97706' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold">KYC required to invest</div>
                <div className="text-[12px] text-[#737373] mt-0.5 leading-[1.5]">
                  Complete a one-time KYC — takes about 5 minutes — to invest in bonds and IPOs.
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/kyc/start')}
              className="w-full bg-[#0A0A0A] text-white py-3 rounded-[12px] text-[13px] font-semibold active:scale-[0.98] transition"
            >
              Complete KYC
            </button>
          </div>
        )}

        {/* Contact info */}
        <SectionHeader>Contact</SectionHeader>
        <InfoCard delay="80ms">
          <InfoRow icon={Phone} label="Phone" value={session.phone} mono />
          <Divider />
          <InfoRow icon={Mail} label="Email" value={session.email} />
          {session.pan && (
            <>
              <Divider />
              <InfoRow
                icon={IdCard}
                label="PAN"
                value={session.pan}
                mono
                hidden={!isKycDone}
              />
            </>
          )}
        </InfoCard>

        {/* Bank */}
        <SectionHeader>Bank account</SectionHeader>
        <InfoCard delay="120ms">
          <InfoRow
            icon={Building2}
            label="Account"
            value={maskTail(session.bank.acc_no)}
            mono
          />
          <Divider />
          <InfoRow label="IFSC" value={session.bank.ifsc} mono />
        </InfoCard>

        {/* Demat */}
        <SectionHeader>Demat</SectionHeader>
        <InfoCard delay="160ms">
          <InfoRow
            icon={Landmark}
            label="DP ID"
            value={maskTail(session.demat.dp_id, 4)}
            mono
            hidden={!isKycDone}
          />
        </InfoCard>

        {/* Reset session — clears local auth + KYC + checkout state so the
            user re-enters as a fresh, KYC-pending account. Useful for repeated
            testing of the full journey. */}
        <button
          onClick={handleReset}
          className="w-full bg-white border border-[#EBEBEB] rounded-[14px] py-3.5 mt-4 flex items-center justify-center gap-2 text-[13px] font-medium active:scale-[0.99] transition"
          style={{ color: '#DC2626' }}
        >
          <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.25} />
          Reset session
        </button>
        <div className="text-center text-[11px] text-[#A3A3A3] mt-1.5 leading-[1.45] px-2">
          Clears your local KYC, holdings, and orders. Next visit will require KYC again.
        </div>

        <Footer />
      </div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12px] font-semibold text-[#737373] uppercase tracking-wider pt-2 pb-2">
      {children}
    </div>
  );
}

function InfoCard({ children, delay }: { children: React.ReactNode; delay: string }) {
  return (
    <div
      className="bg-white border border-[#EBEBEB] rounded-[14px] px-4 mb-3 rise"
      style={{ animationDelay: delay }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-[#F0F0F0]" />;
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
  hidden,
}: {
  icon?: LucideIcon;
  label: string;
  value: string;
  mono?: boolean;
  hidden?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-3.5">
      {Icon && <Icon className="w-3.5 h-3.5 text-[#A3A3A3] shrink-0" strokeWidth={2} />}
      <div className="text-[12px] text-[#737373] flex-1">{label}</div>
      <div
        className={`text-[13px] font-medium text-right truncate ${mono ? 'tnum tracking-[0.04em]' : ''}`}
        style={hidden ? { filter: 'blur(4px)' } : {}}
      >
        {value}
      </div>
    </div>
  );
}
