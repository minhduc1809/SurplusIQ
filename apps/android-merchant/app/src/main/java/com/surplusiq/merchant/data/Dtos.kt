package com.surplusiq.merchant.data

import com.google.gson.annotations.SerializedName

data class LoginRequest(
    val email: String,
    val password: String,
    val deviceId: String
)

data class StoreUserDto(
    val id: String,
    val role: String,
    val email: String?,
    val phone: String?,
    val storeId: String?,
    val permission: String?
)

data class LoginResponse(
    val accessToken: String,
    val refreshToken: String,
    val user: StoreUserDto
)

data class DailyOverviewOrders(
    val total: Int,
    val paid: Int,
    val completed: Int,
    val cancelled: Int,
    val noShow: Int
)

data class DailyOverviewDto(
    val date: String,
    val isPausedToday: Boolean,
    val orders: DailyOverviewOrders,
    val grossRevenue: Long,
    val rescuedItemsCount: Int,
    val foodSavedKg: Double,
    val pendingComplaints: Int,
    val activeOffers: Int
)

/** GET store/reports/overview - chỉ lấy doanh thu; OWNER/MANAGER mới gọi được. */
/** GET store/reports/finance: thống kê tài chính theo khoảng ngày (chủ cửa hàng). */
data class FinanceSummaryDto(val summary: FinanceTotals, val daily: List<FinanceDay> = emptyList(), val explanation: String? = null)
data class FinanceTotals(
    val grossSales: Long,
    val commissionRate: Double,
    val commissionAmount: Long,
    val refundsDeduction: Long,
    val netPayout: Long,
    val pendingPaidAmount: Long,
    val soldOrders: Int,
    val averageOrderValue: Long
)
data class FinanceDay(val date: String, val grossSales: Long, val orders: Int)

data class ReportsOverviewDto(val summary: ReportsSummary, val recovery: ReportsRecovery, val waste: ReportsWaste)
data class ReportsSummary(
    val totalOrders: Int,
    val completedOrders: Int,
    val cancelledOrders: Int,
    val noShowOrders: Int,
    val grossRevenue: Long,
    val foodSavedKg: Double,
    val co2SavedKg: Double,
    val ratingAvg: Double,
    val ratingCount: Int,
    val complaintsCount: Int = 0
)
data class ReportsRecovery(
    val recoveryRatePercent: Double,
    val recoveredItemsCount: Int = 0,
    val recoveredWeightKg: Double = 0.0
)
data class ReportsWaste(
    val wastedWeightKg: Double,
    val wastedEstimatedCost: Long,
    val wastedOrdersCount: Int = 0,
    val cancelledCount: Int = 0,
    val noShowCount: Int = 0
)

// --- Khách của cửa hàng (store-operations.controller.ts, marketing.controller.ts) ---

/** GET store/customers. Tên chỉ còn chữ cái đầu; customerId dùng làm khóa ghi chú, không hiển thị. */
data class StoreCustomerDto(
    val customerId: String,
    val customerName: String,
    val totalOrders: Int,
    val completedOrders: Int,
    val noShowCount: Int = 0,
    val totalSpend: Long,
    val lastOrderDate: String,
    val internalNote: String? = null
)

data class CustomerNoteRequest(val note: String)

data class SegmentMetrics(val totalOrders: Int = 0, val daysSinceLastOrder: Int = 0, val noShowRatio: Double = 0.0)

/** primarySegment: NEW | LOYAL | AT_RISK | HIGH_NOSHOW | REGULAR. */
data class SegmentedCustomerDto(val anonymizedId: String, val primarySegment: String, val metrics: SegmentMetrics = SegmentMetrics())

/** Chỉ phân nhóm khi cửa hàng có từ 20 khách trở lên (isEligible). */
data class SegmentsResponse(
    val isEligible: Boolean,
    val totalCustomers: Int,
    val reason: String? = null,
    val summary: Map<String, Int> = emptyMap(),
    val customers: List<SegmentedCustomerDto> = emptyList()
)

data class NoShowCustomerDto(
    val anonymizedCustomerId: String,
    val totalOrders: Int,
    val noShowCount: Int,
    val noShowRatePercent: Double,
    val estimatedLossAmount: Long = 0,
    val recommendedAction: String? = null
)

data class FrequentNoShowResponse(val customers: List<NoShowCustomerDto> = emptyList())

/** PUT store/marketing/segment-config (chỉ chủ). */
data class SegmentConfigDto(
    val loyalMinOrders: Int,
    val loyalMaxDaysSinceLastOrder: Int,
    val atRiskMinOrders: Int,
    val atRiskDaysThreshold: Int,
    val highNoShowRatioPercent: Int
)

data class CustomerOrderRow(val code: String, val status: String, val quantity: Int, val totalAmount: Long, val createdAt: String, val itemName: String? = null)

