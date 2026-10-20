package com.surplusiq.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class CustomerProfileDto(
    @SerializedName(value = "id", alternate = ["userId"]) val id: String,
    @SerializedName("phone") val phone: String,
    @SerializedName("fullName") val fullName: String,
    @SerializedName("email") val email: String? = null,
    @SerializedName("avatarUrl") val avatarUrl: String? = null,
    @SerializedName("impactStats") val impactStats: ImpactStatsDto? = null
)

data class ImpactStatsDto(
    @SerializedName("foodSavedKg") val foodSavedKg: Double = 0.0,
    @SerializedName("co2AvoidedKg") val co2AvoidedKg: Double = 0.0,
    @SerializedName("moneySavedVnd") val moneySavedVnd: Long = 0L,
    @SerializedName("consecutiveDaysStreak") val consecutiveDaysStreak: Int = 1,
    @SerializedName("rescueBadge") val rescueBadge: String = "Người Cứu Món Tích Cực"
)

data class DietaryProfileDto(
    @SerializedName("dietaryPreferences") val dietaryPreferences: List<String> = emptyList(),
    @SerializedName("allergies") val allergies: List<String> = emptyList()
)

data class UpdateDietaryProfileRequest(
    @SerializedName("dietaryPreferences") val dietaryPreferences: List<String>,
    @SerializedName("allergies") val allergies: List<String>
)

/** Backend chỉ trả bản ghi liên kết (id, userId, storeId, createdAt); thông tin quán lấy từ customer/stores/:id. */
data class FavoriteStoreDto(
    @SerializedName("storeId") val storeId: String,
    @SerializedName("createdAt") val createdAt: String? = null
)

/** Địa điểm quen thuộc (R1-015): location là GeoJSON Point [lng, lat]. Backend không lưu địa chỉ chữ. */
data class SavedPlaceDto(
    @SerializedName("id") val id: String,
    @SerializedName("label") val label: String,
    @SerializedName("location") val location: GeoPointDto? = null,
    @SerializedName("radiusKm") val radiusKm: Double? = null
)

data class GeoPointDto(
    @SerializedName("coordinates") val coordinates: List<Double> = emptyList()
)

data class CreateSavedPlaceRequest(
    @SerializedName("label") val label: String,
    @SerializedName("latitude") val latitude: Double,
    @SerializedName("longitude") val longitude: Double,
    @SerializedName("radiusKm") val radiusKm: Double? = null
)

/** GDPR: lịch sử chấp thuận điều khoản (R1-012, R1-017) */
data class ConsentDto(
    @SerializedName("id") val id: String,
    @SerializedName("type") val type: String,
    @SerializedName("version") val version: String,
    @SerializedName("granted") val granted: Boolean,
    @SerializedName("grantedAt") val grantedAt: String? = null
)

data class RecordConsentRequest(
    @SerializedName("type") val type: String,
    @SerializedName("granted") val granted: Boolean,
    @SerializedName("version") val version: String? = null
)

/** R1-011/R1-019/BR-007: yêu cầu xóa tài khoản, ân hạn 7 ngày */
data class AccountDeleteResponse(
    @SerializedName("success") val success: Boolean = true,
    @SerializedName("status") val status: String? = null,
    @SerializedName("deleteRequestedAt") val deleteRequestedAt: String? = null,
    @SerializedName("message") val message: String? = null
)

/** R1-018: xuất dữ liệu cá nhân, link tải về hiệu lực 24h */
data class DataExportResponse(
    @SerializedName("downloadUrl") val downloadUrl: String,
    @SerializedName("expiresInHours") val expiresInHours: Int = 24
)

/** R1-077: một bản ghi payment_transactions (thanh toán hoặc hoàn tiền) của khách. */
data class PaymentTransactionRecordDto(
    @SerializedName("id") val id: String,
    @SerializedName("orderId") val orderId: String? = null,
    @SerializedName("kind") val kind: String,
    @SerializedName("amount") val amount: Long,
    @SerializedName("method") val method: String? = null,
    @SerializedName("gatewayTxnId") val gatewayTxnId: String,
    @SerializedName("parentTxnId") val parentTxnId: String? = null,
    @SerializedName("status") val status: String,
    @SerializedName("createdAt") val createdAt: String? = null,
    @SerializedName("updatedAt") val updatedAt: String? = null
)

/** R1-048, BR-020: trạng thái khóa đặt và các lần không đến nhận trong 30 ngày. */
data class OrderLockStatusDto(
    @SerializedName("isLocked") val isLocked: Boolean,
    @SerializedName("lockedUntil") val lockedUntil: String? = null,
    @SerializedName("noshowCount30d") val noshowCount30d: Int,
    @SerializedName("noshowRecords") val noshowRecords: List<NoshowRecordDto> = emptyList(),
    @SerializedName("policy") val policy: String? = null
)

data class NoshowRecordDto(
    @SerializedName("id") val id: String,
    @SerializedName("orderId") val orderId: String,
    @SerializedName("occurredAt") val occurredAt: String? = null
)

/** R1-078: một mục trong ví ưu đãi (promotion_wallet) kèm thông tin promotion. */
data class PromotionWalletItemDto(
    @SerializedName("promotionId") val promotionId: String,
    @SerializedName("claimedAt") val claimedAt: String? = null,
    @SerializedName("usedAt") val usedAt: String? = null,
    @SerializedName("orderId") val orderId: String? = null,
    @SerializedName("promotion") val promotion: PromotionDto? = null,
    @SerializedName("isUsable") val isUsable: Boolean = false
)

data class PromotionDto(
    @SerializedName("id") val id: String,
    @SerializedName("storeId") val storeId: String,
    @SerializedName("name") val name: String,
    @SerializedName("type") val type: String,
    @SerializedName("value") val value: Int,
    @SerializedName("maxUses") val maxUses: Int? = null,
    @SerializedName("usedCount") val usedCount: Int = 0,
    @SerializedName("startAt") val startAt: String? = null,
    @SerializedName("endAt") val endAt: String? = null,
    @SerializedName("minOrderAmount") val minOrderAmount: Int = 0,
    @SerializedName("status") val status: String
)
