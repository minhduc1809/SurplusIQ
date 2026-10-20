import type { ReactNode } from 'react';
import { X } from 'lucide-react';

/** SqModal - scrim + card, theo rule 6.6/11 (fade scrim + scale nhẹ). */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--sq-overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--sq-space-5)',
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--sq-surface)',
          borderRadius: 'var(--sq-radius-xl)',
          boxShadow: 'var(--sq-elevation-high)',
          width: '100%',
          maxWidth: 440,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 'var(--sq-space-6)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--sq-space-5)',
          }}
        >
          <h2 className="sq-h3" style={{ margin: 0 }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Đóng"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--sq-ink-muted)',
              display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
