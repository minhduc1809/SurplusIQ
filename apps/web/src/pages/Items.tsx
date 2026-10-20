import { useState, type ReactNode, type CSSProperties, type FormEvent } from 'react';
import { Search, Plus, ShieldCheck } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useApiData } from '../lib/useApiData';
import { SkeletonList, ErrorState, EmptyState } from '../components/StateViews';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';

interface ItemRow {
  id: string;
  name: string;
  category: string;
  originalPrice: number;
  status: string;
  imageUrl: string | null;
}

interface ItemsResponse {
  data: ItemRow[];
  total: number;
}

const currency = (n: number) => `${n.toLocaleString('vi-VN')}đ`;

/** S20 Danh sách món - nối thật GET /store/items (R2-017, R2-018). */
export function ItemsPage() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [trustpassItemId, setTrustpassItemId] = useState<string | null>(null);
  const { state, reload } = useApiData<ItemsResponse>(
    () => api.get(`/store/items?search=${encodeURIComponent(search)}`),
    (d) => d.data.length === 0,
    'Thêm món đầu tiên để tạo suất cuối ngày.',
    [search],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sq-space-5)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <h1 className="sq-h1" style={{ margin: 0 }}>
          Món
        </h1>
        <button onClick={() => setShowCreate(true)} style={addButtonStyle}>
          <Plus size={18} /> Thêm món
        </button>
      </div>

      {trustpassItemId && (
        <TrustpassModal itemId={trustpassItemId} onClose={() => setTrustpassItemId(null)} />
      )}

      {showCreate && (
        <CreateItemModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            reload();
          }}
        />
      )}

      <div style={{ position: 'relative', maxWidth: 360 }}>
        <Search
          size={18}
          color="var(--sq-ink-muted)"
          style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm món theo tên…"
          style={{
            width: '100%',
            height: 44,
            borderRadius: 'var(--sq-radius-sm)',
            border: '1px solid var(--sq-line)',
            background: 'var(--sq-surface)',
            padding: '0 14px 0 42px',
            fontSize: 14,
            outline: 'none',
          }}
        />
      </div>

      {state.status === 'loading' && <SkeletonList rows={5} height={64} />}

      {state.status === 'error' && (
        <ErrorState message={state.message} canRetry={state.canRetry} onRetry={reload} />
      )}

      {state.status === 'empty' && <EmptyState title="Chưa có món nào" message={state.message} />}

      {state.status === 'success' && (
        <div
          style={{
            background: 'var(--sq-surface)',
            border: '1px solid var(--sq-line)',
            borderRadius: 'var(--sq-radius-lg)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--sq-surface-soft)' }}>
                <Th>Món</Th>
                <Th>Danh mục</Th>
                <Th align="right">Giá gốc</Th>
                <Th>Trạng thái</Th>
                <Th align="right">Minh bạch</Th>
              </tr>
            </thead>
            <tbody>
              {state.data.data.map((item) => (
                <tr key={item.id} style={{ borderTop: '1px solid var(--sq-line)' }}>
                  <td style={cellStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 'var(--sq-radius-sm)',
                          background: item.imageUrl
                            ? `url(${item.imageUrl}) center/cover`
                            : 'var(--sq-butter-wash)',
                          flexShrink: 0,
                        }}
                      />
                      <span className="sq-body-medium">{item.name}</span>
                    </div>
                  </td>
                  <td style={cellStyle}>
                    <span className="sq-body" style={{ color: 'var(--sq-ink-soft)' }}>
                      {item.category}
                    </span>
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'right' }} className="sq-tabular">
                    {currency(item.originalPrice)}
                  </td>
                  <td style={cellStyle}>
                    <StatusBadge status={item.status} />
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>
                    <button onClick={() => setTrustpassItemId(item.id)} style={linkButtonStyle}>
                      <ShieldCheck size={16} /> TrustPass
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const addButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  height: 44,
  padding: '0 18px',
  borderRadius: 'var(--sq-radius-md)',
  border: 'none',
  background: 'var(--sq-coral)',
  color: '#fff',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  boxShadow: 'var(--sq-elevation-coral)',
};

const fieldStyle: CSSProperties = {
  height: 44,
  borderRadius: 'var(--sq-radius-sm)',
  border: '1px solid var(--sq-line)',
  background: 'var(--sq-surface)',
  padding: '0 14px',
  fontSize: 14,
  color: 'var(--sq-ink)',
  outline: 'none',
  width: '100%',
};

/** S22 Tạo món - flow chuẩn rule 6.6: Input → Validate → Disable duplicate → Loading → API → Success/Error. */
function CreateItemModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [shelfLifeHours, setShelfLifeHours] = useState('24');
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === 'saving') return;
    setStatus('saving');
    setError('');
    try {
      await api.post('/store/items', {
        name: name.trim(),
        category: category.trim(),
        originalPrice: Number(originalPrice),
        standardShelfLifeHours: Number(shelfLifeHours),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể tạo món.');
      setStatus('error');
    }
  }

  return (
    <Modal title="Thêm món mới" onClose={onClose}>
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sq-space-4)' }}
      >
        <Field label="Tên món">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={80}
            style={fieldStyle}
            autoFocus
          />
        </Field>
        <Field label="Danh mục">
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            placeholder="Bánh ngọt, Đồ ăn chính..."
            style={fieldStyle}
          />
        </Field>
        <Field label="Giá gốc (VND)">
          <input
            type="number"
            value={originalPrice}
            onChange={(e) => setOriginalPrice(e.target.value)}
            required
            min={1000}
            max={5000000}
            style={fieldStyle}
          />
        </Field>
        <Field label="Hạn dùng chuẩn (giờ)">
          <input
            type="number"
            value={shelfLifeHours}
            onChange={(e) => setShelfLifeHours(e.target.value)}
            required
            min={1}
            max={168}
            style={fieldStyle}
          />
        </Field>

        {status === 'error' && (
          <div
            role="alert"
            style={{
              background: 'var(--sq-coral-wash)',
              color: 'var(--sq-coral-deep)',
              borderRadius: 'var(--sq-radius-md)',
              padding: '10px 14px',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'saving'}
          style={{
            ...addButtonStyle,
            justifyContent: 'center',
            opacity: status === 'saving' ? 0.75 : 1,
          }}
        >
          {status === 'saving' ? 'Đang lưu…' : 'Tạo món'}
        </button>
      </form>
    </Modal>
  );
}

/** Các trường TrustPass trả về từ GET /store/items/:id và PATCH /store/items/:id/trustpass (CM-B05). */
interface TrustpassItem {
  id: string;
  name: string;
  status: string;
  ingredients: string | null;
  allergens: string[];
  preparedAt: string | null;
  expiryAt: string | null;
  storageInstructions: string | null;
  informationSource: 'STORE' | 'PLATFORM_VERIFIED';
  verificationStatus: 'DECLARED' | 'VERIFIED';
  trustpassVersion: number;
  trustpassPublishedAt: string | null;
}

// ISO (UTC) <-> giá trị input datetime-local theo giờ máy.
const toLocalInput = (iso: string | null) =>
  iso
    ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : '';
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : '');
const parseAllergens = (v: string) =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/** CM-B05 TrustPass Manager - hồ sơ minh bạch món, KHÔNG phải chứng nhận an toàn. */
function TrustpassModal({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const { state, reload } = useApiData<TrustpassItem>(
    () => api.get(`/store/items/${itemId}`),
    undefined,
    undefined,
    [itemId],
  );
  return (
    <Modal title="Hồ sơ TrustPass" onClose={onClose}>
      {state.status === 'loading' && <SkeletonList rows={4} height={44} />}
      {state.status === 'error' && (
        <ErrorState message={state.message} canRetry={state.canRetry} onRetry={reload} />
      )}
      {state.status === 'success' && <TrustpassForm initial={state.data} />}
    </Modal>
  );
}

function TrustpassForm({ initial }: { initial: TrustpassItem }) {
  const [item, setItem] = useState(initial);
  const [ingredients, setIngredients] = useState(initial.ingredients ?? '');
  const [allergens, setAllergens] = useState(initial.allergens.join(', '));
  const [preparedAt, setPreparedAt] = useState(toLocalInput(initial.preparedAt));
  const [expiryAt, setExpiryAt] = useState(toLocalInput(initial.expiryAt));
  const [storage, setStorage] = useState(initial.storageInstructions ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === 'saving') return;
    // Chỉ gửi trường thay đổi: trường không gửi = giữ nguyên, không bị hiểu là "không có" (BR-B05-04).
    const body: Record<string, unknown> = {};
    if (ingredients.trim() !== (item.ingredients ?? '')) body.ingredients = ingredients.trim();
    const nextAllergens = parseAllergens(allergens);
    if (nextAllergens.join(',') !== item.allergens.join(',')) body.allergens = nextAllergens;
    if (preparedAt !== toLocalInput(item.preparedAt) && preparedAt)
      body.preparedAt = fromLocalInput(preparedAt);
    if (expiryAt !== toLocalInput(item.expiryAt) && expiryAt)
      body.expiryAt = fromLocalInput(expiryAt);
    if (storage.trim() !== (item.storageInstructions ?? ''))
      body.storageInstructions = storage.trim();
    if (Object.keys(body).length === 0) {
      setStatus('saved');
      return;
    }
    setStatus('saving');
    setError('');
    try {
      setItem(await api.patch<TrustpassItem>(`/store/items/${item.id}/trustpass`, body));
      setStatus('saved');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể lưu hồ sơ TrustPass.');
      setStatus('error');
    }
  }

  const verified = item.verificationStatus === 'VERIFIED';
  const notProvided = <span style={{ color: 'var(--sq-coral-deep)' }}> · Chưa cung cấp</span>;

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sq-space-4)' }}
    >
      <div style={noticeStyle}>
        <div className="sq-body-medium">{item.name}</div>
        <div className="sq-caption">
          {verified
            ? 'Đã xác minh bởi nền tảng'
            : 'Tự khai báo (cửa hàng cung cấp, chưa được xác minh độc lập)'}{' '}
          · Phiên bản {item.trustpassVersion}
          {item.trustpassPublishedAt &&
            ` · Cập nhật ${new Date(item.trustpassPublishedAt).toLocaleString('vi-VN')}`}
        </div>
        {item.status === 'ARCHIVED' && (
          <div className="sq-caption" style={{ color: 'var(--sq-coral-deep)' }}>
            Món đã lưu trữ - không hiển thị như đang bán.
          </div>
        )}
      </div>

      <Field label={<>Thành phần khai báo{!item.ingredients && notProvided}</>}>
        <textarea
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          rows={3}
          maxLength={2000}
          style={textareaStyle}
        />
      </Field>

      <Field label={<>Chất gây dị ứng khai báo{item.allergens.length === 0 && notProvided}</>}>
        <input
          value={allergens}
          onChange={(e) => setAllergens(e.target.value)}
          placeholder="Sữa, trứng, đậu phộng… (phân cách bằng dấu phẩy)"
          style={fieldStyle}
        />
        {/* shortcut: cột items.allergens là NOT NULL default '{}', không phân biệt được "chưa cung cấp" với "khai báo không có"; thêm tuỳ chọn "không có" khi backend lưu được null. */}
        <span className="sq-caption" style={{ color: 'var(--sq-ink-muted)' }}>
          Để trống sẽ hiển thị cho khách là "Chưa cung cấp", không phải "không có chất gây dị ứng".
        </span>
      </Field>

      <Field label={<>Thời điểm chuẩn bị{!item.preparedAt && notProvided}</>}>
        <input
          type="datetime-local"
          value={preparedAt}
          onChange={(e) => setPreparedAt(e.target.value)}
          required={!!item.preparedAt}
          style={fieldStyle}
        />
      </Field>

      <Field label={<>Hạn dùng thực phẩm{!item.expiryAt && notProvided}</>}>
        <input
          type="datetime-local"
          value={expiryAt}
          onChange={(e) => setExpiryAt(e.target.value)}
          required={!!item.expiryAt}
          style={fieldStyle}
        />
        <span className="sq-caption" style={{ color: 'var(--sq-ink-muted)' }}>
          Khác khung nhận hàng - khung nhận hàng được đặt riêng trên từng suất ở trang Suất.
        </span>
      </Field>

      <Field label={<>Hướng dẫn bảo quản{!item.storageInstructions && notProvided}</>}>
        <textarea
          value={storage}
          onChange={(e) => setStorage(e.target.value)}
          rows={2}
          maxLength={1000}
          style={textareaStyle}
        />
      </Field>

      <span className="sq-caption" style={{ color: 'var(--sq-ink-muted)' }}>
        Mỗi thay đổi thành phần, dị ứng, hạn dùng, bảo quản đều được lưu lịch sử phiên bản.
      </span>

      {status === 'error' && (
        <div
          role="alert"
          style={{
            ...noticeStyle,
            background: 'var(--sq-coral-wash)',
            color: 'var(--sq-coral-deep)',
          }}
        >
          {error}
        </div>
      )}
      {status === 'saved' && (
        <div role="status" className="sq-caption" style={{ color: 'var(--sq-ink)' }}>
          Đã lưu hồ sơ TrustPass.
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'saving'}
        style={{
          ...addButtonStyle,
          justifyContent: 'center',
          opacity: status === 'saving' ? 0.75 : 1,
        }}
      >
        {status === 'saving' ? 'Đang lưu…' : 'Lưu hồ sơ'}
      </button>
    </form>
  );
}

const textareaStyle: CSSProperties = {
  ...fieldStyle,
  height: 'auto',
  padding: '10px 14px',
  fontFamily: 'inherit',
  resize: 'vertical',
};

const noticeStyle: CSSProperties = {
  background: 'var(--sq-surface-soft)',
  borderRadius: 'var(--sq-radius-md)',
  padding: '10px 14px',
  fontSize: 13,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const linkButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: 'none',
  border: 'none',
  color: 'var(--sq-coral-deep)',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
};

function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span className="sq-caption" style={{ color: 'var(--sq-ink)' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function Th({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className="sq-overline"
      style={{
        textAlign: align,
        color: 'var(--sq-ink-muted)',
        padding: '12px 16px',
        fontWeight: 700,
      }}
    >
      {children}
    </th>
  );
}

const cellStyle: CSSProperties = {
  padding: '14px 16px',
  fontSize: 14,
  color: 'var(--sq-ink)',
  verticalAlign: 'middle',
};
