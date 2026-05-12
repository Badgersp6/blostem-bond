// Common a11y wiring for our bottom-sheet dialogs:
//   - Locks body scroll while open
//   - Closes on ESC
//   - Traps Tab cycling within the dialog
//   - Restores focus to the element that opened the dialog when it closes
//   - Auto-focuses the first focusable inside the dialog on open
//
// Container element should also set role="dialog" aria-modal="true" and an
// aria-labelledby pointing at the visible title.

import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useDialogA11y(open: boolean, onClose: () => void) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    openerRef.current = (document.activeElement as HTMLElement) || null;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFirst = () => {
      const node = containerRef.current;
      if (!node) return;
      const els = node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (els.length > 0) els[0].focus();
    };
    // Defer slightly to let the sheet animation start
    const t = window.setTimeout(focusFirst, 60);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const node = containerRef.current;
      if (!node) return;
      const els = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1,
      );
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      // Restore focus to the opener
      const opener = openerRef.current;
      if (opener && document.contains(opener)) {
        try {
          opener.focus();
        } catch {
          /* ignore */
        }
      }
    };
  }, [open, onClose]);

  return containerRef;
}