data class CustomerTopItem(val name: String, val quantity: Int)

data class CustomerComplaintRow(val category: String, val status: String, val refundAmount: Long? = null, val createdAt: String)

data class CustomerReviewRow(val rating: Int, val comment: String? = null, val createdAt: String)

data class CustomerDetailDto(
    val customerName: String,
    val totalOrders: Int,
    val completedOrders: Int,
    val noShowCount: Int,
    val totalSpend: Long,
    val internalNote: String? = null,
    val recentOrders: List<CustomerOrderRow> = emptyList(),
    val topItems: List<CustomerTopItem> = emptyList(),
    val complaints: List<CustomerComplaintRow> = emptyList(),
    val reviews: List<CustomerReviewRow> = emptyList()
)

data class FavoritesCountResponse(val favoriteCount: Int, val newPerWeek: List<Int> = emptyList())

// --- Ưu đãi và chiến dịch (marketing.controller.ts, store/marketing/*) ---

data class PromotionAnalytics(
    val usedOrdersCount: Int = 0,
    val grossRevenueGenerated: Long = 0,
    val totalDiscountGiven: Long = 0,
    val uniqueCustomersCount: Int = 0
)

/** PromotionEntity. type: PERCENT | FIXED. target: ALL | FAVORITES | LOYAL | AT_RISK. status: DRAFT | ACTIVE | PAUSED | ENDED. */
data class PromotionDto(
    val id: String,
    val name: String,
    val type: String,
    val value: Long,
    val target: String,
    val maxUses: Int,
    val usedCount: Int = 0,
    val startAt: String,
    val endAt: String,
    val minOrderAmount: Long = 0,
    val status: String,
    val analytics: PromotionAnalytics? = null
)

data class CreatePromotionRequest(
    val name: String,
    val type: String,
    val value: Long,
    val target: String,
    val maxUses: Int,
    val startAt: String,
    val endAt: String,
    val minOrderAmount: Long? = null
)

/** Cùng dạng CreatePromotionRequest; PUT chỉ gửi trường đổi. */
typealias UpdatePromotionRequest = CreatePromotionRequest

data class UpdatePromotionStatusRequest(val status: String)

/** CampaignEntity. status: DRAFT | SCHEDULED | SENT | CANCELLED. */
data class CampaignDto(
    val id: String,
    val title: String,
    val content: String,
    val target: String,
    val scheduledAt: String,
    val status: String
)

data class CreateCampaignRequest(val title: String, val content: String, val target: String, val scheduledAt: String)

data class UpdateCampaignRequest(
    val title: String? = null,
    val content: String? = null,
    val scheduledAt: String? = null,
    val status: String? = null
)

/** Số đo từ campaign_deliveries: người nhận, số người đã mở thông báo, đơn của chính những người nhận trong 24 giờ. */
data class CampaignMetrics(
    val recipientsCount: Int = 0,
    val openedCount: Int = 0,
    val openRatePercent: Int = 0,
    val ordersWithin24h: Int = 0,
    val revenueGeneratedVnd: Long = 0
)

data class CampaignAnalyticsDto(val metrics: CampaignMetrics)

// --- Báo cáo (store-operations.controller.ts reports/*) ---

/** GET store/reports/items. rescueRate = % suất bán được trên tổng bán + hủy/quá hạn. */
data class ItemReportRow(
    val itemId: String,
    val itemName: String,
    val category: String,
    val totalOrders: Int,
    val totalQuantitySold: Int,
    val totalRevenue: Long,
    val cancelledQuantity: Int,
    val rescueRate: Int
)

data class ItemReportsResponse(val items: List<ItemReportRow>)

data class HourBucket(val hour: Int, val label: String, val orderCount: Int, val pickedUpCount: Int, val totalQuantity: Int)

data class HourlyDistributionResponse(val distribution: List<HourBucket>)

data class PricingEfficacyDto(
    val totalProposals: Int,
    val acceptedCount: Int,
    val rejectedCount: Int,
    val adoptionRate: Int,
    val estimatedAdditionalRevenue: Long,
    val recommendation: String
)

data class ComparePeriodsRequest(val periodAFrom: String, val periodATo: String, val periodBFrom: String, val periodBTo: String)

data class PeriodMetrics(val orderCount: Int, val completedCount: Int, val totalRevenue: Long, val totalQuantity: Int, val uniqueCustomers: Int)

data class PeriodBlock(val metrics: PeriodMetrics)

data class GrowthPercent(val orderCount: Int, val revenue: Int, val quantity: Int, val uniqueCustomers: Int)

data class ComparePeriodsResponse(val periodA: PeriodBlock, val periodB: PeriodBlock, val growthPercent: GrowthPercent)

data class ImpactMetrics(val totalRescuedMeals: Int, val estimatedCo2SavedKg: Double, val estimatedFoodSavedKg: Double)

