import { useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { AlertTriangle, FlaskConical, GitCompare, Plus, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { useApiData } from '../lib/useApiData';
import { SkeletonList, ErrorState, EmptyState } from '../components/StateViews';
import { Modal } from '../components/Modal';

type Objective =
  'REDUCE_SURPLUS' | 'INCREASE_RECOVERY_REVENUE' | 'INCREASE_SELLTHROUGH' | 'COMPARE_STRATEGIES';
type SimStatus = 'DRAFT' | 'RUNNING' | 'COMPLETED' | 'FAILED';
type MetricKey =
  | 'offeredUnits'
  | 'soldUnits'
  | 'surplusUnits'
  | 'sellThroughRate'
  | 'recoveryRevenue'
  | 'avgRealizedPrice'
  | 'avgOriginalPrice'
  | 'realizedDiscountRatio';

interface Metrics extends Record<MetricKey, number> {
  kind: 'SIMULATED' | 'ACTUAL' | 'ACTUAL_BASELINE';
  periodDays: number;
}
interface Warning {
  code: string;
  severity: 'BLOCKING' | 'RESTRICTED';
  message: string;
}
interface Assumptions {
  discountRatio: number;
  priceElasticity: number;
  volumeChangePct: number;
  note?: string;
}
interface ItemScope {
  itemIds?: string[];
  categories?: string[];
}
interface Version {
  id: string;
  scenarioId: string;
  versionNo: number;
  dateRange: { start: string; end: string };
  itemScope: ItemScope;
  assumptions: Assumptions;
  simulationStatus: SimStatus;
  runMode: 'FULL' | 'RESTRICTED' | null;
  blocked: boolean;
  dataQualityWarnings: Warning[];
  failedReason: string | null;
  engineVersion: string | null;
  inputSnapshotHash: string | null;
  simulatedMetrics: { simulated: Metrics; baseline: Metrics } | null;
  runCompletedAt: string | null;
  applied: { appliedAt: string; appliedBy: string; appliedScope: { note?: string } } | null;
  observationWindow: { start: string; end: string } | null;
  createdAt: string;
}
interface Scenario {
  id: string;
  title: string;
  objective: Objective;
  currentVersion: number;
  updatedAt: string;
  latestVersion?: Version | null;
  versions?: Version[];
}
interface Definitions {
  engineVersion: string;
  metrics: Record<MetricKey, { label: string; unit: string; formula: string; source: string }>;
  simulationModel: Record<string, string>;
}
interface ComparisonRow {
  metric: MetricKey;
  label: string;
  basis: 'PER_DAY' | 'DIRECT';
  simulated: number;
  actual: number;
  delta: number;
  deltaPct: number | null;
}
interface Observation {
  status: 'NOT_APPLIED' | 'NOT_STARTED' | 'OBSERVING' | 'COMPLETED';
  message?: string;
  observationWindow?: { start: string; end: string };
  simulated?: Metrics | null;
  actual?: Metrics | null;
  comparisonResult?: {
    rows: ComparisonRow[];
    confounders: { code: string; count: number; label: string }[];
  } | null;
  limitationNotes?: string[];
}
interface CompareResult {
  notice: string;
  objective: Objective;
  primaryMetric: { metric: MetricKey; direction: 'MIN' | 'MAX' } | null;
  baseline: Metrics;
  rows: {
    versionId: string;
    scenarioTitle: string;
    versionNo: number;
    assumptions: Assumptions;
    runMode: string | null;
    simulated: Metrics;
  }[];
  bestVersionId: string | null;
}

const OBJECTIVE_LABEL: Record<Objective, string> = {
  REDUCE_SURPLUS: 'Giảm tồn dư',
  INCREASE_RECOVERY_REVENUE: 'Tăng doanh thu thu hồi',
  INCREASE_SELLTHROUGH: 'Tăng tỷ lệ bán',
  COMPARE_STRATEGIES: 'So sánh chiến lược',
};
const STATUS_STYLE: Record<SimStatus, { bg: string; fg: string; label: string }> = {
  DRAFT: { bg: 'var(--sq-surface-soft)', fg: 'var(--sq-ink-muted)', label: 'Nháp' },
  RUNNING: { bg: 'var(--sq-sky-wash)', fg: 'var(--sq-info)', label: 'Đang chạy' },
  COMPLETED: { bg: 'var(--sq-mint-wash)', fg: 'var(--sq-mint-deep)', label: 'Hoàn tất' },
  FAILED: { bg: 'var(--sq-coral-wash)', fg: 'var(--sq-coral-deep)', label: 'Thất bại' },
};
const METRIC_ORDER: MetricKey[] = [
  'offeredUnits',
  'soldUnits',
  'surplusUnits',
  'sellThroughRate',
  'recoveryRevenue',
  'avgRealizedPrice',
];
const FALLBACK_LABEL: Record<MetricKey, string> = {
  offeredUnits: 'Suất đưa lên cứu',
  soldUnits: 'Suất bán được',
  surplusUnits: 'Tồn dư không cứu được',
  sellThroughRate: 'Tỷ lệ bán',
  recoveryRevenue: 'Doanh thu thu hồi',
  avgRealizedPrice: 'Giá thực thu bình quân',
  avgOriginalPrice: 'Giá gốc bình quân',
  realizedDiscountRatio: 'Mức giảm giá thực tế',
};

const pct = (r: number) => `${Math.round(r * 1000) / 10}%`;
function fmt(key: MetricKey, v: number) {
  if (key === 'sellThroughRate' || key === 'realizedDiscountRatio') return pct(v);
  if (key === 'recoveryRevenue' || key === 'avgRealizedPrice' || key === 'avgOriginalPrice')
    return `${Math.round(v).toLocaleString('vi-VN')}đ`;
  return v.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
}
const scopeText = (s: ItemScope) =>
  [
    s.categories?.length ? `Nhóm: ${s.categories.join(', ')}` : '',
    s.itemIds?.length ? `${s.itemIds.length} món chọn riêng` : '',
  ]
    .filter(Boolean)
    .join(' · ') || 'Tất cả món';
const assumptionText = (a: Assumptions) =>
  `Giảm ${pct(a.discountRatio)} · co giãn ${a.priceElasticity} · số suất ${a.volumeChangePct >= 0 ? '+' : ''}${a.volumeChangePct}%`;
const yesterday = () =>
  new Date(Date.now() + 7 * 3_600_000 - 86_400_000).toISOString().slice(0, 10);
const daysBefore = (iso: string, n: number) =>
  new Date(Date.parse(iso) - n * 86_400_000).toISOString().slice(0, 10);

/** CM-B04 Rescue Lab - /store/rescue-lab. Chỉ mô phỏng & ghi nhận; không trang nào ở đây đổi giá/tồn thật. */
export function RescueLabPage() {
  const list = useApiData<Scenario[]>(
    () => api.get('/store/rescue-lab/scenarios'),
    (d) => d.length === 0,
    'Chưa có kịch bản nào.',
  );
  const defs = useApiData<Definitions>(() => api.get('/store/rescue-lab/metric-definitions'));
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const definitions = defs.state.status === 'success' ? defs.state.data : null;
  const label = (k: MetricKey) => definitions?.metrics[k]?.label ?? FALLBACK_LABEL[k];

  const toggle = (versionId: string) =>
    setSelected((s) =>
      s.includes(versionId)
        ? s.filter((x) => x !== versionId)
        : s.length >= 5
          ? s
          : [...s, versionId],
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
        <div>
          <h1 className="sq-h1" style={{ margin: 0 }}>
            Rescue Lab
          </h1>
          <p className="sq-body" style={{ color: 'var(--sq-ink-soft)', margin: '4px 0 0' }}>
            Thử kịch bản giá/số suất trên dữ liệu đã bán, lưu từng phiên bản và đối chiếu với kết
            quả thật sau khi áp dụng.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setComparing(true)}
            disabled={selected.length < 2}
            style={{ ...secondaryButton, opacity: selected.length < 2 ? 0.55 : 1 }}
          >
            <GitCompare size={16} /> So sánh ({selected.length})
          </button>
          <button onClick={() => setCreating(true)} style={primaryButton}>
            <Plus size={16} /> Tạo kịch bản
          </button>
        </div>
      </div>

      <Banner tone="info">
        Kết quả ở đây là <b>mô phỏng</b> từ công thức xác định (không dùng AI tạo số). Rescue Lab
        không tự đổi giá hay tồn kho - mọi thay đổi thật vẫn làm ở Suất & tồn kho / đề xuất giá.
      </Banner>

      {list.state.status === 'loading' && <SkeletonList rows={4} height={64} />}
      {list.state.status === 'error' && (
        <ErrorState
          message={list.state.message}
          canRetry={list.state.canRetry}
          onRetry={list.reload}
        />
      )}
      {list.state.status === 'empty' && (
        <EmptyState
          title="Chưa có kịch bản"
          message="Tạo kịch bản đầu tiên: chọn mục tiêu, khoảng thời gian, nhóm món và giả định giảm giá."
          action={
            <button onClick={() => setCreating(true)} style={primaryButton}>
              <Plus size={16} /> Tạo kịch bản
            </button>
          }
        />
      )}
      {list.state.status === 'success' && (
        <section style={listCard}>
          {list.state.data.map((s) => (
            <button
              key={s.id}
              onClick={() => setOpenId(openId === s.id ? null : s.id)}
              style={{
                ...rowButton,
                background: openId === s.id ? 'var(--sq-surface-soft)' : 'transparent',
              }}
            >
              <FlaskConical size={20} color="var(--sq-ink-soft)" />
              <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                <div className="sq-body-medium" style={{ color: 'var(--sq-ink)' }}>
                  {s.title}
                </div>
                <div className="sq-caption" style={{ color: 'var(--sq-ink-soft)', marginTop: 2 }}>
                  {OBJECTIVE_LABEL[s.objective]} · {s.currentVersion} phiên bản
                  {s.latestVersion &&
                    ` · ${s.latestVersion.dateRange.start} → ${s.latestVersion.dateRange.end}`}
                </div>
              </div>
              {s.latestVersion && <VersionBadges v={s.latestVersion} />}
            </button>
          ))}
        </section>
      )}

      {openId && (
        <ScenarioDetail
          key={openId}
          scenarioId={openId}
          label={label}
          selected={selected}
          onToggle={toggle}
          onChanged={list.reload}
        />
      )}

      {definitions && (
        <details style={{ ...listCard, padding: 'var(--sq-space-4)' }}>
          <summary className="sq-body-medium" style={{ cursor: 'pointer' }}>
            Định nghĩa chỉ số & mô hình mô phỏng (lõi {definitions.engineVersion})
          </summary>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(Object.keys(definitions.metrics) as MetricKey[]).map((k) => (
              <div key={k} className="sq-caption" style={{ color: 'var(--sq-ink-soft)' }}>
                <b style={{ color: 'var(--sq-ink)' }}>{definitions.metrics[k].label}</b> ={' '}
                {definitions.metrics[k].formula} (nguồn: {definitions.metrics[k].source})
              </div>
            ))}
            {Object.entries(definitions.simulationModel).map(([k, v]) => (
              <div key={k} className="sq-caption" style={{ color: 'var(--sq-ink-soft)' }}>
                <b style={{ color: 'var(--sq-ink)' }}>Mô hình · {k}</b>: {v}
              </div>
            ))}
          </div>
        </details>
      )}

      {creating && (
        <VersionFormModal
          onClose={() => setCreating(false)}
          onDone={(v) => {
            setCreating(false);
            list.reload();
            setOpenId(v.scenarioId);
          }}
        />
      )}
      {comparing && (
        <CompareModal versionIds={selected} label={label} onClose={() => setComparing(false)} />
      )}
    </div>
  );
}

