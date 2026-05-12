import { RefreshCw } from 'lucide-react';

export default function Authenticating({
  error,
  onRetry,
}: {
  error?: string | null;
  onRetry?: () => void;
}) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-between px-6 py-10">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xs">
        <div className="text-[34px] font-bold tracking-[-0.04em] leading-none text-[#0A0A0A]">
          blostem
        </div>
        <div className="flex items-center gap-2 mt-3 text-[12px] text-[#737373] font-medium">
          <span>×</span>
          <span className="tracking-tight">TheFixedIncome by Tipsons</span>
        </div>

        <div className="w-40 mt-8">
          {error ? (
            <div className="text-center">
              <div className="text-[13px] font-semibold text-[#DC2626] mb-1.5">
                Couldn't sign you in
              </div>
              <div className="text-[12px] text-[#737373] leading-[1.5] mb-5 break-words">
                {error}
              </div>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="inline-flex items-center gap-1.5 bg-[#0A0A0A] text-white py-2.5 px-4 rounded-[10px] text-[13px] font-semibold active:scale-95 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" strokeWidth={2.25} />
                  Try again
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="h-[3px] rounded-full shimmer-bar" />
              <div className="flex items-center justify-center gap-1.5 mt-5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A] pulse-dot" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A] pulse-dot" style={{ animationDelay: '200ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A] pulse-dot" style={{ animationDelay: '400ms' }} />
              </div>
              <div className="text-center text-[12px] text-[#737373] mt-3">
                Setting up your bonds session…
              </div>
            </>
          )}
        </div>
      </div>

      <div className="text-center text-[11px] text-[#A3A3A3] tracking-tight">
        Bonds in Partnership with TheFixedIncome by Tipsons
        <div className="text-[10px] mt-1 text-[#D4D4D4]">SEBI registered</div>
      </div>
    </div>
  );
}
