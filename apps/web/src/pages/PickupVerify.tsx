import { useState, type FormEvent } from 'react';
import { CheckCircle2, ScanLine } from 'lucide-react';
import { api, ApiError } from '../lib/api';

interface VerifyResult {
  success: boolean;
  orderCode: string;
  itemName: string;
  quantity: number;
  totalAmount: number;
  customerMasked: string;
  message: string;
}

const currency = (n: number) => `${n.toLocaleString('vi-VN')}đ`;

/**
 * S41 Quét QR nhận hàng - nối thật POST /store/pickups/verify. Quầy chưa có máy
 * quét camera tích hợp ở bản này nên dùng nhập mã dự phòng 6-8 ký tự (BR-022
 * đã quy định mã dự phòng dùng được thay QR) - không giả lập kết quả quét.
 */
export function PickupVerifyPage() {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === 'verifying' || !code.trim()) return;
    setStatus('verifying');
    setErrorMessage('');
    try {
      const res = await api.post<VerifyResult>('/store/pickups/verify', {
        backupCode: code.trim(),
      });
      setResult(res);
      setStatus('success');
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Không xác nhận được mã nhận hàng.');
      setStatus('error');
    }
  }

  function reset() {
    setCode('');
    setResult(null);
    setStatus('idle');
    setErrorMessage('');
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sq-space-6)', maxWidth: 480 }}
    >
      <h1 className="sq-h1" style={{ margin: 0 }}>
        Quét QR nhận hàng
      </h1>

      {status === 'success' && result ? (
        <div
          style={{
            background: 'var(--sq-surface)',
            border: '1px solid var(--sq-line)',
            borderRadius: 'var(--sq-radius-xl)',
            padding: 'var(--sq-space-8)',
            textAlign: 'center',
            boxShadow: 'var(--sq-elevation-mid)',
          }}
        >
          <CheckCircle2
            size={48}
            color="var(--sq-mint-deep)"
            style={{ marginBottom: 'var(--sq-space-4)' }}
          />
          <p
            className="sq-h3"
            style={{ margin: '0 0 var(--sq-space-2)', color: 'var(--sq-mint-deep)' }}
          >
            Đã nhận hàng thành công
          </p>
          <p
            className="sq-body"
            style={{ color: 'var(--sq-ink-soft)', margin: '0 0 var(--sq-space-5)' }}
          >
            {result.message}
          </p>
          <div
            style={{
              background: 'var(--sq-surface-soft)',
              borderRadius: 'var(--sq-radius-md)',
              padding: 'var(--sq-space-4)',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <Row label="Mã đơn" value={result.orderCode} />
            <Row label="Món" value={`${result.itemName} × ${result.quantity}`} />
            <Row label="Khách" value={result.customerMasked} />
            <Row label="Tổng tiền" value={currency(result.totalAmount)} />
          </div>
          <button onClick={reset} style={primaryButtonStyle}>
            Quét đơn tiếp theo
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'var(--sq-surface)',
            border: '1px solid var(--sq-line)',
            borderRadius: 'var(--sq-radius-xl)',
            padding: 'var(--sq-space-8)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sq-space-5)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <ScanLine
              size={40}
              color="var(--sq-coral-deep)"
              style={{ marginBottom: 'var(--sq-space-3)' }}
            />
            <p className="sq-body" style={{ color: 'var(--sq-ink-soft)', margin: 0 }}>
              Nhập mã dự phòng khách đưa tại quầy (6-8 ký tự). Quét camera trực tiếp sẽ bổ sung sau.
            </p>
          </div>

          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="VD: KFRW2U"
            autoFocus
            maxLength={8}
            style={{
              height: 56,
              borderRadius: 'var(--sq-radius-md)',
              border: '1px solid var(--sq-line)',
              textAlign: 'center',
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 4,
              color: 'var(--sq-ink)',
            }}
          />

          {status === 'error' && (
            <div
              role="alert"
              style={{
                background: 'var(--sq-coral-wash)',
                color: 'var(--sq-coral-deep)',
                borderRadius: 'var(--sq-radius-md)',
                padding: '10px 14px',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'verifying' || !code.trim()}
            style={primaryButtonStyle}
          >
            {status === 'verifying' ? 'Đang xác nhận…' : 'Xác nhận nhận hàng'}
          </button>
        </form>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span className="sq-caption">{label}</span>
      <span className="sq-body-medium sq-tabular">{value}</span>
    </div>
  );
}

const primaryButtonStyle = {
  height: 52,
  borderRadius: 'var(--sq-radius-md)',
  border: 'none',
  background: 'var(--sq-coral)',
  color: '#fff',
  fontWeight: 700,
  fontSize: 15,
  cursor: 'pointer',
  boxShadow: 'var(--sq-elevation-coral)',
  marginTop: 'var(--sq-space-2)',
} as const;