data class PublicImpactLinkResponse(val storeName: String, val publicUrl: String, val metrics: ImpactMetrics, val shareText: String)

// --- Đối soát và sao kê tuần (stores.service.ts getReconciliation / getStatements) ---

data class ReconSummary(
    val pickedUpCount: Int = 0,
    val pickedUpAmount: Long = 0,
    val noShowCount: Int = 0,
    val noShowAmount: Long = 0,
    val refundedCount: Int = 0,
    val cancelledCount: Int = 0
)

/** Sao kê kỳ hiện tại tính trực tiếp (chưa chốt). */
data class ReconCycle(
    val cycleId: String? = null,
    val periodStart: String? = null,
    val periodEnd: String? = null,
    val grossSales: Long = 0,
    val commissionRate: Double = 0.1,
    val commissionAmount: Long = 0,
    val refundsDeduction: Long = 0,
    val subscriptionFee: Long = 0,
    val netPayout: Long = 0,
    val explanation: String? = null,
    val orderSummary: ReconSummary? = null
)

/** WeeklyStatementEntity. status: DRAFT | LOCKED. */
data class StatementDto(
    val id: String,
    val weekStart: String,
    val weekEnd: String,
    val gross: Long,
    val commission: Long,
    val refunds: Long,
    val subscriptionFee: Long = 0,
    val adjustments: Long = 0,
    val netPayable: Long,
    val status: String,
    val checksum: String? = null
)

data class ReconciliationResponse(val currentCycle: ReconCycle, val history: List<StatementDto>)

data class StatementLineDto(val id: String, val orderId: String?, val type: String, val amount: Long, val commission: Long, val createdAt: String)

data class StatementDetailResponse(val statement: StatementDto, val lines: List<StatementLineDto>)

data class StatementCsvResponse(val filename: String, val content: String)

/** ItemEntity (catalog). status: ACTIVE | ARCHIVED. stats chỉ có ở GET store/items/:id. */
data class ItemDto(
    val id: String,
    val name: String,
    val category: String,
    val originalPrice: Long,
    val status: String,
    val imageUrl: String?,
    val costPrice: Long? = null,
    val standardShelfLifeHours: Int? = null,
    val ingredients: String? = null,
    val allergens: List<String>? = null,
    val weightGrams: Int? = null,
    val description: String? = null,
    val createdAt: String? = null,
    val stats: ItemStatsDto? = null,
    val preparedAt: String? = null,
    val expiryAt: String? = null,
    val storageInstructions: String? = null,
    val informationSource: String? = null,
    val trustpassVersion: Int = 0,
    val reviewStatus: String? = null
)

data class ItemStatsDto(val totalOffersCreated: Int, val totalSold: Int)

data class ItemsResponse(
    val data: List<ItemDto>,
    val total: Int,
    val page: Int = 1,
    val totalPages: Int = 1
)

/** CreateItemDto / UpdateItemDto (PATCH dùng chung, null bị Gson bỏ qua = không đổi). */
data class ItemRequest(
    val name: String? = null,
    val category: String? = null,
    val originalPrice: Long? = null,
    val standardShelfLifeHours: Int? = null,
    val costPrice: Long? = null,
    val weightGrams: Int? = null,
    val ingredients: String? = null,
    val allergens: List<String>? = null,
    val imageUrl: String? = null,
    val description: String? = null
)

data class ImportCsvRequest(val items: List<ItemRequest>)

/** index = vị trí 1-based trong mảng items đã gửi. */
data class CsvImportSummaryDto(
    val total: Int,
    val imported: Int,
    val failed: Int,
    val errors: List<CsvImportErrorDto>
)

data class CsvImportErrorDto(val index: Int, val name: String?, val error: String)

/** type: MISSING_WEIGHT | MISSING_COST | MISSING_ALLERGENS; severity: MEDIUM | LOW */
data class DataQualityWarningDto(
    val itemId: String,
    val itemName: String,
    val type: String,
    val severity: String,
    val suggestion: String
)

data class DataQualityResponse(
    val totalItems: Int,
    val fullyConfigured: Int,
    val completenessScore: Int,
    val warnings: List<DataQualityWarningDto>
)

data class BatchUpdateItemsRequest(
    val itemIds: List<String>,
    val category: String? = null,
    val standardShelfLifeHours: Int? = null,
    val estimatedWeightGrams: Int? = null
)

data class BatchUpdateItemsResponse(val successCount: Int, val failedCount: Int)

/** OfferEntity. status: DRAFT | OPEN | SOLD_OUT | CLOSED | CANCELLED; kind: REGULAR | SURPRISE_BAG. item chỉ có ở GET store/offers/:id. */
data class OfferDto(
    val id: String,
    val totalQuantity: Int,
    val remainingQuantity: Int,
    val soldQuantity: Int,
    val originalPrice: Long,
    val currentPrice: Long,
    val pickupStart: String,
    val pickupEnd: String,
    val status: String,
    val itemId: String? = null,
    val kind: String? = null,
    val floorPrice: Long? = null,
    val priceChangeCount: Int? = null,
    val item: ItemDto? = null
)

