import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, FindOptionsWhere, In, IsNull, Not, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import {
  RescueLabDataWarning,
  RescueLabScenarioEntity,
  RescueLabSimulationStatus,
} from '../../entities/rescue-lab/rescue-lab-scenario.entity';
import {
  RescueLabItemScope,
  RescueLabMetrics,
  RescueLabScenarioVersionEntity,
} from '../../entities/rescue-lab/rescue-lab-scenario-version.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { OfferEntity, OfferStatus } from '../../entities/catalog/offer.entity';
import { OrderEntity, OrderStatus } from '../../entities/orders/order.entity';
import { DailyActualEntity } from '../../entities/reconciliation/daily-actual.entity';
import {
  PriceProposalEntity,
  ProposalStatus,
} from '../../entities/reconciliation/price-proposal.entity';
import { SpecialEventEntity } from '../../entities/reconciliation/special-event.entity';
import { AuditLogService } from '../audit/audit-log.service';
import {
  ApplyRescueLabVersionDto,
  CreateRescueLabScenarioDto,
  RescueLabVersionParamsDto,
} from './dto/rescue-lab.dto';
import {
  assessDataQuality,
  checkCompatibility,
  compareSimulatedVsActual,
  computeMetrics,
  daysInRange,
  hashSnapshot,
  InputSnapshot,
  OBJECTIVE_PRIMARY_METRIC,
  OfferRow,
  rangeBounds,
  RESCUE_LAB_CONFIG,
  RESCUE_LAB_ENGINE_VERSION,
  RESCUE_LAB_METRIC_DEFINITIONS,
  RESCUE_LAB_SIMULATION_MODEL,
  simulate,
} from './rescue-lab.engine';

const S = RescueLabSimulationStatus;
const SOLD_STATUSES = [OrderStatus.PAID, OrderStatus.PICKED_UP];
const AUDIT_TARGET = 'RESCUE_LAB_VERSION';
/** RUNNING lâu hơn mức này coi như tiến trình đã chết giữa chừng - cho phép chạy lại (BR-B04-09). */
const STALE_RUNNING_MINUTES = 5;

/** Cột nặng (ảnh chụp dữ liệu nguồn) chỉ trả ở GET chi tiết một phiên bản. */
const LIGHT_VERSION_COLUMNS: (keyof RescueLabScenarioVersionEntity)[] = [
  'id',
  'scenarioId',
  'storeId',
  'versionNo',
  'dateRangeStart',
  'dateRangeEnd',
  'itemScope',
  'assumptions',
  'simulationStatus',
  'inputSnapshotHash',
  'engineVersion',
  'simulatedMetrics',
  'dataQualityWarnings',
  'failedReason',
  'runStartedAt',
  'runCompletedAt',
  'appliedAt',
  'appliedBy',
  'appliedScope',
  'observationWindowStart',
  'observationWindowEnd',
  'actualMetrics',
  'comparisonResult',
  'limitationNotes',
  'createdBy',
  'createdAt',
];

const todayVn = () => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
const pct = (r: number) => `${Math.round(r * 100)}%`;

@Injectable()
export class RescueLabService {
  private readonly logger = new Logger(RescueLabService.name);

  constructor(
    @InjectRepository(RescueLabScenarioEntity)
    private readonly scenarioRepo: Repository<RescueLabScenarioEntity>,
    @InjectRepository(RescueLabScenarioVersionEntity)
    private readonly versionRepo: Repository<RescueLabScenarioVersionEntity>,
    @InjectRepository(ItemEntity)
    private readonly itemRepo: Repository<ItemEntity>,
    @InjectRepository(OfferEntity)
    private readonly offerRepo: Repository<OfferEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(DailyActualEntity)
    private readonly dailyActualRepo: Repository<DailyActualEntity>,
    @InjectRepository(PriceProposalEntity)
    private readonly proposalRepo: Repository<PriceProposalEntity>,
    @InjectRepository(SpecialEventEntity)
    private readonly specialEventRepo: Repository<SpecialEventEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly dataSource: DataSource,
  ) {}