function VersionBadges({ v }: { v: Version }) {
  const s = STATUS_STYLE[v.simulationStatus];
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      <Pill bg="var(--sq-surface-soft)" fg="var(--sq-ink)">
        v{v.versionNo}
      </Pill>
      <Pill bg={s.bg} fg={s.fg}>
        {s.label}
      </Pill>
      {v.runMode === 'RESTRICTED' && (
        <Pill bg="var(--sq-butter-wash)" fg="var(--sq-warning)" dashed>
          Chế độ hạn chế
        </Pill>
      )}
      {v.applied && (
        <Pill bg="var(--sq-mint-wash)" fg="var(--sq-mint-deep)">
          Đã áp dụng thật
        </Pill>
      )}
    </div>
  );
}

function ScenarioDetail({
  scenarioId,
  label,
  selected,
  onToggle,
  onChanged,
}: {
  scenarioId: string;
  label: (k: MetricKey) => string;
  selected: string[];
  onToggle: (id: string) => void;
  onChanged: () => void;
}) {
  const { state, reload } = useApiData<Scenario>(
    () => api.get(`/store/rescue-lab/scenarios/${scenarioId}`),
    undefined,
    '',
    [scenarioId],
  );
  const [newFrom, setNewFrom] = useState<Version | null>(null);
  const [applying, setApplying] = useState<Version | null>(null);
  const [observing, setObserving] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = () => {
    reload();
    onChanged();
  };

  const rerun = async (v: Version) => {
    setBusy(v.id);
    setError(null);
    try {
      await api.post(`/store/rescue-lab/versions/${v.id}/run`);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không chạy được phiên bản.');
    } finally {
      setBusy(null);
    }
  };

  if (state.status === 'loading') return <SkeletonList rows={2} height={160} />;
  if (state.status === 'error')
    return <ErrorState message={state.message} canRetry={state.canRetry} onRetry={reload} />;
  if (state.status !== 'success') return null;
  const scenario = state.data;

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sq-space-4)' }}>
      <div>
        <h2 className="sq-h2" style={{ margin: 0 }}>
          {scenario.title}
        </h2>
        <p className="sq-caption" style={{ margin: '4px 0 0', color: 'var(--sq-ink-soft)' }}>
          Mục tiêu: {OBJECTIVE_LABEL[scenario.objective]} · Mỗi lần sửa tạo phiên bản mới; phiên bản
          cũ và kết quả của nó được giữ nguyên.
        </p>
      </div>
      {error && <Banner tone="error">{error}</Banner>}

      {scenario.versions?.map((v) => (
        <article
          key={v.id}
          style={{
            ...listCard,
            padding: 'var(--sq-space-5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sq-space-3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className="sq-h3">Phiên bản {v.versionNo}</span>
            <VersionBadges v={v} />
            <span style={{ flex: 1 }} />
            {v.simulationStatus === 'COMPLETED' && (
              <label
                className="sq-caption"
                style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(v.id)}
                  onChange={() => onToggle(v.id)}
                />{' '}
                Chọn để so sánh
              </label>
            )}
          </div>
          <div className="sq-caption" style={{ color: 'var(--sq-ink-soft)' }}>
            Dữ liệu nền {v.dateRange.start} → {v.dateRange.end} · {scopeText(v.itemScope)} ·{' '}
            {assumptionText(v.assumptions)}
            {v.assumptions.note && ` · "${v.assumptions.note}"`}
            {v.runCompletedAt &&
              ` · chạy lúc ${new Date(v.runCompletedAt).toLocaleString('vi-VN')}`}
            {v.inputSnapshotHash &&
              ` · dữ liệu nguồn #${v.inputSnapshotHash.slice(0, 10)} (lõi ${v.engineVersion})`}
          </div>

          {v.dataQualityWarnings.length > 0 && (
            <Banner tone={v.blocked ? 'error' : 'warning'}>
              <b>{v.blocked ? 'Chưa chạy được - thiếu dữ liệu:' : 'Chạy ở chế độ hạn chế:'}</b>
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {v.dataQualityWarnings.map((w) => (
                  <li key={w.code}>{w.message}</li>
                ))}
              </ul>
            </Banner>
          )}
          {v.simulationStatus === 'FAILED' && (
            <Banner tone="error">
              Lỗi tính toán - không có kết quả được lưu. {v.failedReason}
            </Banner>
          )}

          {v.simulatedMetrics && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 12,
              }}
            >
              <MetricsPanel
                title="Kết quả mô phỏng"
                metrics={v.simulatedMetrics.simulated}
                label={label}
              />
              <MetricsPanel
                title={`Thực tế kỳ nền (${v.simulatedMetrics.baseline.periodDays} ngày)`}
                metrics={v.simulatedMetrics.baseline}
                label={label}
              />
            </div>
          )}

          {v.applied && (
            <div className="sq-caption" style={{ color: 'var(--sq-ink-soft)' }}>
              Đã ghi nhận áp dụng lúc {new Date(v.applied.appliedAt).toLocaleString('vi-VN')} · phạm
              vi: {v.applied.appliedScope.note} · quan sát {v.observationWindow?.start} →{' '}
              {v.observationWindow?.end}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setNewFrom(v)} style={secondaryButton}>
              Tạo phiên bản mới từ bản này
            </button>
            {v.simulationStatus === 'DRAFT' && (
              <button onClick={() => rerun(v)} disabled={busy !== null} style={secondaryButton}>
                <RefreshCw size={16} /> {busy === v.id ? 'Đang chạy…' : 'Chạy lại'}
              </button>
            )}
            {v.simulationStatus === 'COMPLETED' && !v.applied && (
              <button onClick={() => setApplying(v)} style={primaryButton}>
                Áp dụng
              </button>
            )}
            {v.applied && (
              <button
                onClick={() => setObserving(observing === v.id ? null : v.id)}
                style={secondaryButton}
              >
                {observing === v.id ? 'Ẩn đối chiếu thực tế' : 'Xem đối chiếu thực tế'}
              </button>
            )}
          </div>
          {observing === v.id && <ObservationPanel versionId={v.id} label={label} />}
        </article>
      ))}

      {newFrom && (
        <VersionFormModal
          scenarioId={scenario.id}
          from={newFrom}
          onClose={() => setNewFrom(null)}
          onDone={() => {
            setNewFrom(null);
            refresh();
          }}
        />
      )}
      {applying && (
        <ApplyModal
          version={applying}
          onClose={() => setApplying(null)}
          onDone={() => {
            setApplying(null);
            refresh();
          }}
        />
      )}
    </section>
  );
}

