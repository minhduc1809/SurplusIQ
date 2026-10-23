import { useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { categoryLabel } from '../lib/categories';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Plus, ShieldAlert } from 'lucide-react';
import { api } from '../lib/api';
import { useApiData } from '../lib/useApiData';
import { SkeletonList, ErrorState, EmptyState } from '../components/StateViews';
import { Modal } from '../components/Modal';

/**
 * Rescue Bridge (CM-B03): cửa hàng bàn giao suất còn lại cho đơn vị tiếp nhận đã được duyệt.
 * Cửa hàng quyết định, hệ thống chỉ điều phối (BR-B03-01). Đơn vị phản hồi qua link riêng
 * (RescueBridgeRespondPage) vì họ không có tài khoản trong hệ thống.
 */

type Status =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'AWAITING_HANDOVER'
  | 'HANDED_OVER'
  | 'PARTIAL'
  | 'FAILED'
  | 'CANCELLED';

type Transport = 'RECIPIENT_PICKUP' | 'STORE_DELIVERY';

interface Transfer {
  id: string;
  offerId: string;
  recipientOrgId: string | null;
  recipientOrgName?: string | null;
  foodCategory: string;
  quantityProposed: number;
  quantityAccepted: number | null;
  quantityHandedOver: number | null;
  reservedQuantity: number;
  availableAt: string;
  handoverDeadline: string;
  storageNotes: string;
  transportResponsibility: Transport;
  transferStatus: Status;
  sentAt: string | null;
  agreedPickupAt: string | null;
  recipientResponsibleName: string | null;
  storeResponsibleName: string | null;
  recipientNote: string | null;
  senderConfirmedAt: string | null;
  senderConfirmedQuantity: number | null;
  recipientConfirmedBy: string | null;
  recipientConfirmedAt: string | null;
  recipientConfirmedQuantity: number | null;
  evidenceReference: string | null;
  isDisputed: boolean;
  disputeNote: string | null;
  failureReason: string | null;
  createdAt: string;
}

type Action = 'SEND' | 'CONFIRM_AGREEMENT' | 'CONFIRM_HANDOVER' | 'FAIL' | 'CANCEL' | 'ROTATE_LINK';

interface TransferDetail extends Transfer {
  recipientOrg: {
    id: string;
    name: string;
    capacityNote: string | null;
    contactName?: string;
    contactPhone?: string;
  } | null;
  offer: { id: string; itemName: string | null; pickupStart: string; pickupEnd: string } | null;
  evidenceRequired: boolean;
  allowedActions: Action[];
  history: {
    action: string;
    actorRole: string;
    newValue: Record<string, unknown> | null;
    createdAt: string;
  }[];
}

interface EligibleOffer {
  offerId: string;
  kind: string;
  itemName: string | null;
  foodCategory: string | null;
  remainingQuantity: number;
  pickupStart: string;
  pickupEnd: string;
  lotExpiresAt: string;
  suggested: boolean;
}

interface Match {
  id: string;
  name: string;
  acceptedFoodCategories: string[];
  serviceAreas: string[];
  maxQuantityPerTransfer: number;
  receivingWindowStart: string | null;
  receivingWindowEnd: string | null;
  capacityNote: string | null;
}

interface Report {
  proposed: { count: number; quantity: number };
  accepted: { count: number; quantity: number };
  handedOver: { count: number; quantity: number };
  shortfallQuantity: number;
  openDisputes: number;
  byStatus: { status: Status; count: number }[];
  closedReasons: { status: Status; reason: string; count: number }[];
  note: string;
}

const STATUS: Record<Status, { label: string; bg: string; fg: string }> = {
  DRAFT: { label: 'Nháp', bg: 'var(--sq-surface-soft)', fg: 'var(--sq-ink-muted)' },
  SENT: { label: 'Đã gửi', bg: 'var(--sq-sky-wash)', fg: 'var(--sq-info)' },
  ACCEPTED: { label: 'Đã chấp nhận', bg: 'var(--sq-lilac-wash)', fg: 'var(--sq-ink)' },
  REJECTED: { label: 'Bị từ chối', bg: 'var(--sq-coral-wash)', fg: 'var(--sq-coral-deep)' },
  AWAITING_HANDOVER: {
    label: 'Chờ bàn giao',
    bg: 'var(--sq-butter-wash)',
    fg: 'var(--sq-warning)',
  },
  HANDED_OVER: { label: 'Đã bàn giao', bg: 'var(--sq-mint-wash)', fg: 'var(--sq-mint-deep)' },
  PARTIAL: { label: 'Bàn giao một phần', bg: 'var(--sq-mint-wash)', fg: 'var(--sq-mint-deep)' },
  FAILED: { label: 'Thất bại', bg: 'var(--sq-surface-soft)', fg: 'var(--sq-ink-soft)' },
  CANCELLED: { label: 'Đã hủy', bg: 'var(--sq-coral-wash)', fg: 'var(--sq-coral-deep)' },
};