data class OffersResponse(
    val data: List<OfferDto>,
    val total: Int,
    val page: Int = 1,
    val totalPages: Int = 1
)

data class CreateOfferRequest(
    val itemId: String,
    val totalQuantity: Int,
    val originalPrice: Long,
    val currentPrice: Long,
    val pickupStart: String,
    val pickupEnd: String,
    val status: String,
    val note: String? = null
)

/** Chỉ gửi field đã đổi - đổi giá tính vào giới hạn 3 lần/suất. */
data class UpdateOfferRequest(
    val totalQuantity: Int? = null,
    val currentPrice: Long? = null,
    val pickupStart: String? = null,
    val pickupEnd: String? = null,
    val status: String? = null,
    val note: String? = null
)

data class AdjustStockRequest(val deltaQuantity: Int, val reason: String, val note: String? = null)

/** Dùng cho close và cancel. */
data class OfferReasonRequest(val reason: String, val note: String? = null)

data class CloneYesterdayRequest(val sourceOfferIds: List<String>, val targetDate: String)

data class SkippedOfferDto(val offerId: String, val reason: String)

data class CloneSummaryDto(
    val clonedCount: Int,
    val skippedCount: Int,
    val clonedOffers: List<OfferDto>,
    val skippedOffers: List<SkippedOfferDto>
)

/** OfferEventEntity. type: CREATED | OPENED | EDITED | STOCK_ADJUSTED | PRICE_CHANGED | CLOSED | CANCELLED | AUTO_CLOSED */
data class OfferEventDto(
    val id: String,
    val actorId: String?,
    val type: String,
    val payload: com.google.gson.JsonObject?,
    val reason: String?,
    val createdAt: String
)

/**
 * Một dòng của GET store/forecast (decisions.service getForecasts). confidence: LOW | MEDIUM | HIGH;
 * method: DOW_AVG | YESTERDAY_FALLBACK; components (jsonb): historyDaysCount, baseDowAverage, eventFactor, mape7Days, dowSampleCount.
 * item chỉ có {id, name, category, originalPrice}. Warning từ backend có thể chứa emoji - lọc trước khi hiển thị.
 */
data class ForecastDto(
    val itemId: String,
    val recommended: Int,
    val chosenQuantity: Int?,
    val confidence: String?,
    val id: String = "",
    val targetDate: String? = null,
    val low: Int = 0,
    val high: Int = 0,
    val method: String? = null,
    val components: Map<String, Any?>? = null,
    val overrideReason: String? = null,
    val createdAt: String? = null,
    val explanation: String? = null,
    val warning: String? = null,
    val fallbackSuggestions: List<ForecastFallbackDto>? = null,
    val item: ItemDto? = null
)

data class ForecastFallbackDto(val id: String, val title: String, val description: String, val recommendedQuantity: Int)

data class OverrideForecastRequest(val chosenQuantity: Int, val overrideReason: String?)

/** LogDailyActualDto - ghi đè nếu đã có bản ghi cùng món + ngày. stockoutAt: ISO 8601. */
data class DailyActualRequest(
    val itemId: String,
    val date: String,
    val produced: Int,
    val soldOffline: Int,
    val soldApp: Int,
    val stockoutAt: String?
)

data class DailyActualDto(val id: String, val itemId: String, val date: String)

/** SpecialEventEntity: type tự do (≤100 ký tự), impactFactor numeric "1.25" (Gson parse được sang Double). Không có ghi chú / sửa. */
data class SpecialEventDto(val id: String, val date: String, val type: String, val impactFactor: Double)

data class CreateSpecialEventRequest(val date: String, val type: String, val impactFactor: Double)

/**
 * PriceProposalEntity + offer (GET store/decisions/pricing/proposals). status: PENDING | APPROVED | REJECTED | EXPIRED | AUTO_APPLIED.
 * components: từ POST propose = {timeElapsedRatio, stockRemainingRatio, floorPrice, priceChangeCount}; từ job = {autoApplied, reason}.
 */
data class PriceProposalDto(
    val id: String,
    val offerId: String,
    val oldPrice: Long,
    val proposedPrice: Long,
    val components: Map<String, Any?>?,
    val status: String,
    val expiresAt: String,
    val createdAt: String,
    val offer: OfferDto?
)

/** POST store/decisions/pricing/propose/:offerId. canPropose=false -> chỉ có explanation/reasonCode. */
data class ProposeResultDto(
    val canPropose: Boolean,
    val explanation: String?,
    val reasonCode: String?,
    val proposal: PriceProposalDto?
)

