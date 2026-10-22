import { useState, type CSSProperties, type ReactNode } from 'react';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useApiData } from '../lib/useApiData';
import { SkeletonList, ErrorState, EmptyState } from '../components/StateViews';
import { Modal } from '../components/Modal';

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type DataQuality = 'OK' | 'STALE' | 'INSUFFICIENT';

interface RiskFactor {
  code: string;
  label: string;
  points: number;
}

interface LotView {
  lotId: string;
  itemName: string | null;
  kind: string | null;
  lotStatus: string;
  quantityAvailable: number;
  pickupEndAt: string;
  expiryAt: string | null;
  riskLevel: RiskLevel | null;
  riskFactors: RiskFactor[];
  dataQualityStatus: DataQuality;
  recommendedActions: { type: string; reason: string }[];
  calculatedAt: string;
  needsRecalculation: boolean;
  actionTaken: string | null;
  outcome: string | null;
  actionTakenAt: string | null;
}

interface TimelineResponse {
  items: LotView[];
  needsRecalculation: boolean;
  oldestCalculatedAt: string | null;
}

interface AvailableAction {
  type: string;
  label: string;
  recommended: boolean;
  enabled: boolean;
  disabledReason: string | null;
  next: { method: string; path: string } | null;
}

interface LotDetail extends LotView {
  offer: {
    status: string;
    currentPrice: number;
    originalPrice: number;
    floorPrice: number;
    totalQuantity: number;
  };
  availableActions: AvailableAction[];
  history: {
    action: string;
    actorRole: string;
    at: string;
    result: Record<string, unknown> | null;
  }[];
}

interface ActionResult {
  outcome: string;
  next: { method: string; path: string } | null;
}

const RISK_STYLE: Record<RiskLevel, { bg: string; fg: string; label: string }> = {
  CRITICAL: { bg: 'var(--sq-coral)', fg: '#fff', label: 'Khẩn cấp' },
  HIGH: { bg: 'var(--sq-coral-wash)', fg: 'var(--sq-coral-deep)', label: 'Cao' },
  MEDIUM: { bg: 'var(--sq-butter-wash)', fg: 'var(--sq-ink)', label: 'Trung bình' },
  LOW: { bg: 'var(--sq-mint-wash)', fg: 'var(--sq-mint-deep)', label: 'Thấp' },
};

const currency = (n: number) => `${n.toLocaleString('vi-VN')}đ`;
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
const lotName = (l: LotView) =>
  l.itemName ?? (l.kind === 'SURPRISE_BAG' ? 'Túi bất ngờ' : 'Suất bán');

function minutesLeft(iso: string) {
  const m = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (m <= 0) return 'Đã hết khung nhận';
  return m < 120 ? `Còn ${m} phút` : `Còn ${Math.round(m / 60)} giờ`;
}

/** Lý do chính = các yếu tố có điểm, cao nhất trước (BR-B01-03). */
function topReasons(factors: RiskFactor[]) {
  return [...factors]
    .filter((f) => f.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 2)
    .map((f) => f.label)
    .join(' · ');
}

