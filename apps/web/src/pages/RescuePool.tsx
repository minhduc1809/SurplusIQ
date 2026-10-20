import { useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, Plus, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { useApiData } from '../lib/useApiData';
import { SkeletonList, ErrorState, EmptyState } from '../components/StateViews';
import { Modal } from '../components/Modal';

/**
 * Rescue Pool Manager (CM-B02). Trang KHÔNG có (và không được thêm) danh sách khách tham gia:
 * backend chỉ trả nhu cầu tổng hợp (BR-B02-08), nên kiểu dữ liệu ở đây cũng không có trường cá nhân.
 */

type PoolStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'AGGREGATING'
  | 'PENDING_STORE'
  | 'OFFER_PUBLISHED'
  | 'ORDERING_OPEN'
  | 'COMPLETED'
  | 'INSUFFICIENT'
  | 'CANCELLED'
  | 'EXPIRED';

interface Pool {
  id: string;
  poolTitle: string;
  targetCategory: string;
  serviceArea: string;
  registrationOpenAt: string;
  registrationCloseAt: string;
  confirmDeadlineAt: string;
  minimumDemand: number;
  maximumSupply: number;
  targetBudgetMin: number | null;
  targetBudgetMax: number | null;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  endCondition: string;
  linkedOfferId: string | null;
  offeredQuantity: number | null;
  proposedPrice: number | null;
  offerPickupStart: string | null;
  offerPickupEnd: string | null;
  offerVersion: number;
  offerExpiryAt: string | null;
  poolStatus: PoolStatus;
  registrationCount: number;
  confirmedOrderCount: number;
  cancellationReason: string | null;
}

interface Bucket {
  registrations: number;
  quantity: number;
}

interface PoolDetail extends Pool {
  demand: {
    totalRegistrations: number;
    totalRequestedQuantity: number;
    meetsMinimumDemand: boolean;
    exceedsMaximumSupply: boolean;
    budgetDistribution: (Bucket & { bucket: string })[];
    pickupWindowDistribution: (Bucket & { slot: string })[];
  };
  confirmedQuantity: number;
  remainingSupply: number | null;
  allowedTransitions: PoolStatus[];
}

interface PoolReport {
  registrations: {
    total: number;
    active: number;
    ordered: number;
    withdrawn: number;
    closedWithoutOrder: number;
  };
  ordersCreated: number;
  ordersFulfilled: number;
  soldQuantity: number;
  failureReasons: { reason: string; count: number }[];
}

interface OfferRow {
  id: string;
  currentPrice: number;
  remainingQuantity: number;
  pickupStart: string;
  pickupEnd: string;
}

const STATUS: Record<PoolStatus, { label: string; bg: string; fg: string }> = {
  DRAFT: { label: 'Nháp', bg: 'var(--sq-surface-soft)', fg: 'var(--sq-ink-muted)' },
  OPEN: { label: 'Mở đăng ký', bg: 'var(--sq-sky-wash)', fg: 'var(--sq-info)' },
  AGGREGATING: { label: 'Tổng hợp nhu cầu', bg: 'var(--sq-sky-wash)', fg: 'var(--sq-info)' },
  PENDING_STORE: { label: 'Chờ cửa hàng', bg: 'var(--sq-butter-wash)', fg: 'var(--sq-warning)' },
  OFFER_PUBLISHED: { label: 'Đề nghị cung ứng', bg: 'var(--sq-lilac-wash)', fg: 'var(--sq-ink)' },
  ORDERING_OPEN: { label: 'Mở đặt hàng', bg: 'var(--sq-mint-wash)', fg: 'var(--sq-mint-deep)' },
  COMPLETED: { label: 'Hoàn tất', bg: 'var(--sq-mint-wash)', fg: 'var(--sq-mint-deep)' },
  INSUFFICIENT: {
    label: 'Không đủ điều kiện',
    bg: 'var(--sq-surface-soft)',
    fg: 'var(--sq-ink-soft)',
  },
  CANCELLED: { label: 'Đã hủy', bg: 'var(--sq-coral-wash)', fg: 'var(--sq-coral-deep)' },
  EXPIRED: { label: 'Hết hạn', bg: 'var(--sq-surface-soft)', fg: 'var(--sq-ink-muted)' },
};

const BUDGET_LABEL: Record<string, string> = {
  UNSPECIFIED: 'Không nêu',
  UNDER_30K: '< 30.000đ',
  '30K_50K': '30–50.000đ',
  '50K_100K': '50–100.000đ',
  OVER_100K: '≥ 100.000đ',
};

const currency = (n: number | null) => (n == null ? '—' : `${n.toLocaleString('vi-VN')}đ`);
const dt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      })
    : '—';