// --- Túi bất ngờ (marketing.controller.ts, prefix store/marketing) ---

data class SurpriseBagItemRequest(val itemId: String, val quantity: Int)

data class CreateSurpriseBagRequest(
    val title: String,
    val description: String?,
    val originalPrice: Long,
    val currentPrice: Long,
    val totalQuantity: Int,
    val pickupStart: String,
    val pickupEnd: String,
    val items: List<SurpriseBagItemRequest>
)

data class CreateSurpriseBagResponse(val offer: OfferDto, val title: String?, val allergenNotice: String?)

data class SurpriseBagItemDto(val itemId: String, val quantity: Int, val item: ItemDto?)

data class SurpriseBagDto(val offer: OfferDto, val items: List<SurpriseBagItemDto>)

// --- Gợi ý tặng (decisions.controller.ts GET store/donations/suggestions) ---

data class DonationSuggestionDto(val offerId: String, val remainingQuantity: Int, val pickupSlot: String)

data class DonationSuggestionsResponse(val suggestions: List<DonationSuggestionDto>)

/**
 * OrderEntity. status: PENDING_PAYMENT | PAID | PICKED_UP | HOLD_EXPIRED | PICKUP_EXPIRED | CANCELLED | REFUNDED.
 * Backend không trả tên khách / hoa hồng theo đơn. offer chỉ có ở GET store/orders/:id.
 */
data class OrderDto(
    val id: String,
    val code: String,
    val quantity: Int,
    val totalAmount: Long,
    val status: String,
    val pickupSlot: String?,
    val createdAt: String,
    val offerId: String? = null,
    val unitPrice: Long? = null,
    val discountAmount: Long? = null,
    val note: String? = null,
    val holdExpiresAt: String? = null,
    val paidAt: String? = null,
    val pickedUpAt: String? = null,
    val cancelledAt: String? = null,
    val cancelReason: String? = null,
    val cancelledBy: String? = null,
    val arrivingNotifiedAt: String? = null,
    val paymentProofUrl: String? = null,
    val paymentProofUploadedAt: String? = null,
    val offer: OfferDto? = null
)

data class OrdersResponse(
    val data: List<OrderDto>,
    val total: Int,
    val page: Int = 1,
    val totalPages: Int = 1
)

/** CancelOrderDto - lý do ≤255 ký tự. */
data class CancelOrderRequest(val reason: String)

/** VerifyPickupDto: gửi token (nội dung QR) hoặc backupCode (mã dự phòng 6 ký tự). */
data class VerifyPickupRequest(
    val backupCode: String? = null,
    val token: String? = null
)

data class VerifyPickupResponse(
    val success: Boolean,
    val orderCode: String,
    val itemName: String,
    val quantity: Int,
    val totalAmount: Long,
    val customerMasked: String,
    val message: String,
    val note: String? = null
)

/** VerifyProxyCodeDto - mã nhận hộ đúng 8 ký tự A-Z0-9; trả cùng dạng VerifyPickupResponse. */
data class VerifyProxyCodeRequest(val code: String)

/** GET store/pickup-schedule - chỉ hôm nay, khung 15 phút theo giờ máy chủ, đơn PAID/PICKED_UP. */
data class PickupSlotDto(val timeSlot: String, val orderCount: Int, val orders: List<PickupSlotOrderDto>)

data class PickupSlotOrderDto(
    val id: String,
    val code: String,
    val quantity: Int,
    val totalAmount: Long,
    val status: String,
    val pickupSlot: String?
)

/** ComplaintEntity (GET store/complaints). status: PENDING_STORE | ACCEPTED | REJECTED | CLOSED */
data class ComplaintDto(
    val id: String,
    val orderId: String,
    val category: String,
    val description: String,
    val status: String,
    val refundAmount: Long?,
    val createdAt: String,
    val responseDueAt: String? = null,
    val extended: Boolean = false,
    val rejectReason: String? = null,
    val autoAccepted: Boolean = false,
    val order: OrderDto? = null
)

data class ComplaintAttachmentDto(val id: String, val url: String, val addedRound: Int = 1)

/** GET store/complaints/:id. */
data class ComplaintDetailResponse(
    val complaint: ComplaintDto,
    val attachments: List<ComplaintAttachmentDto> = emptyList(),
    val order: OrderDto? = null,
    val refundDestination: RefundDestinationDto? = null
)

/** Tài khoản nhận hoàn của khách, backend chỉ trả phần che (4 số cuối). */
data class RefundDestinationDto(val bankName: String, val accountHolder: String, val accountLast4: String)

/** ResolveComplaintDto: bỏ trống refundAmount = hoàn 100% giá trị đơn. */
data class ResolveComplaintRequest(val refundAmount: Long? = null, val note: String? = null)

data class RejectComplaintRequest(val reason: String)