/** CM-B01 Rescue Timeline - GET /store/rescue-timeline (snapshot do tác vụ nền tính, "Làm mới" để tính lại ngay). */
export function RescueTimelinePage() {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [openLotId, setOpenLotId] = useState<string | null>(null);
  const { state, reload } = useApiData<TimelineResponse>(
    () => api.get('/store/rescue-timeline'),
    (d) => d.items.length === 0,
    'Không có lô nào đang mở bán cần theo dõi.',
  );

  const refresh = async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      await api.post('/store/rescue-timeline/refresh');
      reload();
    } catch (err) {
      setRefreshError(
        err instanceof Error ? err.message : 'Không tính lại được, vui lòng thử lại.',
      );
    } finally {
      setRefreshing(false);
    }
  };

  const items = state.status === 'success' ? state.data.items : [];
  const ranked = items.filter((i) => i.dataQualityStatus !== 'INSUFFICIENT');
  const insufficient = items.filter((i) => i.dataQualityStatus === 'INSUFFICIENT');

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
        <div>
          <h1 className="sq-h1" style={{ margin: 0 }}>
            Rescue Timeline
          </h1>
          <p className="sq-body" style={{ color: 'var(--sq-ink-soft)', margin: '4px 0 0' }}>
            Lô cần xử lý trước, theo số lượng còn, thời gian còn và tốc độ bán.
            {state.status === 'success' && state.data.oldestCalculatedAt && (
              <> Tính lúc {time(state.data.oldestCalculatedAt)}.</>
            )}
          </p>
        </div>
        <button onClick={refresh} disabled={refreshing} style={secondaryButton}>
          <RefreshCw size={16} /> {refreshing ? 'Đang tính lại…' : 'Làm mới'}
        </button>
      </div>

      {refreshError && <Banner tone="error">{refreshError}</Banner>}
      {state.status === 'success' && state.data.needsRecalculation && (
        <Banner tone="warning">
          Một số lô có dữ liệu đã thay đổi hoặc kết quả đã cũ - đang hiển thị tạm tính. Bấm "Làm
          mới" để tính lại.
        </Banner>
      )}

      {state.status === 'loading' && <SkeletonList rows={5} height={72} />}
      {state.status === 'error' && (
        <ErrorState message={state.message} canRetry={state.canRetry} onRetry={reload} />
      )}
      {state.status === 'empty' && (
        <EmptyState title="Chưa có lô cần cứu" message={state.message} />
      )}

      {state.status === 'success' && (
        <>
          {ranked.length > 0 && (
            <section style={listCard}>
              {ranked.map((l) => (
                <LotRow key={l.lotId} lot={l} onOpen={() => setOpenLotId(l.lotId)} />
              ))}
            </section>
          )}
          {insufficient.length > 0 && (
            <section>
              <h2 className="sq-h3" style={{ margin: '0 0 var(--sq-space-3)' }}>
                Chưa đủ dữ liệu để xếp mức nguy cơ
              </h2>
              <div style={listCard}>
                {insufficient.map((l) => (
                  <LotRow key={l.lotId} lot={l} onOpen={() => setOpenLotId(l.lotId)} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {openLotId && (
        <LotDetailModal lotId={openLotId} onClose={() => setOpenLotId(null)} onChanged={reload} />
      )}
    </div>
  );
}

function LotRow({ lot, onOpen }: { lot: LotView; onOpen: () => void }) {
  const reasons = topReasons(lot.riskFactors);
  return (
    <button onClick={onOpen} style={rowButton}>
      <QualityAwareBadge lot={lot} />
      <div style={{ flex: '1 1 160px', minWidth: 0 }}>
        <div className="sq-body-medium" style={{ color: 'var(--sq-ink)' }}>
          {lotName(lot)}
        </div>
        <div className="sq-caption" style={{ color: 'var(--sq-ink-soft)', marginTop: 2 }}>
          {lot.dataQualityStatus === 'INSUFFICIENT'
            ? lot.riskFactors.find(
                (f) => f.code === 'VELOCITY_UNAVAILABLE' || f.code === 'EXPIRY_INVALID',
              )?.label
            : reasons || 'Không có yếu tố nguy cơ đáng kể'}
        </div>
      </div>
      <div
        className="sq-tabular"
        style={{ textAlign: 'right', fontSize: 14, color: 'var(--sq-ink)' }}
      >
        <div style={{ fontWeight: 700 }}>{lot.quantityAvailable} suất</div>
        <div
          className="sq-caption"
          style={{
            color: 'var(--sq-ink-soft)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            justifyContent: 'flex-end',
          }}
        >
          <Clock size={12} /> {minutesLeft(lot.pickupEndAt)}
        </div>
      </div>
    </button>
  );
}

/** Không hiển thị mức nguy cơ như dữ liệu hợp lệ khi dữ liệu thiếu/cũ (BR-B01-02). */
function QualityAwareBadge({ lot }: { lot: LotView }) {
  if (lot.dataQualityStatus === 'INSUFFICIENT' || !lot.riskLevel) {
    return (
      <Pill bg="var(--sq-surface-soft)" fg="var(--sq-ink-muted)" dashed>
        Chưa đủ dữ liệu
      </Pill>
    );
  }
  const s = RISK_STYLE[lot.riskLevel];
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        alignItems: 'flex-start',
        width: 104,
      }}
    >
      <Pill bg={s.bg} fg={s.fg} dashed={lot.dataQualityStatus === 'STALE'}>
        {s.label}
      </Pill>
      {lot.dataQualityStatus === 'STALE' && (
        <span className="sq-caption" style={{ color: 'var(--sq-warning)', fontWeight: 650 }}>
          Tạm tính
        </span>
      )}
    </div>
  );
}

function LotDetailModal({
  lotId,
  onClose,
  onChanged,
}: {
  lotId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { state, reload } = useApiData<LotDetail>(
    () => api.get(`/store/rescue-timeline/${lotId}`),
    () => false,
    '',
    [lotId],
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    tone: 'info' | 'error' | 'warning';
    text: string;
  } | null>(null);
  const [extra, setExtra] = useState<ReactNode>(null);
  const [stockForm, setStockForm] = useState<{ delta: string; reason: string } | null>(null);

  const lot = state.status === 'success' ? state.data : null;

  /** Backend kiểm tra lại quyền/trạng thái/tồn trước khi chấp nhận - FE chỉ gửi những gì người dùng đang thấy. */
  const run = async (action: AvailableAction, body: Record<string, unknown> = {}) => {
    if (!lot) return;
    setBusy(action.type);
    setMessage(null);
    setExtra(null);
    try {
      const res = await api.post<ActionResult>(
        `/store/rescue-timeline/${lotId}/action`,
        { actionType: action.type, expectedQuantity: lot.quantityAvailable, ...body },
        true,
      );
      setStockForm(null);
      await followUp(action.type, res);
      reload();
      onChanged();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setMessage({ tone: 'warning', text: `${err.message} Đã tải lại trạng thái mới nhất.` });
        reload();
        onChanged();
      } else {
        setMessage({
          tone: 'error',
          text: err instanceof Error ? err.message : 'Không thực hiện được hành động.',
        });
      }
    } finally {
      setBusy(null);
    }
  };

  /** Hành động điều phối: sau khi backend ghi nhận, gọi tiếp API có sẵn mà Rescue Timeline trỏ tới. */
  const followUp = async (type: string, res: ActionResult) => {
    if (type === 'UPDATE_STOCK')
      return setMessage({ tone: 'info', text: 'Đã cập nhật tồn và tính lại mức nguy cơ.' });
    if (type === 'REQUEST_MANAGER')
      return setMessage({ tone: 'info', text: 'Đã chuyển yêu cầu cho quản lý.' });
    if (!res.next) return;
    if (type === 'VIEW_PRICE') {
      const r = await api.get<{
        currentPrice: number;
        floorPrice: number;
        recommendation: { explanation?: string; proposedPrice?: number };
      }>(res.next.path);
      setExtra(
        <p className="sq-body" style={{ margin: 0 }}>
          Giá hiện tại {currency(r.currentPrice)} (sàn {currency(r.floorPrice)})
          {r.recommendation.proposedPrice
            ? ` · đề xuất ${currency(r.recommendation.proposedPrice)}`
            : ''}
          . {r.recommendation.explanation}
        </p>,
      );
    } else if (type === 'ADJUST_PRICE') {
      const r = await api.post<{ canPropose: boolean; explanation: string }>(res.next.path);
      setMessage({
        tone: r.canPropose ? 'info' : 'warning',
        text: r.canPropose ? `Đã tạo đề xuất giá chờ duyệt. ${r.explanation}` : r.explanation,
      });
    } else if (type === 'OPEN_RESCUE_BRIDGE') {
      const r = await api.get<{
        verifiedCharities: { id: string; name: string; address: string; distanceKm: number }[];
      }>(res.next.path);
      setExtra(
        <div>
          <p className="sq-caption" style={{ margin: '0 0 6px', color: 'var(--sq-ink-soft)' }}>
            Đối tác nhận quyên góp gần quán (Rescue Bridge đầy đủ sẽ có ở CM-B03):
          </p>
          {r.verifiedCharities.map((c) => (
            <div key={c.id} className="sq-body">
              {c.name} - {c.address} ({c.distanceKm} km)
            </div>
          ))}
        </div>,
      );
    }
  };

  const onAction = (a: AvailableAction) => {
    if (a.type === 'UPDATE_STOCK') return setStockForm({ delta: '', reason: 'Bán tại quầy' });
    if (a.type === 'REQUEST_MANAGER') return run(a, { note: `Cần xử lý lô ${lotName(lot!)}` });
    run(a);
  };

  return (
    <Modal title={lot ? lotName(lot) : 'Chi tiết lô'} onClose={onClose}>
      {state.status === 'loading' && <SkeletonList rows={3} height={48} />}
      {state.status === 'error' && (
        <ErrorState message={state.message} canRetry={state.canRetry} onRetry={reload} />
      )}
      {lot && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sq-space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <QualityAwareBadge lot={lot} />
            <span className="sq-body sq-tabular">
              {lot.quantityAvailable}/{lot.offer.totalQuantity} suất ·{' '}
              {minutesLeft(lot.pickupEndAt)} · {currency(lot.offer.currentPrice)}
            </span>
          </div>

          {lot.dataQualityStatus !== 'OK' && (
            <Banner tone="warning">
              {lot.dataQualityStatus === 'INSUFFICIENT'
                ? 'Chưa đủ dữ liệu - hệ thống không đưa ra mức nguy cơ cho lô này.'
                : 'Tồn có thể đã cũ - mức nguy cơ chỉ là tạm tính. Hãy xác nhận lại tồn.'}
            </Banner>
          )}

          <div>
            <p className="sq-overline" style={{ margin: '0 0 6px', color: 'var(--sq-ink-muted)' }}>
              Yếu tố tính toán · lúc {time(lot.calculatedAt)}
            </p>
            {lot.riskFactors.map((f) => (
              <div
                key={f.code}
                className="sq-body"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '4px 0',
                }}
              >
                <span>{f.label}</span>
                <span className="sq-tabular" style={{ color: 'var(--sq-ink-muted)' }}>
                  {f.points > 0 ? `+${f.points}` : ''}
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lot.availableActions.map((a) => {
              // Web chưa có giao diện tạo túi bất ngờ (API POST /store/surprise-bags có sẵn) - không dựng thêm ở đây.
              const noUi = a.type === 'CREATE_SURPRISE_BAG';
              const disabled = !a.enabled || noUi || busy !== null;
              const reason = noUi ? 'Chưa có giao diện tạo túi bất ngờ trên web' : a.disabledReason;
              return (
                <div key={a.type}>
                  <button
                    onClick={() => onAction(a)}
                    disabled={disabled}
                    title={reason ?? undefined}
                    style={{
                      ...(a.recommended && !disabled ? primaryButton : secondaryButton),
                      width: '100%',
                      opacity: disabled ? 0.55 : 1,
                    }}
                  >
                    {busy === a.type ? 'Đang xử lý…' : a.label}
                    {a.recommended && ' · đề xuất'}
                  </button>
                  {reason && (
                    <p
                      className="sq-caption"
                      style={{ margin: '4px 0 0', color: 'var(--sq-ink-muted)' }}
                    >
                      {reason}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {stockForm && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const action = lot.availableActions.find((a) => a.type === 'UPDATE_STOCK')!;
                run(action, { deltaQuantity: Number(stockForm.delta), reason: stockForm.reason });
              }}
              style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}
            >
              <label
                className="sq-caption"
                style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
              >
                Thay đổi (+/-)
                <input
                  type="number"
                  required
                  value={stockForm.delta}
                  onChange={(e) => setStockForm({ ...stockForm, delta: e.target.value })}
                  style={inputStyle}
                />
              </label>
              <label
                className="sq-caption"
                style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}
              >
                Lý do
                <select
                  value={stockForm.reason}
                  onChange={(e) => setStockForm({ ...stockForm, reason: e.target.value })}
                  style={inputStyle}
                >
                  {['Bán tại quầy', 'Làm thêm', 'Hỏng', 'Khác'].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                disabled={busy !== null || !stockForm.delta || Number(stockForm.delta) === 0}
                style={primaryButton}
              >
                Lưu
              </button>
            </form>
          )}

          {message && <Banner tone={message.tone}>{message.text}</Banner>}
          {extra}

          {lot.history.length > 0 && (
            <div>
              <p
                className="sq-overline"
                style={{ margin: '0 0 6px', color: 'var(--sq-ink-muted)' }}
              >
                Lịch sử hành động
              </p>
              {lot.history.map((h, i) => (
                <div
                  key={i}
                  className="sq-caption"
                  style={{ color: 'var(--sq-ink-soft)', padding: '2px 0' }}
                >
                  {time(h.at)} · {h.actorRole} · {String(h.result?.actionType ?? h.action)} →{' '}
                  {String(h.result?.outcome ?? h.result?.code ?? '')}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function Pill({
  bg,
  fg,
  dashed,
  children,
}: {
  bg: string;
  fg: string;
  dashed?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className="sq-caption"
      style={{
        display: 'inline-flex',
        padding: '4px 10px',
        borderRadius: 'var(--sq-radius-pill)',
        background: bg,
        color: fg,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        border: dashed ? '1px dashed var(--sq-ink-muted)' : '1px solid transparent',
      }}
    >
      {children}
    </span>
  );
}

function Banner({ tone, children }: { tone: 'info' | 'error' | 'warning'; children: ReactNode }) {
  const color =
    tone === 'error'
      ? 'var(--sq-error)'
      : tone === 'warning'
        ? 'var(--sq-warning)'
        : 'var(--sq-info)';
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className="sq-body"
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
        padding: '10px 14px',
        borderRadius: 'var(--sq-radius-md)',
        border: `1px solid ${color}`,
        background: 'var(--sq-surface)',
        color: 'var(--sq-ink)',
      }}
    >
      <AlertTriangle size={16} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
      <span>{children}</span>
    </div>
  );
}

const listCard: CSSProperties = {
  background: 'var(--sq-surface)',
  border: '1px solid var(--sq-line)',
  borderRadius: 'var(--sq-radius-lg)',
  overflow: 'hidden',
};

const rowButton: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap', // màn hẹp: khối số lượng xuống dòng thay vì ép mô tả thành cột vài chục px
  alignItems: 'center',
  gap: 16,
  width: '100%',
  padding: '14px 16px',
  border: 'none',
  borderBottom: '1px solid var(--sq-line)',
  background: 'transparent',
  textAlign: 'left',
  cursor: 'pointer',
};

const secondaryButton: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  height: 40,
  padding: '0 16px',
  borderRadius: 'var(--sq-radius-md)',
  border: '1px solid var(--sq-line)',
  background: 'var(--sq-surface)',
  color: 'var(--sq-ink)',
  fontWeight: 650,
  fontSize: 14,
  cursor: 'pointer',
};

const primaryButton: CSSProperties = {
  ...secondaryButton,
  border: 'none',
  background: 'var(--sq-coral)',
  color: '#fff',
  boxShadow: 'var(--sq-elevation-coral)',
};

const inputStyle: CSSProperties = {
  height: 40,
  padding: '0 10px',
  borderRadius: 'var(--sq-radius-md)',
  border: '1px solid var(--sq-line)',
  fontSize: 14,
  minWidth: 96,
};