const toIso = (local: string) => new Date(local).toISOString();

function PoolBadge({ status }: { status: PoolStatus }) {
  const cfg = STATUS[status];
  return (
    <span
      className="sq-caption"
      style={{
        display: 'inline-flex',
        padding: '4px 10px',
        borderRadius: 'var(--sq-radius-pill)',
        background: cfg.bg,
        color: cfg.fg,
        fontWeight: 650,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  );
}

export function RescuePoolPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (selectedId) return <PoolDetailView id={selectedId} onBack={() => setSelectedId(null)} />;
  return <PoolList onSelect={setSelectedId} />;
}

function PoolList({ onSelect }: { onSelect: (id: string) => void }) {
  const [creating, setCreating] = useState(false);
  const { state, reload } = useApiData<Pool[]>(
    () => api.get('/store/rescue-pools'),
    (d) => d.length === 0,
    'Tạo đợt gom nhu cầu để biết khách cần gì trước khi đăng món.',
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
          Rescue Pool
        </h1>
        <button onClick={() => setCreating(true)} style={primaryBtn}>
          <Plus size={18} /> Tạo đợt
        </button>
      </div>

      {state.status === 'loading' && <SkeletonList rows={4} height={64} />}
      {state.status === 'error' && (
        <ErrorState message={state.message} canRetry={state.canRetry} onRetry={reload} />
      )}
      {state.status === 'empty' && <EmptyState title="Chưa có đợt nào" message={state.message} />}
      {state.status === 'success' && (
        <div style={card}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--sq-surface-soft)' }}>
                <Th>Đợt</Th>
                <Th>Khu vực</Th>
                <Th>Đóng đăng ký</Th>
                <Th align="right">Đăng ký / Ngưỡng</Th>
                <Th align="right">Đơn</Th>
                <Th>Trạng thái</Th>
              </tr>
            </thead>
            <tbody>
              {state.data.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  style={{ borderTop: '1px solid var(--sq-line)', cursor: 'pointer' }}
                >
                  <td style={cell}>
                    <div style={{ fontWeight: 650 }}>{p.poolTitle}</div>
                    <div className="sq-caption" style={{ color: 'var(--sq-ink-muted)' }}>
                      {p.targetCategory}
                    </div>
                  </td>
                  <td style={cell}>{p.serviceArea}</td>
                  <td style={cell} className="sq-tabular">
                    {dt(p.registrationCloseAt)}
                  </td>
                  <td style={{ ...cell, textAlign: 'right' }} className="sq-tabular">
                    {p.registrationCount} / {p.minimumDemand} suất
                  </td>
                  <td style={{ ...cell, textAlign: 'right' }} className="sq-tabular">
                    {p.confirmedOrderCount}
                  </td>
                  <td style={cell}>
                    <PoolBadge status={p.poolStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <CreatePoolModal
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            reload();
            onSelect(id);
          }}
        />
      )}
    </div>
  );
}