/** ReviewEntity (GET store/reviews). status: VISIBLE | HIDDEN ... theo backend. */
data class ReviewDto(
    val id: String,
    val orderId: String,
    val rating: Int,
    val comment: String? = null,
    val status: String,
    val storeReply: String? = null,
    val storeReplyAt: String? = null,
    val createdAt: String
)

data class ReplyReviewRequest(val reply: String)

// --- Auth: đăng ký / OTP / mật khẩu (auth.controller.ts) ---

/** StoreRegisterDto: ownerName (họ tên chủ) tùy chọn; backend chưa có loại hình, tọa độ - ValidationPipe whitelist sẽ bỏ field lạ. */
data class StoreRegisterRequest(
    val email: String,
    val password: String,
    val storeName: String,
    val storeAddress: String,
    val storePhone: String,
    val ownerName: String? = null
)

data class StoreRegisterResponse(
    val userId: String,
    val storeId: String,
    val message: String
)

/** purpose: VERIFY | RESET (OtpPurpose). */
data class VerifyOtpRequest(val target: String, val code: String, val purpose: String)

data class ResendOtpRequest(val target: String, val purpose: String)

data class ForgotPasswordRequest(val target: String)

data class ResetPasswordRequest(val target: String, val otpCode: String, val newPassword: String)

data class ChangePasswordRequest(val currentPassword: String, val newPassword: String)

/** Dạng trả về chung {success, message} của các endpoint hành động. */
data class MessageResponse(val success: Boolean, val message: String?)

// --- Việc cần làm hôm nay (stores.service.ts getTodayTasks) ---

data class TaskDto(
    val id: String,
    val title: String,
    val count: Int,
    val urgent: Boolean,
    val actionUrl: String,
    val description: String
)

data class TaskReminders(
    val actualsEntry: Boolean,
    val priceReview: Boolean,
    val reminderTime: String
)

data class TodayTasksResponse(
    val storeId: String,
    val tasks: List<TaskDto>,
    val reminders: TaskReminders
)

data class UpdateTaskRemindersRequest(
    val actualsEntryReminder: Boolean? = null,
    val priceReviewReminder: Boolean? = null,
    val reminderTime: String? = null
)

// --- Thông báo cửa hàng (store-notifications.controller.ts) ---

/** type: ORDER | PICKUP_REMINDER | PROMOTION | COMPLAINT | REVIEW | SUBSCRIPTION | PRICE_PROPOSAL | SYSTEM */
data class NotificationDto(
    val id: String,
    val type: String,
    val title: String,
    val body: String,
    val isRead: Boolean,
    val createdAt: String
)

data class NotificationsResponse(
    val items: List<NotificationDto>,
    val total: Int,
    val page: Int,
    val limit: Int,
    val totalPages: Int,
    val unreadCount: Int
)

data class ApiErrorBody(
    @SerializedName("message") val message: Any? = null,
    val error: String? = null,
    val statusCode: Int? = null
)

// --- Hồ sơ cửa hàng (stores.service.ts getStoreProfile / updateStoreProfile) ---

/** Một ngày trong openHours (jsonb tự do): {"monday": {"open":"07:00","close":"21:30","closed":false}}. Cũng là openHours của closure SPECIAL_HOURS. */
data class DayHoursDto(val open: String? = null, val close: String? = null, val closed: Boolean? = null)

/** status: PENDING_VERIFY | ACTIVE | SUSPENDED */
data class StoreDto(
    val id: String,
    val name: String,
    val address: String?,
    val phone: String?,
    val logoUrl: String?,
    val openHours: Map<String, DayHoursDto>?,
    val status: String?
)

data class StoreProfileResponse(
    val store: StoreDto,
    val settings: StoreSettingsDto?,
    val isPausedToday: Boolean
)

data class UpdateStoreProfileRequest(
    val name: String,
    val address: String,
    val phone: String,
    val logoUrl: String?,
    val openHours: Map<String, DayHoursDto>
)

// --- Cài đặt vận hành + quy tắc (settings.service.ts, StoreSettingsEntity) ---

/** Postgres numeric về dạng chuỗi "0.40" - Gson vẫn parse được sang Double. pricingMode: MANUAL | AUTO */
data class StoreSettingsDto(
    val storeId: String,
    val defaultPickupStart: String,
    val defaultPickupEnd: String,
    val floorRatio: Double,
    val costPriceRatio: Double?,
    val pricingMode: String,
    val lateGraceMinutes: Int,
    val maxQtyPerOrder: Int
)

/** Chỉ gửi field đã đổi (null bị Gson bỏ qua) để lịch sử R2-102 không ghi dòng thừa. */
data class UpdateStoreSettingsRequest(
    val defaultPickupStart: String? = null,
    val defaultPickupEnd: String? = null,
    val floorRatio: Double? = null,
    val pricingMode: String? = null,
    val lateGraceMinutes: Int? = null,
    val maxQtyPerOrder: Int? = null
)

