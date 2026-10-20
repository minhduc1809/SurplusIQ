import { useState, type FormEvent, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../lib/auth';

/** S01 Đăng nhập (chủ cửa hàng) - nối thật /auth/store/login, không mock. */
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === 'submitting') return;
    setStatus('submitting');
    setError('');
    try {
      await login(email.trim(), password);
      navigate('/today', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sai thông tin đăng nhập.');
      setStatus('error');
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--sq-canvas)',
        padding: 'var(--sq-space-6)',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--sq-surface)',
          border: '1px solid var(--sq-line)',
          borderRadius: 'var(--sq-radius-xl)',
          boxShadow: 'var(--sq-elevation-mid)',
          padding: 'var(--sq-space-8)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--sq-space-5)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 'var(--sq-space-2)' }}>
          <div
            style={{
              width: 48,
              height: 48,
              margin: '0 auto var(--sq-space-4)',
              borderRadius: 'var(--sq-radius-lg)',
              background: 'var(--sq-gradient-coral)',
            }}
          />
          <h1 className="sq-h1" style={{ margin: 0 }}>
            Cứu Món cho cửa hàng
          </h1>
          <p className="sq-body" style={{ color: 'var(--sq-ink-soft)', margin: '6px 0 0' }}>
            Quản lý suất, đơn hàng và hao hụt mỗi ngày
          </p>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="sq-caption" style={{ color: 'var(--sq-ink)' }}>
            Email
          </span>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="owner@cuahang.vn"
            autoFocus
            required
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="sq-caption" style={{ color: 'var(--sq-ink)' }}>
            Mật khẩu
          </span>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ ...inputStyle, paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                color: 'var(--sq-ink-muted)',
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        {error && (
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
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'submitting'}
          style={{
            height: 48,
            borderRadius: 'var(--sq-radius-md)',
            border: 'none',
            background: 'var(--sq-coral)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            cursor: status === 'submitting' ? 'default' : 'pointer',
            opacity: status === 'submitting' ? 0.75 : 1,
            boxShadow: 'var(--sq-elevation-coral)',
            transition: `transform var(--sq-duration-fast)`,
          }}
        >
          {status === 'submitting' ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  );
}

const inputStyle: CSSProperties = {
  height: 44,
  borderRadius: 'var(--sq-radius-sm)' as string,
  border: '1px solid var(--sq-line)',
  background: 'var(--sq-surface)',
  padding: '0 14px',
  fontSize: 14,
  color: 'var(--sq-ink)',
  outline: 'none',
  width: '100%',
};