/** BR-B04-03: khung số mô phỏng luôn viền đứt + nhãn "MÔ PHỎNG"; số thực tế viền liền + nhãn "THỰC TẾ". */
function MetricsPanel({
  title,
  metrics,
  label,
}: {
  title: string;
  metrics: Metrics;
  label: (k: MetricKey) => string;
}) {
  const simulated = metrics.kind === 'SIMULATED';
  return (
    <div
      style={{
        borderRadius: 'var(--sq-radius-md)',
        border: simulated ? '2px dashed var(--sq-lilac)' : '1px solid var(--sq-line)',
        background: simulated ? 'var(--sq-lilac-wash)' : 'var(--sq-surface)',
        padding: 'var(--sq-space-4)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span className="sq-body-medium">{title}</span>
        <KindPill kind={metrics.kind} />
      </div>
      {METRIC_ORDER.map((k) => (
        <div
          key={k}
          className="sq-body sq-tabular"
          style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}
        >
          <span style={{ color: 'var(--sq-ink-soft)' }}>{label(k)}</span>
          <span style={{ fontWeight: 650 }}>{fmt(k, metrics[k])}</span>
        </div>
      ))}
    </div>
  );
}

function KindPill({ kind }: { kind: Metrics['kind'] }) {
  if (kind === 'SIMULATED')
    return (
      <Pill bg="var(--sq-lilac)" fg="#fff">
        MÔ PHỎNG
      </Pill>
    );
  return (
    <Pill bg="var(--sq-mint-wash)" fg="var(--sq-mint-deep)">
      {kind === 'ACTUAL' ? 'THỰC TẾ' : 'THỰC TẾ KỲ NỀN'}
    </Pill>
  );
}

function VersionFormModal({
  scenarioId,
  from,
  onClose,
  onDone,
}: {
  scenarioId?: string;
  from?: Version;
  onClose: () => void;
  onDone: (v: Version) => void;
}) {
  const items = useApiData<{ data: { id: string; name: string; category: string }[] }>(() =>
    api.get('/store/items'),
  );
  const end = yesterday();
  const [f, setF] = useState({
    title: '',
    objective: 'REDUCE_SURPLUS' as Objective,
    dateRangeStart: from?.dateRange.start ?? daysBefore(end, 29),
    dateRangeEnd: from?.dateRange.end ?? end,
    categories: from?.itemScope.categories ?? ([] as string[]),
    itemIds: from?.itemScope.itemIds ?? ([] as string[]),
    discountPct: String(Math.round((from?.assumptions.discountRatio ?? 0.5) * 100)),
    priceElasticity: String(from?.assumptions.priceElasticity ?? 1.5),
    volumeChangePct: String(from?.assumptions.volumeChangePct ?? 0),
    note: from?.assumptions.note ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const allItems = items.state.status === 'success' ? items.state.data.data : [];
  const categories = [...new Set(allItems.map((i) => i.category))].sort();
  const toggleIn = (key: 'categories' | 'itemIds', value: string) =>
    setF((s) => ({
      ...s,
      [key]: s[key].includes(value) ? s[key].filter((x) => x !== value) : [...s[key], value],
    }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const params = {
      dateRangeStart: f.dateRangeStart,
      dateRangeEnd: f.dateRangeEnd,
      categories: f.categories,
      itemIds: f.itemIds,
      discountRatio: Number(f.discountPct) / 100,
      priceElasticity: Number(f.priceElasticity),
      volumeChangePct: Number(f.volumeChangePct),
      ...(f.note.trim() ? { note: f.note.trim() } : {}),
    };
    try {
      const v = scenarioId
        ? await api.post<Version>(`/store/rescue-lab/scenarios/${scenarioId}/versions`, params)
        : await api.post<Version>('/store/rescue-lab/scenarios', {
            ...params,
            title: f.title,
            objective: f.objective,
          });
      onDone(v);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được kịch bản.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={scenarioId ? `Phiên bản mới (từ v${from?.versionNo})` : 'Tạo kịch bản'}
      onClose={onClose}
    >
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {!scenarioId && (
          <>
            <Field label="Tên kịch bản">
              <input
                required
                maxLength={150}
                value={f.title}
                onChange={(e) => setF({ ...f, title: e.target.value })}
                style={inputStyle}
              />
            </Field>
            <Field label="Mục tiêu">
              <select
                value={f.objective}
                onChange={(e) => setF({ ...f, objective: e.target.value as Objective })}
                style={inputStyle}
              >
                {(Object.keys(OBJECTIVE_LABEL) as Objective[]).map((o) => (
                  <option key={o} value={o}>
                    {OBJECTIVE_LABEL[o]}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <Field label="Dữ liệu từ ngày">
            <input
              type="date"
              required
              max={end}
              value={f.dateRangeStart}
              onChange={(e) => setF({ ...f, dateRangeStart: e.target.value })}
              style={inputStyle}
            />
          </Field>
          <Field label="Đến ngày">
            <input
              type="date"
              required
              max={end}
              value={f.dateRangeEnd}
              onChange={(e) => setF({ ...f, dateRangeEnd: e.target.value })}
              style={inputStyle}
            />
          </Field>
        </div>
        <Field label="Nhóm món (bỏ trống = tất cả món)">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {categories.length === 0 && (
              <span className="sq-caption" style={{ color: 'var(--sq-ink-muted)' }}>
                Chưa có món.
              </span>
            )}
            {categories.map((c) => (
              <label key={c} className="sq-caption" style={chipStyle(f.categories.includes(c))}>
                <input
                  type="checkbox"
                  checked={f.categories.includes(c)}
                  onChange={() => toggleIn('categories', c)}
                  style={{ display: 'none' }}
                />
                {c}
              </label>
            ))}
          </div>
        </Field>
        {allItems.length > 0 && (
          <details>
            <summary className="sq-caption" style={{ cursor: 'pointer' }}>
              Chọn thêm món cụ thể ({f.itemIds.length})
            </summary>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {allItems.map((i) => (
                <label
                  key={i.id}
                  className="sq-caption"
                  style={chipStyle(f.itemIds.includes(i.id))}
                >
                  <input
                    type="checkbox"
                    checked={f.itemIds.includes(i.id)}
                    onChange={() => toggleIn('itemIds', i.id)}
                    style={{ display: 'none' }}
                  />
                  {i.name}
                </label>
              ))}
            </div>
          </details>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <Field label="Giảm giá giả định (%)">
            <input
              type="number"
              required
              min={5}
              max={70}
              value={f.discountPct}
              onChange={(e) => setF({ ...f, discountPct: e.target.value })}
              style={inputStyle}
            />
          </Field>
          <Field label="Độ co giãn (giả định)">
            <input
              type="number"
              required
              min={0}
              max={5}
              step={0.1}
              value={f.priceElasticity}
              onChange={(e) => setF({ ...f, priceElasticity: e.target.value })}
              style={inputStyle}
            />
          </Field>
          <Field label="Số suất (+/- %)">
            <input
              type="number"
              required
              min={-90}
              max={200}
              value={f.volumeChangePct}
              onChange={(e) => setF({ ...f, volumeChangePct: e.target.value })}
              style={inputStyle}
            />
          </Field>
        </div>
        <Field label="Ghi chú giả định">
          <input
            maxLength={500}
            value={f.note}
            onChange={(e) => setF({ ...f, note: e.target.value })}
            style={inputStyle}
          />
        </Field>
        <p className="sq-caption" style={{ margin: 0, color: 'var(--sq-ink-muted)' }}>
          Lưu xong hệ thống chạy ngay. Thiếu dữ liệu nghiêm trọng thì phiên bản ở trạng thái Nháp
          kèm lý do.
        </p>
        {error && <Banner tone="error">{error}</Banner>}
        <button type="submit" disabled={busy} style={primaryButton}>
          {busy ? 'Đang chạy…' : 'Lưu & chạy'}
        </button>
      </form>
    </Modal>
  );
}

function ApplyModal({
  version,
  onClose,
  onDone,
}: {
  version: Version;
  onClose: () => void;
  onDone: () => void;
}) {
  const start = new Date(
    Math.max(Date.parse(version.dateRange.end) + 86_400_000, Date.parse(yesterday()) + 86_400_000),
  )
    .toISOString()
    .slice(0, 10);
  const [f, setF] = useState({
    observationWindowStart: start,
    observationWindowEnd: daysBefore(start, -13),
    scopeNote: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post(`/store/rescue-lab/versions/${version.id}/apply`, f);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không ghi nhận được.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Ghi nhận áp dụng v${version.versionNo}`} onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Banner tone="warning">
          Thao tác này <b>chỉ ghi nhận</b> rằng bạn đã (hoặc sẽ) thay đổi ngoài thực tế theo kịch
          bản này, để hệ thống theo dõi kết quả thật. Nó <b>không đổi giá, không đổi tồn kho</b> -
          hãy tự điều chỉnh ở Suất & tồn kho / đề xuất giá. Bản ghi áp dụng không sửa được sau khi
          lưu.
        </Banner>
        <Field label="Đã thay đổi gì, cho món nào?">
          <input
            required
            maxLength={500}
            value={f.scopeNote}
            onChange={(e) => setF({ ...f, scopeNote: e.target.value })}
            style={inputStyle}
          />
        </Field>
        <div style={{ display: 'flex', gap: 8 }}>
          <Field label="Quan sát từ ngày">
            <input
              type="date"
              required
              min={daysBefore(version.dateRange.end, -1)}
              value={f.observationWindowStart}
              onChange={(e) => setF({ ...f, observationWindowStart: e.target.value })}
              style={inputStyle}
            />
          </Field>
          <Field label="Đến ngày">
            <input
              type="date"
              required
              min={f.observationWindowStart}
              value={f.observationWindowEnd}
              onChange={(e) => setF({ ...f, observationWindowEnd: e.target.value })}
              style={inputStyle}
            />
          </Field>
        </div>
        {error && <Banner tone="error">{error}</Banner>}
        <button type="submit" disabled={busy} style={primaryButton}>
          {busy ? 'Đang lưu…' : 'Xác nhận ghi nhận áp dụng'}
        </button>
      </form>
    </Modal>
  );
}

function ObservationPanel({
  versionId,
  label,
}: {
  versionId: string;
  label: (k: MetricKey) => string;
}) {
  const { state, reload } = useApiData<Observation>(
    () => api.get(`/store/rescue-lab/versions/${versionId}/observation`),
    undefined,
    '',
    [versionId],
  );
  if (state.status === 'loading') return <SkeletonList rows={1} height={120} />;
  if (state.status === 'error')
    return <ErrorState message={state.message} canRetry={state.canRetry} onRetry={reload} />;
  if (state.status !== 'success') return null;
  const o = state.data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {o.message && <Banner tone="info">{o.message}</Banner>}
      {/* Giới hạn diễn giải đặt TRÊN bảng số, không chôn ở cuối (BR-B04-06). */}
      {o.limitationNotes && o.limitationNotes.length > 0 && (
        <Banner tone="warning">
          <b>Giới hạn diễn giải</b>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            {o.limitationNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </Banner>
      )}
      {o.status === 'OBSERVING' && o.simulated && o.actual && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 12,
          }}
        >
          <MetricsPanel title="Mô phỏng" metrics={o.simulated} label={label} />
          <MetricsPanel
            title={`Thực tế tạm tính (${o.actual.periodDays} ngày)`}
            metrics={o.actual}
            label={label}
          />
        </div>
      )}
      {o.status === 'COMPLETED' && o.comparisonResult && (
        <div style={{ overflowX: 'auto' }}>
          <table
            className="sq-body sq-tabular"
            style={{ width: '100%', borderCollapse: 'collapse' }}
          >
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--sq-ink-soft)' }}>
                <th style={th}>Chỉ số</th>
                <th style={th}>
                  <KindPill kind="SIMULATED" />
                </th>
                <th style={th}>
                  <KindPill kind="ACTUAL" />
                </th>
                <th style={th}>Chênh lệch (thực tế − mô phỏng)</th>
              </tr>
            </thead>
            <tbody>
              {o.comparisonResult.rows.map((r) => (
                <tr key={r.metric} style={{ borderTop: '1px solid var(--sq-line)' }}>
                  <td style={td}>
                    {label(r.metric)}
                    {r.basis === 'PER_DAY' && (
                      <span className="sq-caption" style={{ color: 'var(--sq-ink-muted)' }}>
                        {' '}
                        /ngày
                      </span>
                    )}
                  </td>
                  <td style={{ ...td, background: 'var(--sq-lilac-wash)', fontStyle: 'italic' }}>
                    {fmt(r.metric, r.simulated)}
                  </td>
                  <td style={{ ...td, fontWeight: 650 }}>{fmt(r.metric, r.actual)}</td>
                  <td style={td}>
                    {r.delta >= 0 ? '+' : ''}
                    {fmt(r.metric, r.delta)}
                    {r.deltaPct !== null && (
                      <span style={{ color: 'var(--sq-ink-muted)' }}>
                        {' '}
                        ({r.deltaPct >= 0 ? '+' : ''}
                        {pct(r.deltaPct)})
                      </span>
                    )}
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

function CompareModal({
  versionIds,
  label,
  onClose,
}: {
  versionIds: string[];
  label: (k: MetricKey) => string;
  onClose: () => void;
}) {
  const { state } = useApiData<CompareResult>(
    () => api.post('/store/rescue-lab/compare', { versionIds }),
    undefined,
    '',
    [versionIds.join()],
  );
  return (
    <Modal title="So sánh kịch bản" onClose={onClose}>
      {state.status === 'loading' && <SkeletonList rows={2} height={60} />}
      {/* BR-B04-02: không tương thích => hiện lý do, không dựng bảng cạnh nhau gây hiểu nhầm. */}
      {state.status === 'error' && <Banner tone="error">{state.message}</Banner>}
      {state.status === 'success' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Banner tone="info">{state.data.notice}</Banner>
          <p className="sq-caption" style={{ margin: 0, color: 'var(--sq-ink-soft)' }}>
            Mục tiêu: {OBJECTIVE_LABEL[state.data.objective]}
            {state.data.primaryMetric
              ? ` · xếp theo ${label(state.data.primaryMetric.metric)} (${state.data.primaryMetric.direction === 'MAX' ? 'cao hơn tốt hơn' : 'thấp hơn tốt hơn'})`
              : ' · không chọn phương án thắng theo một tiêu chí'}
          </p>
          {state.data.rows.map((r) => (
            <div key={r.versionId} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="sq-body-medium">
                {r.scenarioTitle} · v{r.versionNo}{' '}
                {state.data.bestVersionId === r.versionId && (
                  <Pill bg="var(--sq-mint-wash)" fg="var(--sq-mint-deep)">
                    Tốt nhất theo mục tiêu (mô phỏng)
                  </Pill>
                )}
              </span>
              <span className="sq-caption" style={{ color: 'var(--sq-ink-soft)' }}>
                {assumptionText(r.assumptions)}
                {r.runMode === 'RESTRICTED' && ' · chế độ hạn chế'}
              </span>
              <MetricsPanel title="Kết quả mô phỏng" metrics={r.simulated} label={label} />
            </div>
          ))}
          <MetricsPanel
            title={`Thực tế kỳ nền chung (${state.data.baseline.periodDays} ngày)`}
            metrics={state.data.baseline}
            label={label}
          />
        </div>
      )}
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label
      className="sq-caption"
      style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}
    >
      {label}
      {children}
    </label>
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
      <div>{children}</div>
    </div>
  );
}

const chipStyle = (on: boolean): CSSProperties => ({
  padding: '4px 10px',
  borderRadius: 'var(--sq-radius-pill)',
  border: `1px solid ${on ? 'var(--sq-coral)' : 'var(--sq-line)'}`,
  background: on ? 'var(--sq-coral-wash)' : 'var(--sq-surface)',
  color: on ? 'var(--sq-coral-deep)' : 'var(--sq-ink-soft)',
  cursor: 'pointer',
  fontWeight: 600,
});

const th: CSSProperties = { padding: '8px 6px', fontWeight: 650 };
const td: CSSProperties = { padding: '8px 6px' };

const listCard: CSSProperties = {
  background: 'var(--sq-surface)',
  border: '1px solid var(--sq-line)',
  borderRadius: 'var(--sq-radius-lg)',
  overflow: 'hidden',
};

const rowButton: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap', // màn hẹp: nhãn trạng thái xuống dòng thay vì ép tiêu đề thành cột hẹp
  alignItems: 'center',
  gap: 16,
  width: '100%',
  padding: '14px 16px',
  border: 'none',
  borderBottom: '1px solid var(--sq-line)',
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
  minWidth: 0,
  width: '100%',
  boxSizing: 'border-box',
};
