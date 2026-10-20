import { Sparkles } from 'lucide-react';

/**
 * Rule 14 "Cách biểu diễn trạng thái chưa sẵn sàng": nếu chưa xây xong,
 * dùng "Sắp có" rõ ràng, không giả lập success hay dữ liệu mẫu.
 */
export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sq-space-6)' }}>
      <h1 className="sq-h1" style={{ margin: 0 }}>
        {title}
      </h1>
      <div
        style={{
          background: 'var(--sq-surface)',
          border: '1px solid var(--sq-line)',
          borderRadius: 'var(--sq-radius-lg)',
          padding: 'var(--sq-space-10)',
          textAlign: 'center',
          color: 'var(--sq-ink-soft)',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            margin: '0 auto var(--sq-space-4)',
            borderRadius: 'var(--sq-radius-xl)',
            background: 'var(--sq-lilac-wash)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Sparkles size={24} color="var(--sq-coral-deep)" />
        </div>
        <p className="sq-h3" style={{ color: 'var(--sq-ink)', margin: '0 0 6px' }}>
          Sắp có
        </p>
        <p className="sq-body" style={{ margin: 0 }}>
          Màn này đang được xây và nối dữ liệu thật, chưa sẵn sàng để dùng.
        </p>
      </div>
    </div>
  );
}
