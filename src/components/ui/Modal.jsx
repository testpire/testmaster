import React, { useEffect, useRef } from 'react';
import Icon from '../AppIcon';
import { cn } from '../../utils/cn';

/**
 * Shared modal/dialog primitive.
 *
 * Industry-standard behavior: closes on Escape and backdrop click, locks body
 * scroll while open, and moves focus into the dialog on open. Uses design
 * tokens (bg-card, border, foreground, …) so every dialog in the app looks the
 * same — replace hand-rolled `fixed inset-0` overlays with this.
 *
 * Props:
 *  - isOpen        : boolean
 *  - onClose       : () => void
 *  - title         : node (rendered in the sticky header; header is hidden if absent and no close button)
 *  - description   : node (optional sub-text under the title)
 *  - size          : 'sm' | 'md' | 'lg' | 'xl' | 'full'  (default 'md')
 *  - footer        : node (optional sticky footer, e.g. action buttons)
 *  - showClose     : boolean (default true)
 *  - closeOnBackdrop: boolean (default true)
 *  - closeOnEsc    : boolean (default true)
 *  - children      : modal body
 */
const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl',
};

const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  showClose = true,
  closeOnBackdrop = true,
  closeOnEsc = true,
  className,
  children,
}) => {
  const dialogRef = useRef(null);

  // Escape to close + body scroll lock while open.
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (e) => {
      if (closeOnEsc && e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus into the dialog so keyboard users land in context.
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, closeOnEsc, onClose]);

  if (!isOpen) return null;

  const hasHeader = title != null || showClose;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => {
        // Only close when the backdrop itself is pressed, not on inner drag-release.
        if (closeOnBackdrop && e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          'w-full bg-card text-card-foreground rounded-lg border border-border shadow-xl',
          'max-h-[90vh] flex flex-col outline-none animate-scale-in',
          SIZE_CLASSES[size] || SIZE_CLASSES.md,
          className
        )}
      >
        {hasHeader && (
          <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border flex-shrink-0">
            <div className="min-w-0">
              {title != null && (
                <h2 className="text-lg font-semibold text-foreground truncate">{title}</h2>
              )}
              {description != null && (
                <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
              )}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex-shrink-0 -mr-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Icon name="X" size={20} />
              </button>
            )}
          </div>
        )}

        <div className="px-6 py-4 overflow-y-auto flex-1">{children}</div>

        {footer != null && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