const TRANSPORT: Record<Transport, string> = {
  RECIPIENT_PICKUP: 'Đơn vị tự đến nhận (đơn vị chịu chi phí vận chuyển)',
  STORE_DELIVERY: 'Cửa hàng giao đến (cửa hàng chịu chi phí vận chuyển)',
};

const ACTION_LABEL: Record<string, string> = {
  RESCUE_BRIDGE_CREATED: 'Tạo đề nghị, giữ suất khỏi tồn bán',
  RESCUE_BRIDGE_SENT: 'Gửi đề nghị cho đơn vị',
  RESCUE_BRIDGE_LINK_ROTATED: 'Cấp lại link phản hồi',
  RESCUE_BRIDGE_ACCEPTED: 'Đơn vị chấp nhận',
  RESCUE_BRIDGE_REJECTED: 'Đơn vị từ chối',
  RESCUE_BRIDGE_AWAITING_HANDOVER: 'Cửa hàng thống nhất điều kiện',
  RESCUE_BRIDGE_SENDER_CONFIRMED: 'Cửa hàng xác nhận đã giao',
  RESCUE_BRIDGE_RECIPIENT_CONFIRMED: 'Đơn vị xác nhận đã nhận',
  RESCUE_BRIDGE_DISPUTED: 'Chuyển vận hành xử lý tranh chấp',
  RESCUE_BRIDGE_HANDED_OVER: 'Hoàn tất bàn giao toàn bộ',
  RESCUE_BRIDGE_PARTIAL: 'Hoàn tất bàn giao một phần',
  RESCUE_BRIDGE_FAILED: 'Thất bại',
  RESCUE_BRIDGE_CANCELLED: 'Hủy',
};

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
const errMsg = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

function Badge({ status }: { status: Status }) {
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

// ══════════════════════════ Store page ══════════════════════════

export function RescueBridgePage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'list' | 'report'>('list');
  if (selectedId) return <TransferDetailView id={selectedId} onBack={() => setSelectedId(null)} />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sq-space-5)' }}>
      <h1 className="sq-h1" style={{ margin: 0 }}>
        Cầu nối từ thiện
      </h1>
      <div role="tablist" style={{ display: 'flex', gap: 8 }}>
        <button
          role="tab"
          aria-selected={tab === 'list'}
          onClick={() => setTab('list')}
          style={tab === 'list' ? primaryBtn : ghostBtn}
        >
          Đề nghị bàn giao
        </button>
        <button
          role="tab"
          aria-selected={tab === 'report'}
          onClick={() => setTab('report')}
          style={tab === 'report' ? primaryBtn : ghostBtn}
        >
          Báo cáo
        </button>
      </div>
      {tab === 'list' ? <TransferList onSelect={setSelectedId} /> : <ReportView />}
    </div>
  );
}

