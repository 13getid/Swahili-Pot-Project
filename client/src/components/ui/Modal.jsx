import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, footer }) {
  const contentRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);

    // Focus the first focusable element inside the modal.
    const node = contentRef.current;
    const focusable = node?.querySelector(
      'input, textarea, select, button, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable) focusable.focus();

    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleKeyDownTrap(e) {
    if (e.key !== 'Tab') return;
    const node = contentRef.current;
    if (!node) return;
    const focusables = node.querySelectorAll(
      'input, textarea, select, button, a[href], [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={handleKeyDownTrap}
        className="w-full max-w-md rounded-xl border border-line bg-card shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-subtle hover:bg-hover"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-line px-5 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}
