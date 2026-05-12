import type { ReactNode } from 'react';

export default function EmptyState({
  title,
  message,
  icon,
  actionLabel,
  onAction,
}: {
  title: string;
  message?: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="bg-white border border-[#EBEBEB] rounded-[14px] p-8 flex flex-col items-center text-center">
      {icon && (
        <div
          className="w-12 h-12 rounded-full mb-3 flex items-center justify-center"
          style={{ background: '#F5F5F5' }}
        >
          {icon}
        </div>
      )}
      <div className="text-[14px] font-semibold mb-1">{title}</div>
      {message && (
        <div className="text-[12px] text-[#737373] leading-[1.5] max-w-[280px]">{message}</div>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 bg-[#0A0A0A] text-white py-2.5 px-4 rounded-[10px] text-[13px] font-semibold active:scale-95 transition"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
