package com.surplusiq.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class CreateSupportTicketRequest(
    @SerializedName("subject") val subject: String,
    @SerializedName("message") val message: String
)

data class SendSupportMessageRequest(
    @SerializedName("message") val message: String
)

data class SupportTicketResponse(
    @SerializedName("id") val id: String,
    @SerializedName("userId") val userId: String,
    @SerializedName("subject") val subject: String,
    @SerializedName("status") val status: String,
    @SerializedName("createdAt") val createdAt: String? = null,
    @SerializedName("updatedAt") val updatedAt: String? = null
)

data class SupportMessageResponse(
    @SerializedName("id") val id: String,
    @SerializedName("ticketId") val ticketId: String,
    @SerializedName("senderId") val senderId: String,
    @SerializedName("message") val message: String,
    @SerializedName("isInternal") val isInternal: Boolean = false,
    @SerializedName("createdAt") val createdAt: String? = null
)

data class SupportTicketDetailResponse(
    @SerializedName("ticket") val ticket: SupportTicketResponse,
    @SerializedName("messages") val messages: List<SupportMessageResponse> = emptyList()
)