/** Đủ trường bắt buộc BR-B02-03/04 mới cho gửi; backend kiểm tra lại toàn bộ. */
function CreatePoolModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [f, setF] = useState({
    poolTitle: '',
    targetCategory: '',
    serviceArea: '',
    registrationOpenAt: '',
    registrationCloseAt: '',
    confirmDeadlineAt: '',
    pickupWindowStart: '',
    pickupWindowEnd: '',
    minimumDemand: '',
    maximumSupply: '',
    targetBudgetMin: '',
    targetBudgetMax: '',
    endCondition: 'Đóng khi hết suất cung ứng hoặc hết hạn đề nghị',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (Number(f.maximumSupply) < Number(f.minimumDemand)) {
      setError('Nguồn cung tối đa phải ≥ ngưỡng tối thiểu.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await api.post<Pool>('/store/rescue-pools', {
        poolTitle: f.poolTitle,
        targetCategory: f.targetCategory,
        serviceArea: f.serviceArea,
        registrationOpenAt: toIso(f.registrationOpenAt),
        registrationCloseAt: toIso(f.registrationCloseAt),
        confirmDeadlineAt: toIso(f.confirmDeadlineAt),
        pickupWindowStart: toIso(f.pickupWindowStart),
        pickupWindowEnd: toIso(f.pickupWindowEnd),
        minimumDemand: Number(f.minimumDemand),
        maximumSupply: Number(f.maximumSupply),
        ...(f.targetBudgetMin && { targetBudgetMin: Number(f.targetBudgetMin) }),
        ...(f.targetBudgetMax && { targetBudgetMax: Number(f.targetBudgetMax) }),
        endCondition: f.endCondition,
      });
      onCreated(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tạo được đợt.');
      setBusy(false);
    }
  };

  return (
    <Modal title="Tạo đợt gom nhu cầu" onClose={onClose}>
      <form onSubmit={submit} style={formCol}>
        <Field label="Tên đợt">
          <input required value={f.poolTitle} onChange={set('poolTitle')} style={field} />
        </Field>
        <Field label="Nhóm món (trùng nhóm món trong danh mục)">
          <input required value={f.targetCategory} onChange={set('targetCategory')} style={field} />
        </Field>
        <Field label="Khu vực phục vụ">
          <input required value={f.serviceArea} onChange={set('serviceArea')} style={field} />
        </Field>
        <Row>
          <Field label="Mở đăng ký">
            <input
              required
              type="datetime-local"
              value={f.registrationOpenAt}
              onChange={set('registrationOpenAt')}
              style={field}
            />
          </Field>
          <Field label="Đóng đăng ký">
            <input
              required
              type="datetime-local"
              value={f.registrationCloseAt}
              onChange={set('registrationCloseAt')}
              style={field}
            />
          </Field>
        </Row>
        <Field label="Hạn cửa hàng quyết định cung ứng">
          <input
            required
            type="datetime-local"
            value={f.confirmDeadlineAt}
            onChange={set('confirmDeadlineAt')}
            style={field}
          />
        </Field>
        <Row>
          <Field label="Khung nhận từ">
            <input
              required
              type="datetime-local"
              value={f.pickupWindowStart}
              onChange={set('pickupWindowStart')}
              style={field}
            />
          </Field>
          <Field label="đến">
            <input
              required
              type="datetime-local"
              value={f.pickupWindowEnd}
              onChange={set('pickupWindowEnd')}
              style={field}
            />
          </Field>
        </Row>
        <Row>
          <Field label="Ngưỡng tối thiểu (suất)">
            <input
              required
              type="number"
              min={1}
              value={f.minimumDemand}
              onChange={set('minimumDemand')}
              style={field}
            />
          </Field>
          <Field label="Nguồn cung tối đa (suất)">
            <input
              required
              type="number"
              min={1}
              value={f.maximumSupply}
              onChange={set('maximumSupply')}
              style={field}
            />
          </Field>
        </Row>
        <Row>
          <Field label="Ngân sách dự kiến từ (đ)">
            <input
              type="number"
              min={0}
              value={f.targetBudgetMin}
              onChange={set('targetBudgetMin')}
              style={field}
            />
          </Field>
          <Field label="đến (đ)">
            <input
              type="number"
              min={0}
              value={f.targetBudgetMax}
              onChange={set('targetBudgetMax')}
              style={field}
            />
          </Field>
        </Row>
        <Field label="Điều kiện kết thúc (công bố cho khách)">
          <input required value={f.endCondition} onChange={set('endCondition')} style={field} />
        </Field>
        {error && <p style={errorText}>{error}</p>}
        <button type="submit" disabled={busy} style={primaryBtn}>
          {busy ? 'Đang tạo…' : 'Tạo đợt (Nháp)'}
        </button>
      </form>
    </Modal>
  );
}

