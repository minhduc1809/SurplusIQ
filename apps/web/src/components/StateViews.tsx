import type { ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

/** SqSkeleton - rule 10.1: skeleton mô phỏng đúng layout, không spinner vô danh cho list. */
export function SkeletonBlock({
  height = 80,
  radius = 'var(--sq-radius-lg)',
}: {
  height?: number;
  radius?: string;
}) {
  return (
    <div
      style={{
        height,
        borderRadius: radius,
        background:
          'linear-gradient(90deg, var(--sq-surface-soft) 25%, var(--sq-line) 37%, var(--sq-surface-soft) 63%)',
        backgroundSize: '400% 100%',
        animation: 'sq-shimmer 1.4s ease infinite',
      }}
    />
  );
}

export function SkeletonList({ rows = 3, height = 72 }: { rows?: number; height?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sq-space-3)' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBlock key={i} height={height} />
      ))}
    </div>
  );
}

/** SqEmptyState - rule 10.2: chỉ ra lý do và bước tiếp theo, không chỉ che thiếu nội dung. */
export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: 'var(--sq-space-12) var(--sq-space-6)',
        color: 'var(--sq-ink-soft)',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          margin: '0 auto var(--sq-space-4)',
          borderRadius: 'var(--sq-radius-xl)',
          background: 'var(--sq-butter-wash)',
        }}
      />
      <p className="sq-h3" style={{ color: 'var(--sq-ink)', margin: '0 0 6px' }}>
        {title}
      </p>
      <p className="sq-body" style={{ margin: '0 0 var(--sq-space-5)' }}>
        {message}
      </p>
      {action}
    </div>
  );
}

/** SqErrorState - rule 10.3: nói nguyên nhân + có retry. */
export function ErrorState({
  message,
  canRetry = true,
  onRetry,
}: {
  message: string;
  canRetry?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: 'var(--sq-space-10) var(--sq-space-6)',
        color: 'var(--sq-ink-soft)',
      }}
    >
      <AlertCircle
        size={28}
        color="var(--sq-error)"
        style={{ marginBottom: 'var(--sq-space-3)' }}
      />
      <p
        className="sq-body-medium"
        style={{ color: 'var(--sq-ink)', margin: '0 0 var(--sq-space-4)' }}
      >
        {message}
      </p>
      {canRetry && onRetry && (
        <button
          onClick={onRetry}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 18px',
            borderRadius: 'var(--sq-radius-md)',
            border: '1px solid var(--sq-line)',
            background: 'var(--sq-surface)',
            color: 'var(--sq-ink)',
            fontWeight: 650,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={16} /> Thử lại
        </button>
      )}
    </div>
  );
}

export const shimmerKeyframes = `
@keyframes sq-shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}`;
