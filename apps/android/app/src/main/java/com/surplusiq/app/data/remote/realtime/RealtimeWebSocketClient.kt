package com.surplusiq.app.data.remote.realtime

import android.util.Log
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.surplusiq.app.data.remote.SessionManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import javax.inject.Inject
import javax.inject.Singleton

sealed class RealtimeEvent {
    data class DealStockUpdated(
        val dealId: String,
        val storeId: String,
        val remainingQuantity: Int,
        val status: String
    ) : RealtimeEvent()

    data class DealFlashRescue(
        val dealId: String,
        val storeId: String,
        val title: String,
        val storeName: String,
        val discountPercent: Int,
        val discountedPrice: Int,
        val originalPrice: Int,
        val latitude: Double,
        val longitude: Double,
        val expiresAt: String
    ) : RealtimeEvent()

    data class OrderHoldReserved(
        val orderId: String,
        val dealId: String,
        val storeId: String,
        val reservedQuantity: Int,
        val holdExpiresAt: String
    ) : RealtimeEvent()

    data class Connected(val message: String) : RealtimeEvent()
}

@Singleton
class RealtimeWebSocketClient @Inject constructor(
    private val okHttpClient: OkHttpClient,
    private val sessionManager: SessionManager,
    private val gson: Gson
) {
    private val TAG = "SurplusIQ_Realtime"
    private val scope = CoroutineScope(Dispatchers.IO)
    private var webSocket: WebSocket? = null
    private var isConnected = false
    private var shouldReconnect = true

    private val _events = MutableSharedFlow<RealtimeEvent>(extraBufferCapacity = 64)
    val events: SharedFlow<RealtimeEvent> = _events.asSharedFlow()

    fun connect() {
        if (isConnected) return
        shouldReconnect = true

        val httpBase = sessionManager.getBaseUrl()
        // Chuyển http:// sang ws://, https:// sang wss://
        val wsUrl = httpBase
            .replace("http://", "ws://")
            .replace("https://", "wss://")
            .trimEnd('/') + "/ws"

        Log.d(TAG, "Connecting to WebSocket: $wsUrl")
        val request = Request.Builder().url(wsUrl).build()

        webSocket = okHttpClient.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                isConnected = true
                Log.d(TAG, "WebSocket connected successfully to $wsUrl")
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                Log.d(TAG, "WebSocket message: $text")
                try {
                    val json = gson.fromJson(text, JsonObject::class.java)
                    val type = json.get("type")?.asString
                    val data = json.getAsJsonObject("data")

                    when (type) {
                        "deal.stock_updated" -> {
                            if (data != null) {
                                val event = RealtimeEvent.DealStockUpdated(
                                    dealId = data.get("dealId")?.asString ?: "",
                                    storeId = data.get("storeId")?.asString ?: "",
                                    remainingQuantity = data.get("remainingQuantity")?.asInt ?: 0,
                                    status = data.get("status")?.asString ?: "AVAILABLE"
                                )
                                scope.launch { _events.emit(event) }
                            }
                        }
                        "deal.flash_rescue" -> {
                            if (data != null) {
                                val event = RealtimeEvent.DealFlashRescue(
                                    dealId = data.get("dealId")?.asString ?: "",
                                    storeId = data.get("storeId")?.asString ?: "",
                                    title = data.get("title")?.asString ?: "",
                                    storeName = data.get("storeName")?.asString ?: "",
                                    discountPercent = data.get("discountPercent")?.asInt ?: 0,
                                    discountedPrice = data.get("discountedPrice")?.asInt ?: 0,
                                    originalPrice = data.get("originalPrice")?.asInt ?: 0,
                                    latitude = data.get("latitude")?.asDouble ?: 0.0,
                                    longitude = data.get("longitude")?.asDouble ?: 0.0,
                                    expiresAt = data.get("expiresAt")?.asString ?: ""
                                )
                                scope.launch { _events.emit(event) }
                            }
                        }
                        "order.hold_reserved" -> {
                            if (data != null) {
                                val event = RealtimeEvent.OrderHoldReserved(
                                    orderId = data.get("orderId")?.asString ?: "",
                                    dealId = data.get("dealId")?.asString ?: "",
                                    storeId = data.get("storeId")?.asString ?: "",
                                    reservedQuantity = data.get("reservedQuantity")?.asInt ?: 1,
                                    holdExpiresAt = data.get("holdExpiresAt")?.asString ?: ""
                                )
                                scope.launch { _events.emit(event) }
                            }
                        }
                        "system.connected" -> {
                            scope.launch {
                                _events.emit(RealtimeEvent.Connected(json.get("message")?.asString ?: "Connected"))
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing WebSocket event", e)
                }
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                isConnected = false
                Log.d(TAG, "WebSocket closing: $code / $reason")
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                isConnected = false
                Log.w(TAG, "WebSocket failure: ${t.message}. Reconnecting in 5s...")
                if (shouldReconnect) {
                    scope.launch {
                        delay(5000)
                        connect()
                    }
                }
            }
        })
    }

    fun disconnect() {
        shouldReconnect = false
        isConnected = false
        webSocket?.close(1000, "App closed")
        webSocket = null
    }
}