function TransferList({ onSelect }: { onSelect: (id: string) => void }) {
  const [creating, setCreating] = useState(false);
  const { state, reload } = useApiData<Transfer[]>(
    () => api.get('/store/rescue-bridge/transfers'),
    (d) => d.length === 0,
    'Khi còn suất cuối khung nhận, tạo đề nghị để bàn giao cho đơn vị tiếp nhận đã được duyệt.',
  );

  return (
    <>
      <div>
        <button onClick={() => setCreating(true)} style={primaryBtn}>
          <Plus size={18} /> Tạo đề nghị
        </button>
      </div>
      {state.status === 'loading' && <SkeletonList rows={4} height={64} />}
      {state.status === 'error' && (
        <ErrorState message={state.message} canRetry={state.canRetry} onRetry={reload} />
      )}
      {state.status === 'empty' && (
        <EmptyState title="Chưa có đề nghị bàn giao" message={state.message} />
      )}
      {state.status === 'success' && (
        <div style={card}>
          <table
            className="sq-table"
            style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse' }}
          >
            <thead>
              <tr style={{ background: 'var(--sq-surface-soft)' }}>
                <Th>Nhóm món</Th>
                <Th>Đơn vị tiếp nhận</Th>
                <Th>Hạn nhận</Th>
                <Th align="right">Đề nghị / Chấp nhận / Đã giao</Th>
                <Th>Trạng thái</Th>
              </tr>
            </thead>
            <tbody>
              {state.data.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => onSelect(t.id)}
                  style={{ borderTop: '1px solid var(--sq-line)', cursor: 'pointer' }}
                >
                  <td style={cell}>{categoryLabel(t.foodCategory)}</td>
                  <td style={cell}>{t.recipientOrgName ?? '—'}</td>
                  <td style={cell} className="sq-tabular">
                    {dt(t.handoverDeadline)}
                  </td>
                  <td style={{ ...cell, textAlign: 'right' }} className="sq-tabular">
                    {t.quantityProposed} / {t.quantityAccepted ?? '—'} /{' '}
                    {t.quantityHandedOver ?? '—'}
                  </td>
                  <td style={cell}>
                    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                      <Badge status={t.transferStatus} />
                      {t.isDisputed && (
                        <ShieldAlert size={16} color="var(--sq-error)" aria-label="Tranh chấp" />
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {creating && (
        <CreateTransferModal
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            reload();
            onSelect(id);
          }}
        />
      )}
    </>
  );
}

function CreateTransferModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const offers = useApiData<EligibleOffer[]>(() => api.get('/store/rescue-bridge/eligible-offers'));
  const [f, setF] = useState({
    offerId: '',
    quantity: '',
    availableAt: '',
    handoverDeadline: '',
    storageNotes: '',
    transportResponsibility: 'RECIPIENT_PICKUP' as Transport,
    foodCategory: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });
  const list = offers.state.status === 'success' ? offers.state.data : [];
  const selected = list.find((o) => o.offerId === f.offerId);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api.post<Transfer>(
        '/store/rescue-bridge/transfers',
        {
          offerId: f.offerId,
          quantity: Number(f.quantity),
          availableAt: toIso(f.availableAt),
          handoverDeadline: toIso(f.handoverDeadline),
          storageNotes: f.storageNotes,
          transportResponsibility: f.transportResponsibility,
          ...(f.foodCategory && { foodCategory: f.foodCategory }),
        },
        true,
      );
      onCreated(created.id);
    } catch (err) {
      setError(errMsg(err, 'Không tạo được đề nghị.'));
      setBusy(false);
    }
  };

  return (
    <Modal title="Tạo đề nghị bàn giao" onClose={onClose}>
      <form onSubmit={submit} style={formCol}>
        <Field label="Lô / suất còn lại">
          <select required value={f.offerId} onChange={set('offerId')} style={field}>
            <option value="">— Chọn lô —</option>
            {list.map((o) => (
              <option key={o.offerId} value={o.offerId}>
                {o.suggested ? '★ ' : ''}
                {o.itemName ?? 'Túi bất ngờ'} · còn {o.remainingQuantity} · hạn dùng{' '}
                {dt(o.lotExpiresAt)}
              </option>
            ))}
          </select>
        </Field>
        {offers.state.status === 'error' && <p style={errorText}>{offers.state.message}</p>}
        {offers.state.status === 'success' && list.length === 0 && (
          <p className="sq-caption" style={{ margin: 0 }}>
            Không có lô nào còn khả dụng và chưa hết hạn.
          </p>
        )}
        {list.some((o) => o.suggested) && (
          <p className="sq-caption" style={{ margin: 0 }}>
            ★ = gợi ý: gần cuối khung nhận và còn nhiều suất.
          </p>
        )}
        <Field
          label={`Số lượng thực tế có thể bàn giao${selected ? ` (≤ ${selected.remainingQuantity})` : ''}`}
        >
          <input
            required
            type="number"
            min={1}
            max={selected?.remainingQuantity}
            value={f.quantity}
            onChange={set('quantity')}
            style={field}
          />
        </Field>
        {selected && !selected.foodCategory && (
          <Field label="Nhóm món (suất không gắn món)">
            <input required value={f.foodCategory} onChange={set('foodCategory')} style={field} />
          </Field>
        )}
        <Row>
          <Field label="Sẵn sàng từ">
            <input
              required
              type="datetime-local"
              value={f.availableAt}
              onChange={set('availableAt')}
              style={field}
            />
          </Field>
          <Field label="Hạn nhận">
            <input
              required
              type="datetime-local"
              value={f.handoverDeadline}
              onChange={set('handoverDeadline')}
              style={field}
            />
          </Field>
        </Row>
        <Field label="Điều kiện bảo quản (cửa hàng tự khai báo)">
          <textarea
            required
            value={f.storageNotes}
            onChange={set('storageNotes')}
            style={{ ...field, height: 72, padding: 10 }}
          />
        </Field>
        <Field label="Trách nhiệm vận chuyển & chi phí">
          <select
            value={f.transportResponsibility}
            onChange={set('transportResponsibility')}
            style={field}
          >
            {Object.entries(TRANSPORT).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <p style={warnBox}>
          Số lượng sẽ được giữ ngay khỏi tồn bán cho khách. Hủy đề nghị để trả lại.
        </p>
        {error && <p style={errorText}>{error}</p>}
        <button type="submit" disabled={busy} style={primaryBtn}>
          {busy ? 'Đang tạo…' : 'Tạo đề nghị (Nháp)'}
        </button>
      </form>
    </Modal>
  );
}

type ModalKind = null | 'handover' | 'fail' | 'cancel';