  getMetricDefinitions() {
    return {
      engineVersion: RESCUE_LAB_ENGINE_VERSION,
      metrics: RESCUE_LAB_METRIC_DEFINITIONS,
      simulationModel: RESCUE_LAB_SIMULATION_MODEL,
      objectivePrimaryMetric: OBJECTIVE_PRIMARY_METRIC,
      defaults: {
        priceElasticity: RESCUE_LAB_CONFIG.DEFAULT_PRICE_ELASTICITY,
        volumeChangePct: RESCUE_LAB_CONFIG.DEFAULT_VOLUME_CHANGE_PCT,
        recommendedMinDays: RESCUE_LAB_CONFIG.RECOMMENDED_MIN_DAYS,
        maxDays: RESCUE_LAB_CONFIG.MAX_DAYS,
      },
    };
  }

  // ───────────────────────── Kịch bản & phiên bản ─────────────────────────

  async listScenarios(storeId: string) {
    const scenarios = await this.scenarioRepo.find({
      where: { storeId },
      order: { updatedAt: 'DESC' },
    });
    if (!scenarios.length) return [];
    const latest = await this.versionRepo.find({
      select: LIGHT_VERSION_COLUMNS,
      where: scenarios.map((s) => ({ storeId, scenarioId: s.id, versionNo: s.currentVersion })),
    });
    const byScenario = new Map(latest.map((v) => [v.scenarioId, v]));
    return scenarios.map((s) => {
      const v = byScenario.get(s.id);
      return { ...s, latestVersion: v ? this.toVersionView(v) : null };
    });
  }

  async getScenario(storeId: string, scenarioId: string) {
    const scenario = await this.findScenario(storeId, scenarioId);
    const versions = await this.versionRepo.find({
      select: LIGHT_VERSION_COLUMNS,
      where: { storeId, scenarioId },
      order: { versionNo: 'DESC' },
    });
    return { ...scenario, versions: versions.map((v) => this.toVersionView(v)) };
  }

  /** Chi tiết một phiên bản kèm ảnh chụp dữ liệu nguồn đầy đủ (truy lại dữ liệu nguồn). */
  async getVersion(storeId: string, versionId: string) {
    const v = await this.findVersion(storeId, versionId);
    return { ...this.toVersionView(v), inputSnapshot: v.inputSnapshot };
  }

  async createScenario(storeId: string, userId: string, dto: CreateRescueLabScenarioDto) {
    const params = await this.validateParams(storeId, dto);
    const versionId = await this.dataSource.transaction(async (manager) => {
      const scenario = await manager.save(
        manager.create(RescueLabScenarioEntity, {
          storeId,
          title: dto.title.trim(),
          objective: dto.objective,
          currentVersion: 1,
          createdBy: userId,
        }),
      );
      const v = await manager.save(
        manager.create(RescueLabScenarioVersionEntity, {
          ...params,
          scenarioId: scenario.id,
          storeId,
          versionNo: 1,
          simulationStatus: S.DRAFT,
          createdBy: userId,
        }),
      );
      return v.id;
    });
    return this.runVersion(storeId, versionId);
  }

