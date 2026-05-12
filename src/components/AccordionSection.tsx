import { useState, ReactNode } from 'react';
import { ChevronRight, ChevronUp } from 'lucide-react';

export default function AccordionSection({
  title,
  hint,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  hint?: string;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-[#EBEBEB] rounded-[16px] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-[18px] py-4 active:bg-[#FAFAFA] transition"
      >
        <div className="text-left flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[14px] font-semibold tracking-tight">{title}</span>
            {badge}
          </div>
          {hint && <div className="text-[12px] text-[#737373] mt-1">{hint}</div>}
        </div>
        {open ? (
          <ChevronUp className="w-5 h-5 text-[#737373] shrink-0 ml-2" strokeWidth={1.75} />
        ) : (
          <div className="w-7 h-7 rounded-full bg-[#F5F5F5] flex items-center justify-center shrink-0 ml-2">
            <ChevronRight className="w-3.5 h-3.5 text-[#737373]" strokeWidth={2} />
          </div>
        )}
      </button>
      {open && (
        <>
          <div className="h-px bg-[#F0F0F0] mx-[18px]" />
          <div className="expand">{children}</div>
        </>
      )}
    </div>
  );
}
