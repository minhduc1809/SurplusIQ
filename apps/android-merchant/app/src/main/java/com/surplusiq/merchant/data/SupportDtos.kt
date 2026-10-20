package com.surplusiq.merchant.data

// --- TrustPass (catalog.controller.ts, store/items/:id/trustpass*) ---

/** informationSource: STORE | PLATFORM_VERIFIED (chủ chỉ chọn được STORE, nền tảng mới đặt PLATFORM_VERIFIED). */
data class TrustpassRequest(
    val ingredients: String? = null,
    val allergens: List<String>? = null,
    val preparedAt: String? = null,
    val expiryAt: String? = null,
    val storageInstructions: String? = null,
    val informationSource: String = "STORE"
)

data class TrustpassHistoryRow(
    val versionNo: Int,
    val fieldName: String,
    val oldValue: com.google.gson.JsonElement? = null,
    val newValue: com.google.gson.JsonElement? = null,
    val createdAt: String
)

// --- Hỗ trợ nền tảng (store/support-tickets) ---

/** category: PAYMENT | BUG | DISPUTE | OTHER. status: OPEN | IN_PROGRESS | ANSWERED | CLOSED. */
data class SupportTicketDto(
    val id: String,
    val subject: String,
    val category: String = "OTHER",
    val status: String,
    val lastMessageAt: String? = null,
    val hasNewReply: Boolean = false,
    val createdAt: String
)

data class SupportMessageDto(val id: String, val senderId: String, val message: String, val createdAt: String, val attachmentUrls: List<String> = emptyList())

data class SupportDetailResponse(val ticket: SupportTicketDto, val messages: List<SupportMessageDto>)

data class CreateTicketRequest(val subject: String, val message: String, val category: String, val attachmentUrls: List<String> = emptyList())

data class SupportMessageRequest(val message: String, val attachmentUrls: List<String> = emptyList())
