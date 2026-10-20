package com.surplusiq.merchant.data

// --- Rescue Lab (rescue-lab.controller.ts, store/rescue-lab/*) ---
// Chỉ mô phỏng và ghi nhận; không màn nào ở đây đổi giá hay tồn kho thật.

/** objective: REDUCE_SURPLUS | INCREASE_RECOVERY_REVENUE | INCREASE_SELLTHROUGH | COMPARE_STRATEGIES. */
data class LabMetrics(
    val kind: String? = null,
    val periodDays: Int = 0,
    val offeredUnits: Double = 0.0,
    val soldUnits: Double = 0.0,
    val surplusUnits: Double = 0.0,
    val sellThroughRate: Double = 0.0,
    val recoveryRevenue: Double = 0.0,
    val avgRealizedPrice: Double = 0.0,
    val avgOriginalPrice: Double = 0.0,
    val realizedDiscountRatio: Double = 0.0
)

data class LabWarning(val code: String, val severity: String, val message: String)

data class LabAssumptions(val discountRatio: Double, val priceElasticity: Double, val volumeChangePct: Double, val note: String? = null)

data class LabDateRange(val start: String, val end: String)

data class LabItemScope(val itemIds: List<String>? = null, val categories: List<String>? = null)

data class LabSimulated(val simulated: LabMetrics, val baseline: LabMetrics)

data class LabApplied(val appliedAt: String, val appliedScope: LabAppliedScope? = null)

data class LabAppliedScope(val note: String? = null)

/** simulationStatus: DRAFT | RUNNING | COMPLETED | FAILED. runMode: FULL | RESTRICTED. */
data class LabVersion(
    val id: String,
    val scenarioId: String,
    val versionNo: Int,
    val dateRange: LabDateRange,
    val itemScope: LabItemScope,
    val assumptions: LabAssumptions,
    val simulationStatus: String,
    val runMode: String? = null,
    val blocked: Boolean = false,
    val dataQualityWarnings: List<LabWarning> = emptyList(),
    val failedReason: String? = null,
    val simulatedMetrics: LabSimulated? = null,
    val runCompletedAt: String? = null,
    val applied: LabApplied? = null,
    val observationWindow: LabDateRange? = null
)

data class LabScenario(
    val id: String,
    val title: String,
    val objective: String,
    val currentVersion: Int = 1,
    val latestVersion: LabVersion? = null,
    val versions: List<LabVersion>? = null
)

data class LabVersionParams(
    val dateRangeStart: String,
    val dateRangeEnd: String,
    val categories: List<String>,
    val discountRatio: Double,
    val priceElasticity: Double,
    val volumeChangePct: Double,
    val note: String? = null
)

data class LabCreateScenario(
    val title: String,
    val objective: String,
    val dateRangeStart: String,
    val dateRangeEnd: String,
    val categories: List<String>,
    val discountRatio: Double,
    val priceElasticity: Double,
    val volumeChangePct: Double,
    val note: String? = null
)

data class LabApplyRequest(val observationWindowStart: String, val observationWindowEnd: String, val scopeNote: String)

data class LabComparisonRow(val metric: String, val label: String, val simulated: Double, val actual: Double, val delta: Double, val deltaPct: Double? = null)

data class LabConfounder(val code: String, val count: Int, val label: String)

data class LabComparisonResult(val rows: List<LabComparisonRow> = emptyList(), val confounders: List<LabConfounder> = emptyList())

/** status: NOT_APPLIED | NOT_STARTED | OBSERVING | COMPLETED. */
data class LabObservation(
    val status: String,
    val message: String? = null,
    val simulated: LabMetrics? = null,
    val actual: LabMetrics? = null,
    val comparisonResult: LabComparisonResult? = null,
    val limitationNotes: List<String> = emptyList()
)

data class LabCompareRequest(val versionIds: List<String>)

data class LabPrimaryMetric(val metric: String, val direction: String)

data class LabCompareRow(
    val versionId: String,
    val scenarioTitle: String,
    val versionNo: Int,
    val assumptions: LabAssumptions,
    val runMode: String? = null,
    val simulated: LabMetrics
)

data class LabCompareResult(
    val notice: String,
    val objective: String,
    val primaryMetric: LabPrimaryMetric? = null,
    val rows: List<LabCompareRow>,
    val bestVersionId: String? = null
)