function TransferDetailView({ id, onBack }: { id: string; onBack: () => void }) {
  const detail = useApiData<TransferDetail>(
    () => api.get(`/store/rescue-bridge/transfers/${id}`),
    undefined,
    '',
    [id],
  );
  const [modal, setModal] = useState<ModalKind>(null);
  const [link, setLink] = useState<string | null>(null);
  const [responsible, setResponsible] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      detail.reload();
    } catch (err) {
      setActionError(errMsg(err, 'Thao tác thất bại.'));
    } finally {
      setBusy(false);
    }
  };

  if (detail.state.status === 'loading') return <SkeletonList rows={4} height={96} />;
  if (detail.state.status !== 'success') {
    return (
      <ErrorState
        message={detail.state.status === 'error' ? detail.state.message : 'Không tải được đề nghị.'}
        onRetry={detail.reload}
      />
    );
  }
  const t = detail.state.data;
  const can = (a: Action) => t.allowedActions.includes(a);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sq-space-5)' }}>
      <button onClick={onBack} style={{ ...ghostBtn, alignSelf: 'flex-start' }}>
        <ArrowLeft size={16} /> Tất cả đề nghị
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 className="sq-h1" style={{ margin: 0 }}>
          {t.offer?.itemName ?? t.foodCategory} · {t.quantityProposed} suất
        </h1>
        <Badge status={t.transferStatus} />
      </div>
      {t.failureReason && (
        <p className="sq-body" style={{ margin: 0, color: 'var(--sq-ink-soft)' }}>
          Lý do: {t.failureReason}
        </p>
      )}
      {t.isDisputed && (
        <p style={warnBox}>
          Đang tranh chấp - đã chuyển vận hành nền tảng xử lý, hệ thống không tự kết luận bên đúng.{' '}
          {t.disputeNote}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {can('CONFIRM_HANDOVER') && (
          <button onClick={() => setModal('handover')} style={primaryBtn}>
            Xác nhận đã bàn giao
          </button>
        )}
        {can('ROTATE_LINK') && (
          <button
            disabled={busy}
            onClick={() =>
              run(async () =>
                setLink(
                  (
                    await api.post<{ responseLink: string }>(
                      `/store/rescue-bridge/transfers/${id}/response-link`,
                    )
                  ).responseLink,
                ),
              )
            }
            style={ghostBtn}
          >
            Cấp lại link cho đơn vị
          </button>
        )}
        {can('FAIL') && (
          <button onClick={() => setModal('fail')} style={ghostBtn}>
            Báo thất bại
          </button>
        )}
        {can('CANCEL') && (
          <button onClick={() => setModal('cancel')} style={dangerBtn}>
            Hủy đề nghị
          </button>
        )}
      </div>
      {actionError && <p style={errorText}>{actionError}</p>}
      {link && <LinkBox link={link} />}

      <Section title="Đề nghị">
        <Grid>
          <Info label="Nhóm món" value={t.foodCategory} />
          <Info label="Đang giữ khỏi tồn bán" value={`${t.reservedQuantity} suất`} />
          <Info
            label="Sẵn sàng → Hạn nhận"
            value={`${dt(t.availableAt)} → ${dt(t.handoverDeadline)}`}
          />
          <Info label="Vận chuyển" value={TRANSPORT[t.transportResponsibility]} />
          <Info label="Bảo quản (cửa hàng khai báo)" value={t.storageNotes} />
        </Grid>
      </Section>

      {t.transferStatus === 'DRAFT' && (
        <MatchesSection
          id={id}
          onSent={(l) => {
            setLink(l);
            detail.reload();
          }}
        />
      )}

      {t.recipientOrg && (
        <Section title="Đơn vị tiếp nhận & phản hồi">
          <Grid>
            <Info label="Đơn vị" value={t.recipientOrg.name} />
            {t.recipientOrg.contactName && (
              <Info
                label="Liên hệ"
                value={`${t.recipientOrg.contactName} · ${t.recipientOrg.contactPhone}`}
              />
            )}
            <Info
              label="Số lượng chấp nhận"
              value={
                t.quantityAccepted == null
                  ? 'Chưa phản hồi'
                  : `${t.quantityAccepted} / ${t.quantityProposed}`
              }
            />
            <Info label="Giờ đến nhận" value={dt(t.agreedPickupAt)} />
            <Info label="Người phụ trách (đơn vị)" value={t.recipientResponsibleName ?? '—'} />
            <Info label="Người phụ trách (cửa hàng)" value={t.storeResponsibleName ?? '—'} />
          </Grid>
          {t.recipientNote && (
            <p className="sq-body" style={{ margin: '12px 0 0' }}>
              Ghi chú đơn vị: {t.recipientNote}
            </p>
          )}
          {can('CONFIRM_AGREEMENT') && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(() =>
                  api.post(`/store/rescue-bridge/transfers/${id}/confirm-agreement`, {
                    storeResponsibleName: responsible,
                  }),
                );
              }}
              style={{ ...formCol, marginTop: 16 }}
            >
              {t.quantityAccepted !== t.quantityProposed && (
                <p style={warnBox}>
                  Đơn vị đề xuất nhận {t.quantityAccepted}/{t.quantityProposed} suất. Phần còn lại
                  đã trả về tồn bán. Không đồng ý thì hủy đề nghị.
                </p>
              )}
              <Field label="Người chịu trách nhiệm phía cửa hàng">
                <input
                  required
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                  style={field}
                />
              </Field>
              <button type="submit" disabled={busy} style={primaryBtn}>
                Đồng ý điều kiện → Chờ bàn giao
              </button>
            </form>
          )}
        </Section>
      )}

      {(t.senderConfirmedAt || t.recipientConfirmedAt || t.quantityHandedOver != null) && (
        <Section title="Xác nhận bàn giao">
          <Grid>
            <Info
              label="Cửa hàng xác nhận"
              value={
                t.senderConfirmedAt
                  ? `${t.senderConfirmedQuantity} suất · ${dt(t.senderConfirmedAt)}`
                  : 'Chưa'
              }
            />
            <Info
              label="Đơn vị xác nhận"
              value={
                t.recipientConfirmedAt
                  ? `${t.recipientConfirmedQuantity} suất · ${t.recipientConfirmedBy} · ${dt(t.recipientConfirmedAt)}`
                  : 'Chưa'
              }
            />
            <Info label="Bằng chứng" value={t.evidenceReference ?? '—'} />
            {t.quantityHandedOver != null && (
              <Info
                label="Thực tế bàn giao"
                value={`${t.quantityHandedOver} suất (chênh ${(t.quantityAccepted ?? 0) - t.quantityHandedOver})`}
              />
            )}
          </Grid>
        </Section>
      )}

      <Section title="Nhật ký">
        {t.history.map((h, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 12,
              padding: '6px 0',
              borderTop: i ? '1px solid var(--sq-line)' : 'none',
            }}
          >
            <span className="sq-caption sq-tabular" style={{ minWidth: 96 }}>
              {dt(h.createdAt)}
            </span>
            <span className="sq-body">
              {ACTION_LABEL[h.action] ?? h.action}
              {typeof h.newValue?.reason === 'string' && ` - ${h.newValue.reason}`}
            </span>
          </div>
        ))}
      </Section>

      {modal === 'handover' && (
        <HandoverModal
          transfer={t}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            detail.reload();
          }}
        />
      )}
      {(modal === 'fail' || modal === 'cancel') && (
        <ReasonModal
          title={modal === 'fail' ? 'Báo thất bại' : 'Hủy đề nghị'}
          hint="Toàn bộ suất đang giữ sẽ trả về tồn bán. Lý do được ghi nhật ký."
          onClose={() => setModal(null)}
          onSubmit={async (reason) => {
            await api.post(`/store/rescue-bridge/transfers/${id}/${modal}`, { reason });
            setModal(null);
            detail.reload();
          }}
        />
      )}
    </div>
  );
}

