package com.surplusiq.app.data.remote.dto

import com.google.gson.annotations.SerializedName

// --- KX12 Theo dõi đơn ---
data class TrackingStepDto(
    @SerializedName("key") val key: String,
    @SerializedName("label") val label: String,
    @SerializedName("at") val at: String? = null,
    @SerializedName("state") val state: String
)

data class TrackingTerminalDto(
    @SerializedName("key") val key: String,
    @SerializedName("label") val label: String,
    @SerializedName("at") val at: String? = null,
    @SerializedName("reason") val reason: String? = null
)

data class TrackingPickupDto(
    @SerializedName("start") val start: String? = null,
    @SerializedName("end") val end: String? = null,
    @SerializedName("inWindow") val inWindow: Boolean = false,
    @SerializedName("minutesLeft") val minutesLeft: Int = 0
)

data class TrackingStoreDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("address") val address: String? = null,
    @SerializedName("latitude") val latitude: Double? = null,
    @SerializedName("longitude") val longitude: Double? = null
)

data class OrderTrackingDto(
    @SerializedName("orderId") val orderId: String,
    @SerializedName("code") val code: String,
    @SerializedName("status") val status: String,
    @SerializedName("steps") val steps: List<TrackingStepDto> = emptyList(),
    @SerializedName("terminal") val terminal: TrackingTerminalDto? = null,
    @SerializedName("holdSecondsLeft") val holdSecondsLeft: Int? = null,
    @SerializedName("pickup") val pickup: TrackingPickupDto? = null,
    @SerializedName("store") val store: TrackingStoreDto? = null,
    @SerializedName("hasOpenIncident") val hasOpenIncident: Boolean = false,
    @SerializedName("unreadMessages") val unreadMessages: Int = 0
)

// --- KX03 Sự cố khi nhận ---
data class CreateIncidentRequest(
    @SerializedName("type") val type: String,
    @SerializedName("note") val note: String? = null
)

data class IncidentDto(
    @SerializedName("id") val id: String,
    @SerializedName("type") val type: String,
    @SerializedName("typeLabel") val typeLabel: String,
    @SerializedName("note") val note: String? = null,
    @SerializedName("status") val status: String,
    @SerializedName("outcome") val outcome: String? = null,
    @SerializedName("storeResponse") val storeResponse: String? = null,
    @SerializedName("createdAt") val createdAt: String? = null
)

// --- KX11 Trò chuyện ---
data class ChatMessageDto(
    @SerializedName("id") val id: String,
    @SerializedName("fromMe") val fromMe: Boolean,
    @SerializedName("body") val body: String,
    @SerializedName("createdAt") val createdAt: String? = null
)

data class ChatThreadDto(
    @SerializedName("orderCode") val orderCode: String,
    @SerializedName("isOpen") val isOpen: Boolean = true,
    @SerializedName("messages") val messages: List<ChatMessageDto> = emptyList()
)

data class SendMessageRequest(@SerializedName("body") val body: String)

// --- KX05 Đổi suất ---
data class SwapOptionDto(
    @SerializedName("offerId") val offerId: String,
    @SerializedName("title") val title: String,
    @SerializedName("currentPrice") val currentPrice: Int,
    @SerializedName("remainingQuantity") val remainingQuantity: Int,
    @SerializedName("pickupEnd") val pickupEnd: String? = null
)

data class SwapOptionsDto(
    @SerializedName("paidUnitPrice") val paidUnitPrice: Int,
    @SerializedName("quantity") val quantity: Int,
    @SerializedName("note") val note: String,
    @SerializedName("options") val options: List<SwapOptionDto> = emptyList()
)

data class SwapRequest(@SerializedName("newOfferId") val newOfferId: String)

// --- KX18 Tặng suất ---
data class CreateGiftRequest(
    @SerializedName("recipient") val recipient: String,
    @SerializedName("message") val message: String? = null
)

data class GiftCounterpartDto(
    @SerializedName("name") val name: String? = null,
    @SerializedName("contact") val contact: String? = null
)

data class GiftDto(
    @SerializedName("id") val id: String,
    @SerializedName("direction") val direction: String,
    @SerializedName("status") val status: String,
    @SerializedName("message") val message: String? = null,
    @SerializedName("expiresAt") val expiresAt: String? = null,
    @SerializedName("orderCode") val orderCode: String? = null,
    @SerializedName("itemName") val itemName: String? = null,
    @SerializedName("quantity") val quantity: Int? = null,
    @SerializedName("pickupEnd") val pickupEnd: String? = null,
    @SerializedName("counterpart") val counterpart: GiftCounterpartDto = GiftCounterpartDto()
)

data class GiftsDto(
    @SerializedName("incoming") val incoming: List<GiftDto> = emptyList(),
    @SerializedName("outgoing") val outgoing: List<GiftDto> = emptyList()
)
