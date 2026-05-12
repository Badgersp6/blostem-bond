import { RefreshCw } from 'lucide-react';

export default function ErrorState({
  title,
  message,
  onRetry,
  retryLabel = 'Try again',
  inline = false,
}: {
  title: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  inline?: boolean;
}) {
  return (
    <div
      className={`bg-white border rounded-[14px] ${inline ? 'p-4' : 'p-5'}`}
      style={{ borderColor: '#FECACA' }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-2 h-2 rounded-full" style={{ background: '#DC2626' }} />
        <div className="text-[14px] font-semibold" style={{ color: '#DC2626' }}>
          {title}
        </div>
      </div>
      {message && (
        <div className="text-[12px] text-[#737373] leading-[1.5] break-words">{message}</div>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3.5 inline-flex items-center gap-1.5 bg-[#0A0A0A] text-white py-2.5 px-4 rounded-[10px] text-[13px] font-semibold active:scale-95 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" strokeWidth={2.25} />
          {retryLabel}
        </button>
      )}
    </div>
  );
}