function MatchesSection({ id, onSent }: { id: string; onSent: (link: string) => void }) {
  const matches = useApiData<{ matches: Match[]; message: string | null }>(
    () => api.get(`/store/rescue-bridge/transfers/${id}/matches`),
    undefined,
    '',
    [id],
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async (recipientOrgId: string) => {
    setBusyId(recipientOrgId);
    setError(null);
    try {
      const res = await api.post<{ responseLink: string }>(
        `/store/rescue-bridge/transfers/${id}/send`,
        { recipientOrgId },
      );
      onSent(res.responseLink);
    } catch (err) {
      setError(errMsg(err, 'Không gửi được đề nghị.'));
      setBusyId(null);
    }
  };

  return (
    <Section title="Chọn đơn vị tiếp nhận phù hợp">
      <p className="sq-caption" style={{ margin: '0 0 12px', color: 'var(--sq-ink-muted)' }}>
        Chỉ đơn vị đã được duyệt, nhận đúng nhóm món, đủ năng lực, phục vụ khu vực cửa hàng và có
        giờ nhận trùng khung bàn giao. Thông tin liên hệ hiển thị sau khi gửi.
      </p>
      {matches.state.status === 'loading' && <SkeletonList rows={2} height={56} />}
      {matches.state.status === 'error' && (
        <ErrorState message={matches.state.message} onRetry={matches.reload} />
      )}
      {matches.state.status === 'success' && matches.state.data.matches.length === 0 && (
        <p style={warnBox}>{matches.state.data.message}</p>
      )}
      {matches.state.status === 'success' &&
        matches.state.data.matches.map((o) => (
          <div
            key={o.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              padding: '10px 0',
              borderTop: '1px solid var(--sq-line)',
            }}
          >
            <div>
              <div style={{ fontWeight: 650 }}>{o.name}</div>
              <div className="sq-caption" style={{ color: 'var(--sq-ink-muted)' }}>
                Tối đa {o.maxQuantityPerTransfer} suất/lần · {o.serviceAreas.join(', ')}
                {o.receivingWindowStart &&
                  ` · nhận ${o.receivingWindowStart.slice(0, 5)}–${o.receivingWindowEnd?.slice(0, 5)}`}
                {o.capacityNote && ` · ${o.capacityNote}`}
              </div>
            </div>
            <button disabled={busyId !== null} onClick={() => send(o.id)} style={primaryBtn}>
              {busyId === o.id ? 'Đang gửi…' : 'Gửi đề nghị'}
            </button>
          </div>
        ))}
      {error && <p style={errorText}>{error}</p>}
    </Section>
  );
}

