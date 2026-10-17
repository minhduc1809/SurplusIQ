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
