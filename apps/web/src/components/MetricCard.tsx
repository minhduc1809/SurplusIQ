import type { ReactNode } from 'react';

/** SqMerchantMetric - mỗi card trả lời một câu hỏi vận hành (rule 9.6). */
export function MetricCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent?: 'coral' | 'mint' | 'butter' | 'lilac';
  icon?: ReactNode;
}) {
  const washVar = accent ? `var(--sq-${accent}-wash)` : 'var(--sq-surface-soft)';
  return (
    <div
      style={{
        background: 'var(--sq-surface)',
        border: '1px solid var(--sq-line)',
        borderRadius: 'var(--sq-radius-lg)',
        boxShadow: 'var(--sq-elevation-low)',
        padding: 'var(--sq-space-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sq-space-2)',
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 'var(--sq-radius-md)',
              background: washVar,
              flexShrink: 0,
            }}
          >
            {icon}
          </span>
        )}
        <span className="sq-caption" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </span>
      </div>
      <span className="sq-h1 sq-tabular" style={{ color: 'var(--sq-ink)' }}>
        {value}
      </span>
    </div>
  );
}