data class SettingsHistoryDto(
    val id: String,
    val actorId: String?,
    val key: String,
    val oldValue: String?,
    val newValue: String?,
    val createdAt: String
)

// --- Lịch nghỉ / giờ đặc biệt (StoreClosureEntity) ---

/** type: CLOSED | SPECIAL_HOURS; date: YYYY-MM-DD */
data class StoreClosureDto(
    val id: String,
    val date: String,
    val type: String,
    val openHours: DayHoursDto?
)

data class CreateClosureRequest(val date: String, val type: String, val openHours: DayHoursDto? = null)

// --- Xuất dữ liệu (stores.service.ts exportOrders / exportAccounting) ---

/** content = CSV có BOM; data (đơn hàng) hoặc statements (sao kê) = bản ghi gốc để xuất JSON. */
data class ExportResponse(
    val filename: String,
    val content: String,
    val data: com.google.gson.JsonElement?,
    val statements: com.google.gson.JsonElement?
)

// --- Nhật ký hoạt động (audit-log.service.ts getStoreAuditLogs) ---

data class AuditLogDto(
    val id: String,
    val actorId: String?,
    val actorRole: String?,
    val action: String,
    val targetType: String?,
    val targetId: String?,
    val oldValue: com.google.gson.JsonElement?,
    val newValue: com.google.gson.JsonElement?,
    val ip: String?,
    val userAgent: String?,
    val createdAt: String
)

data class AuditLogsResponse(
    val items: List<AuditLogDto>,
    val total: Int,
    val page: Int,
    val limit: Int,
    val totalPages: Int
)

// --- Gói dịch vụ (subscriptions.service.ts formatSubscription / quota.service.ts) ---

/** plan/effectivePlan: BASIC | TRIAL | PRO; status: ACTIVE | PENDING_PAYMENT | EXPIRED | CANCELLED */
data class SubscriptionDto(
    val plan: String,
    val effectivePlan: String?,
    val status: String,
    val periodStart: String?,
    val periodEnd: String?,
    val daysRemaining: Int,
    val trialUsed: Boolean,
    val cancelAtPeriodEnd: Boolean,
    val downgradeAtPeriodEnd: Boolean,
    val isTrial: Boolean
)

/** period: DAILY | MONTHLY | PER_REQUEST | EXISTENCE */
data class QuotaDto(
    val quotaKey: String,
    val name: String,
    val limit: Int,
    val used: Int,
    val remaining: Int,
    val resetsAt: String?,
    val isExceeded: Boolean,
    val period: String
)

/** status: PAID | PENDING | FAILED | REFUNDED */
data class InvoiceDto(
    val id: String,
    val periodStart: String,
    val periodEnd: String,
    val amount: Long,
    val paymentTxnId: String?,
    val status: String,
    val createdAt: String
)

data class InvoicePdfResponse(val filename: String, val dataBase64: String)

// --- Rescue Timeline (CM-B01) ---

data class RescueRiskFactor(val code: String, val label: String, val points: Int)
data class RescueRecommendedAction(val type: String, val reason: String)

/** Một lô trong GET store/rescue-timeline. riskLevel: LOW | MEDIUM | HIGH | CRITICAL; dataQualityStatus: OK | STALE | INSUFFICIENT. */
data class RescueLot(
    val lotId: String,
    val itemName: String?,
    val kind: String?,
    val lotStatus: String,
    val quantityAvailable: Int,
    val pickupEndAt: String,
    val expiryAt: String?,
    val riskLevel: String?,
    val riskFactors: List<RescueRiskFactor>,
    val dataQualityStatus: String,
    val calculatedAt: String,
    val needsRecalculation: Boolean
)

data class RescueTimelineResponse(
    val items: List<RescueLot>,
    val needsRecalculation: Boolean,
    val oldestCalculatedAt: String?
)

data class RescueNext(val method: String, val path: String)
data class RescueAvailableAction(
    val type: String,
    val label: String,
    val recommended: Boolean,
    val enabled: Boolean,
    val disabledReason: String?,
    val next: RescueNext?
)
data class RescueLotOffer(val status: String, val currentPrice: Long, val originalPrice: Long, val floorPrice: Long, val totalQuantity: Int)
data class RescueHistoryEntry(val action: String, val actorRole: String, val at: String, val result: Map<String, Any?>?)

data class RescueLotDetail(
    val lotId: String,
    val itemName: String?,
    val kind: String?,
    val quantityAvailable: Int,
    val pickupEndAt: String,
    val riskLevel: String?,
    val riskFactors: List<RescueRiskFactor>,
    val dataQualityStatus: String,
    val calculatedAt: String,
    val offer: RescueLotOffer,
    val availableActions: List<RescueAvailableAction>,
    val history: List<RescueHistoryEntry>
)