function LinkBox({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ ...warnBox, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span>
        Gửi link này cho người liên hệ của đơn vị để họ chấp nhận/từ chối và xác nhận nhận hàng.
        Link chỉ hiển thị một lần.
      </span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          readOnly
          value={link}
          style={{ ...field, flex: 1 }}
          onFocus={(e) => e.target.select()}
          aria-label="Link phản hồi"
        />
        <button
          type="button"
          style={ghostBtn}
          onClick={() => navigator.clipboard?.writeText(link).then(() => setCopied(true))}
        >
          <Copy size={16} /> {copied ? 'Đã chép' : 'Chép'}
        </button>
      </div>
    </div>
  );
}

function HandoverModal({
  transfer,
  onClose,
  onDone,
}: {
  transfer: TransferDetail;
  onClose: () => void;
  onDone: () => void;
}) {
  const [qty, setQty] = useState(
    String(transfer.senderConfirmedQuantity ?? transfer.quantityAccepted ?? ''),
  );
  const [evidence, setEvidence] = useState(transfer.evidenceReference ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal title="Xác nhận đã bàn giao" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await api.post(`/store/rescue-bridge/transfers/${transfer.id}/confirm-handover`, {
              quantityHandedOver: Number(qty),
              ...(evidence.trim() && { evidenceReference: evidence.trim() }),
            });
            onDone();
          } catch (err) {
            setError(errMsg(err, 'Không xác nhận được.'));
            setBusy(false);
          }
        }}
        style={formCol}
      >
        <p className="sq-body" style={{ margin: 0, color: 'var(--sq-ink-soft)' }}>
          Chỉ hoàn tất khi đơn vị tiếp nhận cũng xác nhận cùng số lượng. Số lệch sẽ chuyển vận hành
          xử lý.
        </p>
        <Field label={`Số lượng thực giao (≤ ${transfer.quantityAccepted})`}>
          <input
            required
            type="number"
            min={1}
            max={transfer.quantityAccepted ?? undefined}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            style={field}
          />
        </Field>
        <Field
          label={`Bằng chứng: link ảnh / số biên bản${transfer.evidenceRequired ? ' (bắt buộc)' : ''}`}
        >
          <input
            required={transfer.evidenceRequired}
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            style={field}
          />
        </Field>
        {error && <p style={errorText}>{error}</p>}
        <button type="submit" disabled={busy} style={primaryBtn}>
          {busy ? 'Đang gửi…' : 'Xác nhận'}
        </button>
      </form>
    </Modal>
  );
}

function ReportView() {
  const report = useApiData<Report>(() => api.get('/store/rescue-bridge/report'));
  if (report.state.status === 'loading') return <SkeletonList rows={3} height={72} />;
  if (report.state.status !== 'success') {
    return (
      <ErrorState
        message={report.state.status === 'error' ? report.state.message : ''}
        onRetry={report.reload}
      />
    );
  }
  const r = report.state.data;
  return (
    <>
      <Section title="Đề nghị · Chấp nhận · Thực tế bàn giao">
        <Grid>
          <Info
            label="Đã gửi đề nghị"
            value={`${r.proposed.quantity} suất (${r.proposed.count} đề nghị)`}
          />
          <Info
            label="Được chấp nhận"
            value={`${r.accepted.quantity} suất (${r.accepted.count})`}
          />
          <Info
            label="Thực tế bàn giao"
            value={`${r.handedOver.quantity} suất (${r.handedOver.count})`}
          />
          <Info label="Thiếu so với chấp nhận" value={`${r.shortfallQuantity} suất`} />
          <Info label="Tranh chấp đang mở" value={String(r.openDisputes)} />
        </Grid>
        <p className="sq-caption" style={{ margin: '12px 0 0', color: 'var(--sq-ink-muted)' }}>
          {r.note}
        </p>
      </Section>
      <Section title="Theo trạng thái">
        <Grid>
          {r.byStatus.map((s) => (
            <Info
              key={s.status}
              label={STATUS[s.status]?.label ?? s.status}
              value={String(s.count)}
            />
          ))}
        </Grid>
      </Section>
      <Section title="Lý do từ chối / thất bại / hủy">
        {r.closedReasons.length === 0 && <p className="sq-caption">Chưa có.</p>}
        {r.closedReasons.map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '6px 0' }}>
            <Badge status={c.status} />
            <span className="sq-body" style={{ flex: 1 }}>
              {c.reason}
            </span>
            <span className="sq-body-medium sq-tabular">{c.count}</span>
          </div>
        ))}
      </Section>
    </>
  );
}

