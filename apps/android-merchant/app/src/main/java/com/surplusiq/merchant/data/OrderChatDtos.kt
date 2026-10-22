package com.surplusiq.merchant.data

import com.google.gson.annotations.SerializedName

data class OrderChatMessage(
    @SerializedName("id") val id: String,
    @SerializedName("fromMe") val fromMe: Boolean,
    @SerializedName("body") val body: String,
    @SerializedName("createdAt") val createdAt: String? = null,
    @SerializedName("readAt") val readAt: String? = null
)

data class OrderChatThread(
    @SerializedName("orderCode") val orderCode: String,
    @SerializedName("isOpen") val isOpen: Boolean = true,
    @SerializedName("messages") val messages: List<OrderChatMessage> = emptyList()
)

data class SendOrderChatRequest(@SerializedName("body") val body: String)
