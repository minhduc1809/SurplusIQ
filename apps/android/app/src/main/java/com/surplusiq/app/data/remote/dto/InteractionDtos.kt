package com.surplusiq.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class CreateComplaintRequest(
    @SerializedName("category") val category: String,
    @SerializedName("description") val description: String,
    @SerializedName("imageUrls") val imageUrls: List<String> = emptyList()
)

data class ComplaintResponse(
    @SerializedName("id") val id: String,
    @SerializedName("orderId") val orderId: String,
    @SerializedName("category") val category: String,
    @SerializedName("description") val description: String,
    @SerializedName("status") val status: String,
    @SerializedName("imageUrls") val imageUrls: List<String> = emptyList(),
    @SerializedName("createdAt") val createdAt: String? = null,
    // Trường bổ sung từ GET customer/complaints(/:id) (R1-062, R1-067)
    @SerializedName("orderCode") val orderCode: String? = null,
    @SerializedName("store") val store: ComplaintStoreDto? = null,
    @SerializedName("responseDueAt") val responseDueAt: String? = null,
    @SerializedName("refundAmount") val refundAmount: Long? = null,
    @SerializedName("rejectReason") val rejectReason: String? = null,
    @SerializedName("autoAccepted") val autoAccepted: Boolean? = null,
    @SerializedName("attachments") val attachments: List<String>? = null
)

data class ComplaintStoreDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("address") val address: String? = null,
    @SerializedName("phone") val phone: String? = null
)

/** R1-068: bổ sung ảnh bằng chứng (URL), tối đa 3 ảnh/lần, tổng 5 ảnh. */
data class AddComplaintAttachmentsRequest(
    @SerializedName("photoUrls") val photoUrls: List<String>
)

/** R1-069: targetType STORE | DEAL | REVIEW, reason tối đa 500 ký tự. */
data class CreateViolationReportRequest(
    @SerializedName("targetType") val targetType: String,
    @SerializedName("targetId") val targetId: String,
    @SerializedName("reason") val reason: String
)

data class ViolationReportResponse(
    @SerializedName("id") val id: String,
    @SerializedName("targetType") val targetType: String,
    @SerializedName("targetId") val targetId: String,
    @SerializedName("createdAt") val createdAt: String? = null
)

data class CreateReviewRequest(
    @SerializedName("rating") val rating: Int,
    @SerializedName("comment") val comment: String? = null
)

data class ReviewResponse(
    @SerializedName("id") val id: String,
    @SerializedName("orderId") val orderId: String,
    @SerializedName("rating") val rating: Int,
    @SerializedName("comment") val comment: String? = null,
    @SerializedName("createdAt") val createdAt: String? = null
)

/** R1-076: thống kê tác động cá nhân */
data class CustomerImpactDto(
    @SerializedName("totalOrders") val totalOrders: Int = 0,
    @SerializedName("totalSavingsVnd") val totalSavingsVnd: Long = 0L,
    @SerializedName("totalFoodSavedKg") val totalFoodSavedKg: Double = 0.0
)

/** R1-081: huy hiệu & tiến trình mở khóa, thẻ chia sẻ mạng xã hội */
data class ImpactBadgeDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("description") val description: String,
    @SerializedName("icon") val icon: String,
    @SerializedName("isUnlocked") val isUnlocked: Boolean,
    @SerializedName("progress") val progress: Int
)

data class ShareCardDto(
    @SerializedName("title") val title: String,
    @SerializedName("statLine") val statLine: String,
    @SerializedName("shareUrl") val shareUrl: String,
    @SerializedName("hashtag") val hashtag: String
)

data class CustomerImpactBadgesResponse(
    @SerializedName("impact") val impact: CustomerImpactDto,
    @SerializedName("currentBadgeTitle") val currentBadgeTitle: String,
    @SerializedName("unlockedCount") val unlockedCount: Int,
    @SerializedName("totalBadges") val totalBadges: Int,
    @SerializedName("badges") val badges: List<ImpactBadgeDto>,
    @SerializedName("shareCard") val shareCard: ShareCardDto
)

/** R1-072: FAQ trung tâm hỗ trợ, public no-auth */
data class FaqEntryDto(
    @SerializedName("q") val q: String,
    @SerializedName("a") val a: String
)

data class FaqCategoryDto(
    @SerializedName("category") val category: String,
    @SerializedName("categoryTitle") val categoryTitle: String,
    @SerializedName("faqs") val faqs: List<FaqEntryDto>
)
