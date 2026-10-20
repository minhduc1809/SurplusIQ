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
    val ratingCount: Int
)
data class ReportsRecovery(val recoveryRatePercent: Double)
data class ReportsWaste(val wastedWeightKg: Double, val wastedEstimatedCost: Long)

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
    val stats: ItemStatsDto? = null
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
    val createdAt: String
)

// --- Auth: đăng ký / OTP / mật khẩu (auth.controller.ts) ---

/** StoreRegisterDto: backend chưa có họ tên chủ, loại hình, tọa độ - ValidationPipe whitelist sẽ bỏ field lạ. */
data class StoreRegisterRequest(
    val email: String,
    val password: String,
    val storeName: String,
    val storeAddress: String,
    val storePhone: String
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

// --- Nhân viên: chấp nhận lời mời (store-staff.controller.ts) ---

data class AcceptInviteRequest(val token: String)

data class AcceptInviteResponse(
    val success: Boolean,
    val message: String,
    val storeId: String,
    val permission: String
)

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