// ══════════════════════════ Recipient page (public link) ══════════════════════════

interface RecipientView {
  id: string;
  status: Status;
  recipientOrgName: string | null;
  store: { name: string; address: string; phone: string } | null;
  itemName: string | null;
  foodCategory: string;
  quantityProposed: number;
  quantityAccepted: number | null;
  quantityHandedOver: number | null;
  availableAt: string;
  handoverDeadline: string;
  storageNotes: string;
  transportResponsibility: Transport;
  agreedPickupAt: string | null;
  storeResponsibleName: string | null;
  recipientResponsibleName: string | null;
  senderConfirmedQuantity: number | null;
  recipientConfirmedQuantity: number | null;
  isDisputed: boolean;
  failureReason: string | null;
  safetyNotice: string;
}

export function RescueBridgeRespondPage() {
  const { token = '' } = useParams();
  const base = `/rescue-bridge/respond/${encodeURIComponent(token)}`;
  const view = useApiData<RecipientView>(() => api.get(base), undefined, '', [token]);
  const [mode, setMode] = useState<'accept' | 'reject' | null>(null);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--sq-canvas)',
        padding: 'var(--sq-space-6) 16px',
      }}
    >
      <div
        style={{
          maxWidth: 640,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--sq-space-5)',
        }}
      >
        <h1 className="sq-h1" style={{ margin: 0 }}>
          Đề nghị bàn giao thực phẩm
        </h1>
        {view.state.status === 'loading' && <SkeletonList rows={3} height={80} />}
        {view.state.status === 'error' && (
          <ErrorState message={view.state.message} onRetry={view.reload} />
        )}
        {view.state.status === 'success' &&
          (() => {
            const v = view.state.data;
            return (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Badge status={v.status} />
                  {v.recipientOrgName && (
                    <span className="sq-body">gửi tới {v.recipientOrgName}</span>
                  )}
                </div>
                {v.failureReason && (
                  <p className="sq-body" style={{ margin: 0 }}>
                    Lý do: {v.failureReason}
                  </p>
                )}
                <Section title="Thông tin">
                  <Grid>
                    <Info
                      label="Cửa hàng"
                      value={v.store ? `${v.store.name} · ${v.store.phone}` : '—'}
                    />
                    <Info label="Địa chỉ" value={v.store?.address ?? '—'} />
                    <Info
                      label="Món"
                      value={`${v.itemName ?? v.foodCategory} (${v.foodCategory})`}
                    />
                    <Info label="Số lượng đề nghị" value={`${v.quantityProposed} suất`} />
                    {v.quantityAccepted != null && (
                      <Info label="Đã thống nhất" value={`${v.quantityAccepted} suất`} />
                    )}
                    <Info
                      label="Sẵn sàng → Hạn nhận"
                      value={`${dt(v.availableAt)} → ${dt(v.handoverDeadline)}`}
                    />
                    {v.agreedPickupAt && <Info label="Giờ đến nhận" value={dt(v.agreedPickupAt)} />}
                    {v.storeResponsibleName && (
                      <Info label="Người phụ trách cửa hàng" value={v.storeResponsibleName} />
                    )}
                    <Info label="Vận chuyển" value={TRANSPORT[v.transportResponsibility]} />
                    <Info label="Bảo quản" value={v.storageNotes} />
                  </Grid>
                  <p style={{ ...warnBox, marginTop: 12 }}>{v.safetyNotice}</p>
                </Section>

                {v.status === 'SENT' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setMode('accept')} style={primaryBtn}>
                      Chấp nhận / đề xuất thay đổi
                    </button>
                    <button onClick={() => setMode('reject')} style={dangerBtn}>
                      Từ chối
                    </button>
                  </div>
                )}
                {v.status === 'ACCEPTED' && (
                  <p className="sq-body">Đang chờ cửa hàng xác nhận điều kiện.</p>
                )}
                {v.status === 'AWAITING_HANDOVER' && (
                  <RecipientConfirmForm base={base} view={v} onDone={view.reload} />
                )}
                {v.isDisputed && (
                  <p style={warnBox}>
                    Số lượng hai bên xác nhận chưa khớp - vận hành nền tảng sẽ liên hệ xử lý.
                  </p>
                )}

                {mode === 'accept' && (
                  <RecipientAcceptModal
                    base={base}
                    view={v}
                    onClose={() => setMode(null)}
                    onDone={() => {
                      setMode(null);
                      view.reload();
                    }}
                  />
                )}
                {mode === 'reject' && (
                  <ReasonModal
                    title="Từ chối đề nghị"
                    hint="Cửa hàng sẽ thấy lý do."
                    onClose={() => setMode(null)}
                    onSubmit={async (reason) => {
                      await api.post(`${base}/reject`, { reason });
                      setMode(null);
                      view.reload();
                    }}
                  />
                )}
              </>
            );
          })()}
      </div>
    </div>
  );
}