data class RescueActionResult(val outcome: String?, val next: RescueNext?)

// --- Rescue Pool Manager (CM-B02). Chỉ có nhu cầu tổng hợp, không có dữ liệu cá nhân của khách (BR-B02-08). ---

/** poolStatus: DRAFT | OPEN | AGGREGATING | PENDING_STORE | OFFER_PUBLISHED | ORDERING_OPEN | COMPLETED | INSUFFICIENT | CANCELLED | EXPIRED. */
data class RescuePool(
    val id: String,
    val poolTitle: String,
    val targetCategory: String,
    val serviceArea: String,
    val registrationOpenAt: String,
    val registrationCloseAt: String,
    val confirmDeadlineAt: String,
    val minimumDemand: Int,
    val maximumSupply: Int,
    val targetBudgetMin: Long?,
    val targetBudgetMax: Long?,
    val pickupWindowStart: String,
    val pickupWindowEnd: String,
    val endCondition: String,
    val linkedOfferId: String?,
    val offeredQuantity: Int?,
    val proposedPrice: Long?,
    val offerPickupStart: String?,
    val offerPickupEnd: String?,
    val offerVersion: Int,
    val offerExpiryAt: String?,
    val poolStatus: String,
    val registrationCount: Int,
    val confirmedOrderCount: Int,
    val cancellationReason: String?
)

data class PoolBudgetBucket(val bucket: String, val registrations: Int, val quantity: Int)
data class PoolSlotBucket(val slot: String, val registrations: Int, val quantity: Int)
data class PoolDemand(
    val totalRegistrations: Int,
    val totalRequestedQuantity: Int,
    val meetsMinimumDemand: Boolean,
    val exceedsMaximumSupply: Boolean,
    val budgetDistribution: List<PoolBudgetBucket>,
    val pickupWindowDistribution: List<PoolSlotBucket>
)

data class RescuePoolDetail(
    val id: String,
    val poolTitle: String,
    val targetCategory: String,
    val serviceArea: String,
    val registrationOpenAt: String,
    val registrationCloseAt: String,
    val confirmDeadlineAt: String,
    val minimumDemand: Int,
    val maximumSupply: Int,
    val targetBudgetMin: Long?,
    val targetBudgetMax: Long?,
    val pickupWindowStart: String,
    val pickupWindowEnd: String,
    val endCondition: String,
    val linkedOfferId: String?,
    val offeredQuantity: Int?,
    val proposedPrice: Long?,
    val offerPickupStart: String?,
    val offerPickupEnd: String?,
    val offerVersion: Int,
    val offerExpiryAt: String?,
    val poolStatus: String,
    val cancellationReason: String?,
    val demand: PoolDemand,
    val confirmedQuantity: Int,
    val remainingSupply: Int?,
    val allowedTransitions: List<String>
)

data class PoolRegistrationStats(val total: Int, val active: Int, val ordered: Int, val withdrawn: Int, val closedWithoutOrder: Int)
data class PoolFailureReason(val reason: String, val count: Int)
data class RescuePoolReport(
    val registrations: PoolRegistrationStats,
    val ordersCreated: Int,
    val ordersFulfilled: Int,
    val soldQuantity: Int,
    val failureReasons: List<PoolFailureReason>
)

// --- Danh mục gói (GET store/subscription/catalog) ---
data class PlanCatalogDto(
    val proPriceVnd: Long,
    val periodDays: Int,
    val commissionRate: Double?,
    val reportHistoryDays: ReportHistoryDaysDto,
    val quotas: List<PlanQuotaDto>,
    val proFeatures: List<PlanFeatureDto>
)

data class ReportHistoryDaysDto(val basic: Int, val pro: Int)
data class PlanQuotaDto(val key: String, val name: String, val period: String, val basic: Int, val pro: Int)
data class PlanFeatureDto(val key: String, val name: String)

/** Hồ sơ kinh doanh và hợp đồng: GET store/legal-profile. */
data class LegalProfileDto(
    val legalName: String,
    val businessType: String,
    val taxCode: String? = null,
    val businessLicenseNo: String? = null,
    val representativeName: String,
    val representativePhone: String,
    val legalAddress: String,
)

data class ContractDto(
    val id: String,
    val status: String,
    val fileName: String,
    val mimeType: String,
    val sizeBytes: Long,
    val reviewNote: String? = null,
    val reviewedAt: String? = null,
    val createdAt: String,
)

data class LegalOverviewDto(val profile: LegalProfileDto? = null, val contract: ContractDto? = null)

data class LegalProfileRequest(
    val legalName: String,
    val businessType: String,
    val taxCode: String? = null,
    val businessLicenseNo: String? = null,
    val representativeName: String,
    val representativePhone: String,
    val legalAddress: String,
)