type ActionModal = null | 'offer' | 'cancel' | 'insufficient' | 'closeRegistration';

function PoolDetailView({ id, onBack }: { id: string; onBack: () => void }) {
  const detail = useApiData<PoolDetail>(() => api.get(`/store/rescue-pools/${id}`), undefined, '', [
    id,
  ]);
  const report = useApiData<PoolReport>(
    () => api.get(`/store/rescue-pools/${id}/report`),
    undefined,
    '',
    [id],
  );
  const [modal, setModal] = useState<ActionModal>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    detail.reload();
    report.reload();
  };

  const openRegistration = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await api.patch(`/store/rescue-pools/${id}/open`);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không mở được đợt.');
    } finally {
      setBusy(false);
    }
  };

  if (detail.state.status === 'loading') return <SkeletonList rows={4} height={96} />;
  if (detail.state.status !== 'success') {
    return (
      <ErrorState
        message={detail.state.status === 'error' ? detail.state.message : 'Không tải được đợt.'}
        onRetry={detail.reload}
      />
    );
  }
  const p = detail.state.data;
  const can = (s: PoolStatus) => p.allowedTransitions.includes(s);
  const canPublish = can('OFFER_PUBLISHED') || can('ORDERING_OPEN');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sq-space-5)' }}>
      <button onClick={onBack} style={{ ...ghostBtn, alignSelf: 'flex-start' }}>
        <ArrowLeft size={16} /> Tất cả đợt
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 className="sq-h1" style={{ margin: 0 }}>
          {p.poolTitle}
        </h1>
        <PoolBadge status={p.poolStatus} />
      </div>
      {p.cancellationReason && (
        <p className="sq-body" style={{ margin: 0, color: 'var(--sq-ink-soft)' }}>
          Lý do: {p.cancellationReason}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {can('OPEN') && (
          <button disabled={busy} onClick={openRegistration} style={primaryBtn}>
            Mở đăng ký
          </button>
        )}
        {can('AGGREGATING') && (
          <button onClick={() => setModal('closeRegistration')} style={ghostBtn}>
            Chốt đăng ký sớm
          </button>
        )}
        {canPublish && (
          <button onClick={() => setModal('offer')} style={primaryBtn}>
            {p.offerVersion > 0 ? 'Sửa đề nghị cung ứng' : 'Công bố đề nghị cung ứng'}
          </button>
        )}
        {can('INSUFFICIENT') && (
          <button onClick={() => setModal('insufficient')} style={ghostBtn}>
            Đóng: Không đủ điều kiện
          </button>
        )}
        {can('CANCELLED') && (
          <button onClick={() => setModal('cancel')} style={dangerBtn}>
            Từ chối / Hủy đợt
          </button>
        )}
      </div>
      {actionError && <p style={errorText}>{actionError}</p>}

      <Section title="Điều kiện đã công bố">
        <Grid>
          <Info label="Nhóm món" value={p.targetCategory} />
          <Info label="Khu vực" value={p.serviceArea} />
          <Info
            label="Đăng ký"
            value={`${dt(p.registrationOpenAt)} → ${dt(p.registrationCloseAt)}`}
          />
          <Info label="Hạn quyết định" value={dt(p.confirmDeadlineAt)} />
          <Info label="Ngưỡng / Tối đa" value={`${p.minimumDemand} / ${p.maximumSupply} suất`} />
          <Info
            label="Ngân sách dự kiến"
            value={`${currency(p.targetBudgetMin)} – ${currency(p.targetBudgetMax)}`}
          />
          <Info
            label="Khung nhận dự kiến"
            value={`${dt(p.pickupWindowStart)} → ${dt(p.pickupWindowEnd)}`}
          />
          <Info label="Kết thúc khi" value={p.endCondition} />
        </Grid>
      </Section>

      <Section title="Nhu cầu tổng hợp">
        <p
          className="sq-caption"
          style={{
            margin: '0 0 12px',
            color: 'var(--sq-ink-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <ShieldCheck size={14} /> Chỉ số liệu tổng hợp, không có thông tin cá nhân của khách
          (BR-B02-08).
        </p>
        <Grid>
          <Info label="Đăng ký hiệu lực" value={String(p.demand.totalRegistrations)} />
          <Info label="Tổng suất quan tâm" value={`${p.demand.totalRequestedQuantity} suất`} />
          <Info
            label="So với ngưỡng"
            value={
              p.demand.meetsMinimumDemand
                ? 'Đã đủ ngưỡng tối thiểu'
                : `Còn thiếu ${p.minimumDemand - p.demand.totalRequestedQuantity} suất`
            }
          />
          {p.demand.exceedsMaximumSupply && (
            <Info label="Lưu ý" value="Nhu cầu vượt nguồn cung tối đa" />
          )}
        </Grid>
        <Distribution
          title="Theo ngân sách"
          rows={p.demand.budgetDistribution.map((b) => ({
            label: BUDGET_LABEL[b.bucket] ?? b.bucket,
            ...b,
          }))}
        />
        <Distribution
          title="Theo giờ nhận mong muốn"
          rows={p.demand.pickupWindowDistribution.map((b) => ({
            label: b.slot === 'FLEXIBLE' ? 'Linh hoạt' : b.slot,
            ...b,
          }))}
        />
      </Section>

      {p.offerVersion > 0 && (
        <Section title={`Đề nghị cung ứng (phiên bản ${p.offerVersion})`}>
          <Grid>
            <Info label="Giá / suất" value={currency(p.proposedPrice)} />
            <Info label="Số suất cung ứng" value={`${p.offeredQuantity ?? 0}`} />
            <Info
              label="Đã có đơn / Còn lại"
              value={`${p.confirmedQuantity} / ${p.remainingSupply ?? 0}`}
            />
            <Info
              label="Khung nhận"
              value={`${dt(p.offerPickupStart)} → ${dt(p.offerPickupEnd)}`}
            />
            <Info label="Hạn khách xác nhận" value={dt(p.offerExpiryAt)} />
          </Grid>
        </Section>
      )}

      <Section title="Báo cáo đợt">
        {report.state.status === 'success' ? (
          <>
            <Grid>
              <Info
                label="Số đăng ký (tất cả)"
                value={String(report.state.data.registrations.total)}
              />
              <Info label="Đã rút" value={String(report.state.data.registrations.withdrawn)} />
              <Info label="Đơn đã tạo" value={String(report.state.data.ordersCreated)} />
              <Info label="Đơn đã nhận" value={String(report.state.data.ordersFulfilled)} />
              <Info label="Số suất đã bán" value={String(report.state.data.soldQuantity)} />
            </Grid>
            {report.state.data.failureReasons.length > 0 && (
              <Distribution
                title="Lý do thất bại"
                rows={report.state.data.failureReasons.map((r) => ({
                  label: r.reason,
                  registrations: r.count,
                  quantity: 0,
                }))}
                countOnly
              />
            )}
          </>
        ) : (
          <p className="sq-caption">
            {report.state.status === 'error' ? report.state.message : 'Đang tải…'}
          </p>
        )}
      </Section>

      {modal === 'offer' && (
        <SupplyOfferModal
          pool={p}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            refresh();
          }}
        />
      )}
      {(modal === 'cancel' || modal === 'insufficient' || modal === 'closeRegistration') && (
        <ReasonModal
          title={
            modal === 'cancel'
              ? 'Từ chối / Hủy đợt'
              : modal === 'insufficient'
                ? 'Đóng: Không đủ điều kiện'
                : 'Chốt đăng ký sớm'
          }
          hint={
            modal === 'cancel'
              ? 'Khách đã đăng ký sẽ được thông báo. Đơn chính thức (nếu có) được hủy và hoàn tiền theo chính sách hiện hành.'
              : modal === 'insufficient'
                ? 'Không có đơn nào được tạo, không thu tiền khách. Khách được thông báo đợt không đủ điều kiện.'
                : 'Hệ thống tổng hợp ngay: đủ ngưỡng → Chờ cửa hàng, thiếu → Không đủ điều kiện.'
          }
          onClose={() => setModal(null)}
          onSubmit={async (reason) => {
            if (modal === 'closeRegistration') {
              await api.post(`/store/rescue-pools/${id}/close-registration`, { reason });
            } else {
              await api.post(`/store/rescue-pools/${id}/close`, {
                reason,
                outcome: modal === 'cancel' ? 'CANCELLED' : 'INSUFFICIENT',
              });
            }
            setModal(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function SupplyOfferModal({
  pool,
  onClose,
  onDone,
}: {
  pool: PoolDetail;
  onClose: () => void;
  onDone: () => void;
}) {
  const offers = useApiData<{ data: OfferRow[] }>(() =>
    api.get('/store/offers?status=OPEN&limit=100'),
  );
  const [offerId, setOfferId] = useState(pool.linkedOfferId ?? '');
  const [qty, setQty] = useState(String(pool.offeredQuantity ?? ''));
  const [expiry, setExpiry] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRevision = pool.offerVersion > 0;
  const selected =
    offers.state.status === 'success'
      ? offers.state.data.data.find((o) => o.id === offerId)
      : undefined;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/store/rescue-pools/${pool.id}/supply-offer`, {
        offerId,
        offeredQuantity: Number(qty),
        offerExpiryAt: toIso(expiry),
        ...(isRevision && { changeReason: reason }),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không công bố được đề nghị.');
      setBusy(false);
    }
  };

  return (
    <Modal
      title={isRevision ? 'Sửa đề nghị cung ứng' : 'Công bố đề nghị cung ứng'}
      onClose={onClose}
    >
      <form onSubmit={submit} style={formCol}>
        {isRevision && (
          <p style={{ ...warnBox }}>
            Công bố lại sẽ tạo phiên bản {pool.offerVersion + 1}. Mọi khách chưa đặt phải xem và xác
            nhận lại điều kiện mới; đơn đã tạo giữ nguyên.
          </p>
        )}
        <Field label="Suất bán nguồn (tồn thật, giá & khung nhận lấy từ suất này)">
          <select
            required
            value={offerId}
            onChange={(e) => setOfferId(e.target.value)}
            style={field}
          >
            <option value="">— Chọn suất đang mở —</option>
            {offers.state.status === 'success' &&
              offers.state.data.data.map((o) => (
                <option key={o.id} value={o.id}>
                  {currency(o.currentPrice)} · còn {o.remainingQuantity} · {dt(o.pickupStart)}–
                  {dt(o.pickupEnd)}
                </option>
              ))}
          </select>
        </Field>
        {selected && (
          <p className="sq-caption" style={{ margin: 0 }}>
            Giá khách thấy: <b>{currency(selected.currentPrice)}</b> · Khung nhận{' '}
            {dt(selected.pickupStart)} → {dt(selected.pickupEnd)}
          </p>
        )}
        <Field
          label={`Số suất cung ứng (≤ ${pool.maximumSupply}, đã có đơn ${pool.confirmedQuantity})`}
        >
          <input
            required
            type="number"
            min={Math.max(1, pool.confirmedQuantity)}
            max={pool.maximumSupply}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            style={field}
          />
        </Field>
        <Field label="Hạn khách xác nhận mua">
          <input
            required
            type="datetime-local"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            style={field}
          />
        </Field>
        {isRevision && (
          <Field label="Lý do thay đổi (bắt buộc)">
            <textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ ...field, height: 72, padding: 10 }}
            />
          </Field>
        )}
        {error && <p style={errorText}>{error}</p>}
        <button type="submit" disabled={busy} style={primaryBtn}>
          {busy ? 'Đang gửi…' : 'Công bố cho khách đã đăng ký'}
        </button>
      </form>
    </Modal>
  );
}

function ReasonModal({
  title,
  hint,
  onClose,
  onSubmit,
}: {
  title: string;
  hint: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal title={title} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await onSubmit(reason.trim());
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Thao tác thất bại.');
            setBusy(false);
          }
        }}
        style={formCol}
      >
        <p className="sq-body" style={{ margin: 0, color: 'var(--sq-ink-soft)' }}>
          {hint}
        </p>
        <Field label="Lý do (bắt buộc, được ghi nhật ký)">
          <textarea
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ ...field, height: 88, padding: 10 }}
          />
        </Field>
        {error && <p style={errorText}>{error}</p>}
        <button type="submit" disabled={busy || !reason.trim()} style={primaryBtn}>
          {busy ? 'Đang xử lý…' : 'Xác nhận'}
        </button>
      </form>
    </Modal>
  );
}

function Distribution({
  title,
  rows,
  countOnly = false,
}: {
  title: string;
  rows: { label: string; registrations: number; quantity: number }[];
  countOnly?: boolean;
}) {
  const max = Math.max(1, ...rows.map((r) => (countOnly ? r.registrations : r.quantity)));
  return (
    <div style={{ marginTop: 16 }}>
      <div className="sq-overline" style={{ color: 'var(--sq-ink-muted)', marginBottom: 8 }}>
        {title}
      </div>
      {rows.length === 0 && <p className="sq-caption">Chưa có dữ liệu.</p>}
      {rows.map((r) => {
        const v = countOnly ? r.registrations : r.quantity;
        return (
          <div
            key={r.label}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(120px, 2fr) 3fr auto',
              gap: 10,
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <span className="sq-caption">{r.label}</span>
            <div style={{ height: 8, borderRadius: 4, background: 'var(--sq-surface-soft)' }}>
              <div
                style={{
                  width: `${(v / max) * 100}%`,
                  height: '100%',
                  borderRadius: 4,
                  background: 'var(--sq-mint)',
                }}
              />
            </div>
            <span className="sq-caption sq-tabular">
              {countOnly ? r.registrations : `${r.quantity} suất · ${r.registrations} ĐK`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ ...card, padding: 'var(--sq-space-5)' }}>
      <h2 className="sq-h3" style={{ margin: '0 0 12px' }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 12,
      }}
    >
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="sq-caption" style={{ color: 'var(--sq-ink-muted)' }}>
        {label}
      </div>
      <div className="sq-body-medium sq-tabular">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
      <span className="sq-caption" style={{ fontWeight: 650 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{children}</div>;
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

const card: CSSProperties = {
  background: 'var(--sq-surface)',
  border: '1px solid var(--sq-line)',
  borderRadius: 'var(--sq-radius-lg)',
  overflow: 'hidden',
};
const cell: CSSProperties = {
  padding: '14px 16px',
  fontSize: 14,
  color: 'var(--sq-ink)',
  verticalAlign: 'middle',
};
const field: CSSProperties = {
  height: 44,
  borderRadius: 'var(--sq-radius-sm)',
  border: '1px solid var(--sq-line)',
  background: 'var(--sq-surface)',
  padding: '0 12px',
  fontSize: 14,
  color: 'var(--sq-ink)',
  width: '100%',
  boxSizing: 'border-box',
};
const formCol: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 14 };
const btnBase: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  height: 44,
  padding: '0 18px',
  borderRadius: 'var(--sq-radius-md)',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
};
const primaryBtn: CSSProperties = {
  ...btnBase,
  border: 'none',
  background: 'var(--sq-coral)',
  color: '#fff',
  boxShadow: 'var(--sq-elevation-coral)',
};
const ghostBtn: CSSProperties = {
  ...btnBase,
  border: '1px solid var(--sq-line)',
  background: 'var(--sq-surface)',
  color: 'var(--sq-ink)',
};
const dangerBtn: CSSProperties = {
  ...btnBase,
  border: '1px solid var(--sq-coral-deep)',
  background: 'var(--sq-coral-wash)',
  color: 'var(--sq-coral-deep)',
};
const errorText: CSSProperties = { margin: 0, color: 'var(--sq-error)', fontSize: 13 };
const warnBox: CSSProperties = {
  margin: 0,
  padding: 12,
  borderRadius: 'var(--sq-radius-md)',
  background: 'var(--sq-butter-wash)',
  color: 'var(--sq-warning)',
  fontSize: 13,
};
