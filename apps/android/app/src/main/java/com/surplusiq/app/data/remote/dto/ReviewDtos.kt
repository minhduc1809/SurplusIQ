package com.surplusiq.app.data.remote.dto

import com.google.gson.annotations.SerializedName

/** Phản hồi danh sách đánh giá công khai của cửa hàng (K15) */
data class StoreReviewsResponseDto(
    @SerializedName("storeId") val storeId: String,
    @SerializedName("storeName") val storeName: String,
    @SerializedName("averageRating") val averageRating: Double,
    @SerializedName("totalReviews") val totalReviews: Int,
    @SerializedName("distribution") val distribution: Map<String, Int>,
    @SerializedName("page") val page: Int,
    @SerializedName("limit") val limit: Int,
    @SerializedName("totalPages") val totalPages: Int,
    @SerializedName("reviews") val reviews: List<StoreReviewItemDto>
)

/** Chi tiết một đánh giá công khai của cửa hàng */
data class StoreReviewItemDto(
    @SerializedName("id") val id: String,
    @SerializedName("rating") val rating: Int,
    @SerializedName("comment") val comment: String?,
    @SerializedName("storeReply") val storeReply: String?,
    @SerializedName("storeReplyAt") val storeReplyAt: String?,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("customerName") val customerName: String,
    @SerializedName("customerAvatar") val customerAvatar: String?
)

/** Đánh giá của chính khách hàng (K38) */
data class CustomerReviewDto(
    @SerializedName("id") val id: String,
    @SerializedName("orderId") val orderId: String,
    @SerializedName("orderCode") val orderCode: String?,
    @SerializedName("store") val store: ReviewStoreInfoDto,
    @SerializedName("rating") val rating: Int,
    @SerializedName("comment") val comment: String?,
    @SerializedName("status") val status: String,
    @SerializedName("storeReply") val storeReply: String?,
    @SerializedName("storeReplyAt") val storeReplyAt: String?,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String?,
    @SerializedName("canEdit") val canEdit: Boolean
)

/** Thông tin cửa hàng đi kèm đánh giá của tôi */
data class ReviewStoreInfoDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("logoUrl") val logoUrl: String?,
    @SerializedName("address") val address: String?
)

/** Yêu cầu cập nhật đánh giá trong 24 giờ (R1-065) */
data class UpdateReviewRequest(
    @SerializedName("rating") val rating: Int,
    @SerializedName("comment") val comment: String?
)