function RecipientAcceptModal({
  base,
  view,
  onClose,
  onDone,
}: {
  base: string;
  view: RecipientView;
  onClose: () => void;
  onDone: () => void;
}) {
  const [f, setF] = useState({
    quantityAccepted: String(view.quantityProposed),
    pickupAt: '',
    responsibleName: '',
    note: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });
  return (
    <Modal title="Chấp nhận đề nghị" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await api.post(`${base}/accept`, {
              quantityAccepted: Number(f.quantityAccepted),
              pickupAt: toIso(f.pickupAt),
              responsibleName: f.responsibleName,
              ...(f.note.trim() && { note: f.note.trim() }),
            });
            onDone();
          } catch (err) {
            setError(errMsg(err, 'Không gửi được phản hồi.'));
            setBusy(false);
          }
        }}
        style={formCol}
      >
        <Field label={`Số lượng nhận (≤ ${view.quantityProposed})`}>
          <input
            required
            type="number"
            min={1}
            max={view.quantityProposed}
            value={f.quantityAccepted}
            onChange={set('quantityAccepted')}
            style={field}
          />
        </Field>
        <Field label={`Giờ đến nhận (${dt(view.availableAt)} → ${dt(view.handoverDeadline)})`}>
          <input
            required
            type="datetime-local"
            value={f.pickupAt}
            onChange={set('pickupAt')}
            style={field}
          />
        </Field>
        <Field label="Người chịu trách nhiệm nhận">
          <input
            required
            value={f.responsibleName}
            onChange={set('responsibleName')}
            style={field}
          />
        </Field>
        <Field label="Ghi chú (nếu đề xuất thay đổi)">
          <textarea
            value={f.note}
            onChange={set('note')}
            style={{ ...field, height: 64, padding: 10 }}
          />
        </Field>
        {error && <p style={errorText}>{error}</p>}
        <button type="submit" disabled={busy} style={primaryBtn}>
          {busy ? 'Đang gửi…' : 'Gửi phản hồi'}
        </button>
      </form>
    </Modal>
  );
}

function RecipientConfirmForm({
  base,
  view,
  onDone,
}: {
  base: string;
  view: RecipientView;
  onDone: () => void;
}) {
  const [qty, setQty] = useState(
    String(view.recipientConfirmedQuantity ?? view.quantityAccepted ?? ''),
  );
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Section title="Xác nhận đã nhận hàng">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await api.post(`${base}/confirm-handover`, {
              quantityReceived: Number(qty),
              confirmedByName: name,
            });
            onDone();
          } catch (err) {
            setError(errMsg(err, 'Không xác nhận được.'));
          } finally {
            setBusy(false);
          }
        }}
        style={formCol}
      >
        {view.recipientConfirmedQuantity != null && (
          <p className="sq-caption" style={{ margin: 0 }}>
            Bạn đã xác nhận {view.recipientConfirmedQuantity} suất. Gửi lại nếu cần sửa.
          </p>
        )}
        <Field label={`Số lượng thực nhận (≤ ${view.quantityAccepted})`}>
          <input
            required
            type="number"
            min={1}
            max={view.quantityAccepted ?? undefined}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            style={field}
          />
        </Field>
        <Field label="Họ tên người xác nhận">
          <input required value={name} onChange={(e) => setName(e.target.value)} style={field} />
        </Field>
        {error && <p style={errorText}>{error}</p>}
        <button type="submit" disabled={busy} style={primaryBtn}>
          {busy ? 'Đang gửi…' : 'Xác nhận đã nhận'}
        </button>
      </form>
    </Section>
  );
}

// ══════════════════════════ shared bits ══════════════════════════

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
            setError(errMsg(err, 'Thao tác thất bại.'));
            setBusy(false);
          }
        }}
        style={formCol}
      >
        <p className="sq-body" style={{ margin: 0, color: 'var(--sq-ink-soft)' }}>
          {hint}
        </p>
        <Field label="Lý do (bắt buộc)">
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
  overflowX: 'auto',
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