  /**
   * Ngoại lệ "kịch bản thay đổi": luôn INSERT phiên bản N+1, không bao giờ sửa phiên bản cũ.
   * Khóa dòng scenario để hai yêu cầu đồng thời không cùng lấy một version_no (UNIQUE là chốt chặn cuối).
   */
  async createVersion(
    storeId: string,
    scenarioId: string,
    userId: string,
    dto: RescueLabVersionParamsDto,
  ) {
    const params = await this.validateParams(storeId, dto);
    const versionId = await this.dataSource.transaction(async (manager) => {
      const scenario = await manager.findOne(RescueLabScenarioEntity, {
        where: { id: scenarioId, storeId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!scenario)
        throw new NotFoundException('Kịch bản không tồn tại hoặc không thuộc cửa hàng.');
      const versionNo = scenario.currentVersion + 1;
      const v = await manager.save(
        manager.create(RescueLabScenarioVersionEntity, {
          ...params,
          scenarioId,
          storeId,
          versionNo,
          simulationStatus: S.DRAFT,
          createdBy: userId,
        }),
      );
      await manager.update(
        RescueLabScenarioEntity,
        { id: scenarioId, storeId },
        { currentVersion: versionNo },
      );
      return v.id;
    });
    return this.runVersion(storeId, versionId);
  }

  /**
   * Nháp → Đang chạy → Hoàn tất/Thất bại. Chạy đồng bộ (truy vấn tổng hợp + công thức, mili giây) nhưng vẫn
   * mô hình trạng thái đầy đủ. Dữ liệu thiếu nghiêm trọng => quay lại Nháp kèm cảnh báo, không lưu kết quả.
   */
  async runVersion(storeId: string, versionId: string) {
    const claimed = await this.versionRepo
      .createQueryBuilder()
      .update(RescueLabScenarioVersionEntity)
      .set({ simulationStatus: S.RUNNING, runStartedAt: () => 'now()' })
      .where('id = :versionId AND store_id = :storeId', { versionId, storeId })
      .andWhere(
        `(simulation_status = :draft OR (simulation_status = :running AND run_started_at < now() - interval '${STALE_RUNNING_MINUTES} minutes'))`,
        { draft: S.DRAFT, running: S.RUNNING },
      )
      .execute();
    if (!claimed.affected) {
      const current = await this.findVersion(storeId, versionId);
      throw new ConflictException({
        code: 'RESCUE_LAB_NOT_RUNNABLE',
        message: `Phiên bản v${current.versionNo} đang ở trạng thái ${current.simulationStatus} - không chạy lại phiên bản đã có kết quả. Hãy tạo phiên bản mới.`,
      });
    }

    const v = await this.findVersion(storeId, versionId);
    const running = { id: versionId, simulationStatus: S.RUNNING };
    try {
      const snapshot = await this.captureSnapshot(
        storeId,
        v.dateRangeStart,
        v.dateRangeEnd,
        v.itemScope,
      );
      const baseline = computeMetrics(
        snapshot.offers,
        daysInRange(v.dateRangeStart, v.dateRangeEnd),
      );
      const warnings = assessDataQuality(baseline, snapshot.dailyActualDays, v.assumptions);

      if (warnings.some((w) => w.severity === 'BLOCKING')) {
        await this.versionRepo.update(running, {
          simulationStatus: S.DRAFT,
          runStartedAt: null,
          dataQualityWarnings: warnings,
        } as QueryDeepPartialEntity<RescueLabScenarioVersionEntity>);
      } else {
        const simulated = simulate(baseline, v.assumptions);
        await this.versionRepo.update(running, {
          simulationStatus: S.COMPLETED,
          inputSnapshot: snapshot as unknown as Record<string, unknown>,
          inputSnapshotHash: hashSnapshot(snapshot),
          engineVersion: RESCUE_LAB_ENGINE_VERSION,
          simulatedMetrics: {
            simulated: { kind: 'SIMULATED', ...simulated },
            baseline: { kind: 'ACTUAL_BASELINE', ...baseline },
          },
          dataQualityWarnings: warnings,
          runCompletedAt: new Date(),
        } as QueryDeepPartialEntity<RescueLabScenarioVersionEntity>);
      }
    } catch (err) {
      // Ngoại lệ "lỗi tính toán": Thất bại, simulated_metrics giữ NULL (CHECK DB chặn kết quả dở dang).
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.error(`[RESCUE_LAB] Run failed version=${versionId}: ${reason}`);
      await this.versionRepo.update(running, {
        simulationStatus: S.FAILED,
        failedReason: reason.slice(0, 1000),
        runCompletedAt: new Date(),
      });
    }
    return this.getVersion(storeId, versionId);
  }

  // ───────────────────────── Áp dụng thực tế & quan sát ─────────────────────────

  /**
   * BR-B04-04 / BR-B04-05: CHỈ GHI NHẬN rằng người có quyền đã thực hiện thay đổi ngoài thực tế dựa trên kịch bản này
   * (thời điểm, người, phạm vi, cửa sổ quan sát). Hàm này KHÔNG đổi giá, KHÔNG đổi tồn, KHÔNG tạo đề xuất giá -
   * thay đổi thật phải đi qua luồng có sẵn (đề xuất/duyệt giá ở decisions, sửa suất ở offers).
   * Đừng "nối" hàm này sang cập nhật offers: đó là vi phạm yêu cầu, không phải tính năng còn thiếu.
   */
  async applyVersion(
    storeId: string,
    versionId: string,
    actor: { userId: string; role: string },
    dto: ApplyRescueLabVersionDto,
  ) {
    const v = await this.findVersion(storeId, versionId);
    if (v.simulationStatus !== S.COMPLETED) {
      throw new BadRequestException('Chỉ ghi nhận áp dụng cho phiên bản đã chạy hoàn tất.');
    }
    if (v.appliedAt) {
      throw new ConflictException(
        'Phiên bản này đã được ghi nhận áp dụng - bản ghi áp dụng không được sửa.',
      );
    }
    const { observationWindowStart: start, observationWindowEnd: end } = dto;
    if (start <= v.dateRangeEnd) {
      throw new BadRequestException(
        'Cửa sổ quan sát phải bắt đầu sau kỳ dữ liệu nền của kịch bản.',
      );
    }
    if (end < start)
      throw new BadRequestException('Ngày kết thúc cửa sổ quan sát phải sau ngày bắt đầu.');
    if (daysInRange(start, end) > RESCUE_LAB_CONFIG.MAX_OBSERVATION_DAYS) {
      throw new BadRequestException(
        `Cửa sổ quan sát tối đa ${RESCUE_LAB_CONFIG.MAX_OBSERVATION_DAYS} ngày.`,
      );
    }

    const appliedScope = {
      itemScope: v.itemScope,
      note: dto.scopeNote.trim(),
      assumptions: v.assumptions,
    };
    const res = await this.versionRepo.update(
      { id: versionId, storeId, simulationStatus: S.COMPLETED, appliedAt: IsNull() },
      {
        appliedAt: new Date(),
        appliedBy: actor.userId,
        appliedScope,
        observationWindowStart: start,
        observationWindowEnd: end,
      } as QueryDeepPartialEntity<RescueLabScenarioVersionEntity>,
    );
    if (!res.affected)
      throw new ConflictException('Phiên bản vừa được người khác ghi nhận áp dụng.');

    await this.auditLogService.log({
      storeId,
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'RESCUE_LAB_VERSION_APPLIED',
      targetType: AUDIT_TARGET,
      targetId: versionId,
      newValue: { ...appliedScope, observationWindowStart: start, observationWindowEnd: end },
    });
    return this.getVersion(storeId, versionId);
  }

  /**
   * Bước 9-10: số thực tế trong cửa sổ quan sát, cùng định nghĩa chỉ số với mô phỏng (BR-B04-08).
   * Cửa sổ chưa kết thúc => trả số tạm tính, không lưu. Đã kết thúc => tính một lần, lưu và khóa (trigger DB).
   */
  async getObservation(storeId: string, versionId: string) {
    const v = await this.findVersion(storeId, versionId);
    if (
      !v.appliedAt ||
      !v.observationWindowStart ||
      !v.observationWindowEnd ||
      !v.simulatedMetrics
    ) {
      return {
        status: 'NOT_APPLIED',
        message:
          'Kịch bản chưa được ghi nhận áp dụng thực tế - đây chỉ là mô phỏng, không có số liệu thực tế để đối chiếu.',
      };
    }
    if (v.comparisonResult && v.actualMetrics) {
      return this.observationView(v, 'COMPLETED', v.actualMetrics);
    }

    const today = todayVn();
    const start = v.observationWindowStart;
    const end = v.observationWindowEnd;
    if (today < start) {
      return {
        ...this.observationView(v, 'NOT_STARTED', null),
        message: `Cửa sổ quan sát bắt đầu từ ${start}.`,
      };
    }
    if (today <= end) {
      const snap = await this.captureSnapshot(storeId, start, today, v.itemScope);
      const interim: RescueLabMetrics = {
        kind: 'ACTUAL',
        ...computeMetrics(snap.offers, daysInRange(start, today)),
      };
      return {
        ...this.observationView(v, 'OBSERVING', interim),
        message: `Đang quan sát (đến ${end}). Số liệu thực tế dưới đây là TẠM TÍNH đến hôm nay, chưa đối chiếu.`,
      };
    }

    const snap = await this.captureSnapshot(storeId, start, end, v.itemScope);
    const actual: RescueLabMetrics = {
      kind: 'ACTUAL',
      ...computeMetrics(snap.offers, daysInRange(start, end)),
    };
    const comparison = compareSimulatedVsActual(v.simulatedMetrics.simulated, actual);
    const confounders = await this.detectConfounders(
      storeId,
      v,
      snap.offers.map((o) => o.offerId),
    );
    const notes = this.buildLimitationNotes(v, actual, confounders);
    const comparisonResult = {
      ...comparison,
      confounders,
      actualSnapshotHash: hashSnapshot(snap),
      computedAt: new Date().toISOString(),
      engineVersion: RESCUE_LAB_ENGINE_VERSION,
    };
    await this.versionRepo.update({ id: versionId, storeId, comparisonResult: IsNull() }, {
      actualMetrics: actual,
      comparisonResult,
      limitationNotes: notes.join('\n'),
    } as QueryDeepPartialEntity<RescueLabScenarioVersionEntity>);
    const saved = await this.findVersion(storeId, versionId);
    return this.observationView(saved, 'COMPLETED', saved.actualMetrics);
  }

  // ───────────────────────── So sánh kịch bản ─────────────────────────

  /** Bước 7 + BR-B04-02: chỉ so sánh trực tiếp khi tương thích; nếu không thì từ chối kèm lý do. */
  async compareVersions(storeId: string, versionIds: string[]) {
    const versions = await this.versionRepo.find({
      select: LIGHT_VERSION_COLUMNS,
      where: { storeId, id: In(versionIds) },
    });
    if (versions.length !== versionIds.length) {
      throw new NotFoundException(
        'Không tìm thấy một số phiên bản hoặc phiên bản không thuộc cửa hàng.',
      );
    }
    const scenarios = await this.scenarioRepo.find({
      where: { storeId, id: In([...new Set(versions.map((v) => v.scenarioId))]) },
    });
    const scenarioById = new Map(scenarios.map((s) => [s.id, s]));

    const reasons = checkCompatibility(
      versions.map((v) => ({
        id: v.id,
        status: v.simulationStatus,
        objective: scenarioById.get(v.scenarioId)!.objective,
        dateRangeStart: v.dateRangeStart,
        dateRangeEnd: v.dateRangeEnd,
        itemScope: v.itemScope,
        engineVersion: v.engineVersion,
        inputSnapshotHash: v.inputSnapshotHash,
      })),
    );
    if (reasons.length) {
      throw new BadRequestException({
        code: 'RESCUE_LAB_INCOMPATIBLE',
        message: `Không so sánh trực tiếp được: ${reasons.join(' ')}`,
        reasons,
      });
    }

    const objective = scenarioById.get(versions[0].scenarioId)!.objective;
    const primary = OBJECTIVE_PRIMARY_METRIC[objective];
    const rows = versions.map((v) => ({
      versionId: v.id,
      scenarioId: v.scenarioId,
      scenarioTitle: scenarioById.get(v.scenarioId)!.title,
      versionNo: v.versionNo,
      assumptions: v.assumptions,
      runMode: this.runMode(v),
      simulated: v.simulatedMetrics!.simulated,
    }));
    const ranked = primary
      ? [...rows].sort((a, b) =>
          primary.direction === 'MAX'
            ? b.simulated[primary.metric] - a.simulated[primary.metric]
            : a.simulated[primary.metric] - b.simulated[primary.metric],
        )
      : rows;
    return {
      kind: 'SIMULATED',
      notice: 'Tất cả số liệu trong bảng là MÔ PHỎNG theo giả định, không phải kết quả thực tế.',
      objective,
      primaryMetric: primary,
      baseline: versions[0].simulatedMetrics!.baseline,
      dateRange: { start: versions[0].dateRangeStart, end: versions[0].dateRangeEnd },
      itemScope: versions[0].itemScope,
      rows: ranked,
      bestVersionId: primary ? ranked[0].versionId : null,
    };
  }

  // ───────────────────────── Nội bộ ─────────────────────────

  private async findScenario(storeId: string, id: string) {
    const s = await this.scenarioRepo.findOne({ where: { id, storeId } });
    if (!s) throw new NotFoundException('Kịch bản không tồn tại hoặc không thuộc cửa hàng.');
    return s;
  }

  private async findVersion(storeId: string, id: string) {
    const v = await this.versionRepo.findOne({ where: { id, storeId } });
    if (!v)
      throw new NotFoundException('Phiên bản kịch bản không tồn tại hoặc không thuộc cửa hàng.');
    return v;
  }

  private async validateParams(storeId: string, dto: RescueLabVersionParamsDto) {
    const start = dto.dateRangeStart.slice(0, 10);
    const end = dto.dateRangeEnd.slice(0, 10);
    if (end < start)
      throw new BadRequestException('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.');
    if (end >= todayVn()) {
      throw new BadRequestException('Kỳ dữ liệu nền phải là các ngày đã kết thúc (trước hôm nay).');
    }
    if (daysInRange(start, end) > RESCUE_LAB_CONFIG.MAX_DAYS) {
      throw new BadRequestException(`Kỳ dữ liệu tối đa ${RESCUE_LAB_CONFIG.MAX_DAYS} ngày.`);
    }
    const itemIds = [...new Set(dto.itemIds ?? [])];
    if (itemIds.length) {
      const owned = await this.itemRepo.count({ where: { storeId, id: In(itemIds) } });
      if (owned !== itemIds.length) {
        throw new BadRequestException('Có món không tồn tại hoặc không thuộc cửa hàng.');
      }
    }
    const categories = [...new Set((dto.categories ?? []).map((c) => c.trim()).filter(Boolean))];
    const itemScope: RescueLabItemScope = {};
    if (itemIds.length) itemScope.itemIds = itemIds.sort();
    if (categories.length) itemScope.categories = categories.sort();
    return {
      dateRangeStart: start,
      dateRangeEnd: end,
      itemScope,
      assumptions: {
        discountRatio: dto.discountRatio,
        priceElasticity: dto.priceElasticity ?? RESCUE_LAB_CONFIG.DEFAULT_PRICE_ELASTICITY,
        volumeChangePct: dto.volumeChangePct ?? RESCUE_LAB_CONFIG.DEFAULT_VOLUME_CHANGE_PCT,
        ...(dto.note?.trim() ? { note: dto.note.trim() } : {}),
      },
    };
  }

  /**
   * Lấy dữ liệu nguồn theo định nghĩa RESCUE_LAB_METRIC_DEFINITIONS, luôn lọc theo store_id (BR-B04-07).
   * shortcut: lưu từng suất trong ảnh chụp (~150B/suất, tối đa 90 ngày) - nếu cửa hàng có hàng chục nghìn suất/kỳ thì chuyển sang lưu theo ngày/món.
   */
  private async captureSnapshot(
    storeId: string,
    start: string,
    end: string,
    itemScope: RescueLabItemScope,
  ): Promise<InputSnapshot> {
    const scoped = !!(itemScope.itemIds?.length || itemScope.categories?.length);
    let resolvedItemIds: string[] | null = null;
    if (scoped) {
      const where: FindOptionsWhere<ItemEntity>[] = [];
      if (itemScope.itemIds?.length) where.push({ storeId, id: In(itemScope.itemIds) });
      if (itemScope.categories?.length) where.push({ storeId, category: In(itemScope.categories) });
      resolvedItemIds = (await this.itemRepo.find({ select: ['id'], where }))
        .map((i) => i.id)
        .sort();
    }
    const base: InputSnapshot = {
      capturedAt: new Date().toISOString(),
      sources: ['offers', 'orders', 'daily_actuals'],
      dateRange: { start, end },
      itemScope,
      resolvedItemIds,
      dailyActualDays: 0,
      offers: [],
    };
    if (resolvedItemIds && !resolvedItemIds.length) return base;

    const { from, to } = rangeBounds(start, end);
    const offerQb = this.offerRepo
      .createQueryBuilder('o')
      .where('o.storeId = :storeId', { storeId })
      .andWhere('o.pickupStart >= :from AND o.pickupStart < :to', { from, to })
      .andWhere('o.status NOT IN (:...excluded)', {
        excluded: [OfferStatus.DRAFT, OfferStatus.CANCELLED],
      });
    if (resolvedItemIds)
      offerQb.andWhere('o.itemId IN (:...itemIds)', { itemIds: resolvedItemIds });
    const offers = await offerQb.getMany();

    const daQb = this.dailyActualRepo
      .createQueryBuilder('d')
      .select('COUNT(DISTINCT d.date)', 'n')
      .where('d.storeId = :storeId', { storeId })
      .andWhere('d.date BETWEEN :start AND :end', { start, end });
    if (resolvedItemIds) daQb.andWhere('d.itemId IN (:...itemIds)', { itemIds: resolvedItemIds });
    base.dailyActualDays = Number((await daQb.getRawOne())?.n ?? 0);
    if (!offers.length) return base;

    const sales: { offerId: string; units: string; revenue: string }[] = await this.orderRepo
      .createQueryBuilder('r')
      .select('r.offerId', 'offerId')
      .addSelect('COALESCE(SUM(r.quantity), 0)', 'units')
      .addSelect('COALESCE(SUM(r.totalAmount), 0)', 'revenue')
      .where('r.storeId = :storeId', { storeId })
      .andWhere('r.offerId IN (:...ids)', { ids: offers.map((o) => o.id) })
      .andWhere('r.status IN (:...sold)', { sold: SOLD_STATUSES })
      .groupBy('r.offerId')
      .getRawMany();
    const salesByOffer = new Map(sales.map((s) => [s.offerId, s]));

    base.offers = offers
      .map<OfferRow>((o) => ({
        offerId: o.id,
        itemId: o.itemId,
        originalPrice: o.originalPrice,
        totalQuantity: o.totalQuantity,
        pickupStart: new Date(o.pickupStart).toISOString(),
        soldUnits: Number(salesByOffer.get(o.id)?.units ?? 0),
        revenue: Number(salesByOffer.get(o.id)?.revenue ?? 0),
      }))
      .sort((a, b) => a.offerId.localeCompare(b.offerId));
    return base;
  }

  /** Ngoại lệ "nhiều yếu tố cùng thay đổi": phát hiện các thay đổi khác có trong dữ liệu hệ thống. */
  private async detectConfounders(
    storeId: string,
    v: RescueLabScenarioVersionEntity,
    offerIds: string[],
  ) {
    const start = v.observationWindowStart!;
    const end = v.observationWindowEnd!;
    const [priceChanges, promoOrders, events, otherApplied] = await Promise.all([
      offerIds.length
        ? this.proposalRepo.count({
            where: {
              offerId: In(offerIds),
              status: In([ProposalStatus.APPROVED, ProposalStatus.AUTO_APPLIED]),
            },
          })
        : 0,
      offerIds.length
        ? this.orderRepo.count({
            where: {
              storeId,
              offerId: In(offerIds),
              status: In(SOLD_STATUSES),
              promotionId: Not(IsNull()),
            },
          })
        : 0,
      this.specialEventRepo.count({ where: { storeId, date: Between(start, end) } }),
      this.versionRepo
        .createQueryBuilder('x')
        .where('x.storeId = :storeId AND x.id <> :id', { storeId, id: v.id })
        .andWhere('x.appliedAt IS NOT NULL')
        .andWhere('x.observationWindowStart <= :end AND x.observationWindowEnd >= :start', {
          start,
          end,
        })
        .getCount(),
    ]);
    return [
      {
        code: 'PRICE_PROPOSALS_APPLIED',
        count: priceChanges,
        label: 'đề xuất giá được duyệt/tự áp dụng trên các suất trong cửa sổ',
      },
      { code: 'PROMOTION_ORDERS', count: promoOrders, label: 'đơn dùng khuyến mãi' },
      {
        code: 'SPECIAL_EVENTS',
        count: events,
        label: 'sự kiện đặc biệt (lễ, thời tiết...) đã khai báo',
      },
      {
        code: 'OTHER_APPLIED_SCENARIOS',
        count: otherApplied,
        label: 'kịch bản Rescue Lab khác được áp dụng trùng thời gian',
      },
    ].filter((c) => c.count > 0);
  }

  /** Bước 10 + BR-B04-06: giới hạn diễn giải luôn đi kèm báo cáo, không kết luận nhân quả. */
  private buildLimitationNotes(
    v: RescueLabScenarioVersionEntity,
    actual: RescueLabMetrics,
    confounders: { count: number; label: string }[],
  ): string[] {
    const a = v.assumptions;
    const sim = v.simulatedMetrics!.simulated;
    const notes = [
      `Số MÔ PHỎNG tính từ giả định (giảm ${pct(a.discountRatio)}, độ co giãn ${a.priceElasticity}, thay đổi số suất ${a.volumeChangePct}%) áp lên dữ liệu thực tế ${v.dateRangeStart} → ${v.dateRangeEnd}; số THỰC TẾ lấy từ suất bán và đơn hàng trong cửa sổ ${v.observationWindowStart} → ${v.observationWindowEnd}. Chênh lệch giữa hai bên không chứng minh kịch bản là nguyên nhân.`,
    ];
    notes.push(
      confounders.length
        ? `Trong cửa sổ quan sát có yếu tố khác cùng thay đổi: ${confounders.map((c) => `${c.count} ${c.label}`).join('; ')}. Không thể quy chênh lệch cho riêng kịch bản này.`
        : 'Không phát hiện thay đổi giá, khuyến mãi, sự kiện hay kịch bản khác trong dữ liệu hệ thống; các yếu tố ngoài hệ thống (thời tiết, mùa vụ, đối thủ) vẫn chưa được kiểm soát.',
    );
    if (sim.periodDays !== actual.periodDays) {
      notes.push(
        `Kỳ mô phỏng ${sim.periodDays} ngày và cửa sổ quan sát ${actual.periodDays} ngày khác độ dài - chỉ số khối lượng được so theo trung bình/ngày.`,
      );
    }
    if (actual.offeredUnits === 0) {
      notes.push(
        'Không có suất nào trong phạm vi trong cửa sổ quan sát - không có số liệu thực tế để đối chiếu.',
      );
    } else if (
      actual.soldUnits > 0 &&
      Math.abs(actual.realizedDiscountRatio - a.discountRatio) >
        RESCUE_LAB_CONFIG.APPLIED_DISCOUNT_TOLERANCE
    ) {
      notes.push(
        `Mức giảm giá thực tế (${pct(actual.realizedDiscountRatio)}) khác giả định (${pct(a.discountRatio)}) - thay đổi ngoài thực tế không khớp kịch bản.`,
      );
    }
    const restricted = v.dataQualityWarnings.filter((w) => w.severity === 'RESTRICTED');
    if (restricted.length) {
      notes.push(
        `Bản mô phỏng chạy ở chế độ hạn chế: ${restricted.map((w) => w.message).join(' ')}`,
      );
    }
    return notes;
  }

  private runMode(v: RescueLabScenarioVersionEntity) {
    if (v.simulationStatus !== S.COMPLETED) return null;
    return v.dataQualityWarnings.some((w) => w.severity === 'RESTRICTED') ? 'RESTRICTED' : 'FULL';
  }

  private observationView(
    v: RescueLabScenarioVersionEntity,
    status: string,
    actual: RescueLabMetrics | null,
  ) {
    return {
      status,
      versionId: v.id,
      observationWindow: { start: v.observationWindowStart, end: v.observationWindowEnd },
      simulated: v.simulatedMetrics?.simulated ?? null,
      actual,
      comparisonResult: v.comparisonResult,
      limitationNotes: v.limitationNotes ? v.limitationNotes.split('\n') : [],
    };
  }

  private toVersionView(v: RescueLabScenarioVersionEntity) {
    const warnings: RescueLabDataWarning[] = v.dataQualityWarnings ?? [];
    return {
      id: v.id,
      scenarioId: v.scenarioId,
      versionNo: v.versionNo,
      dateRange: { start: v.dateRangeStart, end: v.dateRangeEnd },
      itemScope: v.itemScope,
      assumptions: v.assumptions,
      simulationStatus: v.simulationStatus,
      runMode: this.runMode(v),
      blocked: v.simulationStatus === S.DRAFT && warnings.some((w) => w.severity === 'BLOCKING'),
      dataQualityWarnings: warnings,
      failedReason: v.failedReason,
      engineVersion: v.engineVersion,
      inputSnapshotHash: v.inputSnapshotHash,
      simulatedMetrics: v.simulatedMetrics,
      runStartedAt: v.runStartedAt,
      runCompletedAt: v.runCompletedAt,
      applied: v.appliedAt
        ? { appliedAt: v.appliedAt, appliedBy: v.appliedBy, appliedScope: v.appliedScope }
        : null,
      observationWindow: v.observationWindowStart
        ? { start: v.observationWindowStart, end: v.observationWindowEnd }
        : null,
      actualMetrics: v.actualMetrics,
      comparisonResult: v.comparisonResult,
      limitationNotes: v.limitationNotes ? v.limitationNotes.split('\n') : [],
      createdBy: v.createdBy,
      createdAt: v.createdAt,
    };
  }
}
