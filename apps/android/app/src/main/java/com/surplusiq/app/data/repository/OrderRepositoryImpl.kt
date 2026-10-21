package com.surplusiq.app.data.repository

import com.surplusiq.app.data.remote.api.OrdersApiService
import com.surplusiq.app.data.remote.api.PaymentsApiService
import com.surplusiq.app.data.remote.api.PickupsApiService
import com.surplusiq.app.data.remote.dto.CancelOrderRequest
import com.surplusiq.app.data.remote.dto.CreateOrderRequest
import com.surplusiq.app.data.remote.dto.CreatePaymentRequest
import com.surplusiq.app.data.remote.dto.OrderReceiptDto
import com.surplusiq.app.data.remote.dto.AttachPaymentProofRequest
import com.surplusiq.app.data.remote.dto.UpdatePickupSlotRequest
import com.surplusiq.app.data.remote.dto.ProxyCodeResponse
import com.surplusiq.app.data.remote.dto.ReorderResponseDto
import com.surplusiq.app.domain.model.ActiveOrder
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.domain.model.OrderStatus
import com.surplusiq.app.domain.model.PaymentInfo
import com.surplusiq.app.domain.model.PaymentRecheckResult
import com.surplusiq.app.domain.repository.OrderRepository
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Nguyên tắc bắt buộc theo rule thiết kế (mục 0.1 "những điều cấm"):
 * KHÔNG tự tạo "fake success" khi API chưa xác nhận. Mọi lỗi mạng/HTTP phải trả
 * về Result.failure với thông báo thật, để UI hiển thị trạng thái lỗi + nút thử lại,
 * không âm thầm giả lập đơn/thanh toán thành công.
 */
@Singleton
class OrderRepositoryImpl @Inject constructor(
    private val ordersApiService: OrdersApiService,
    private val pickupsApiService: PickupsApiService,
    private val paymentsApiService: PaymentsApiService
) : OrderRepository {

    // Bộ nhớ đệm trong phiên app, chỉ chứa đơn có thật từ phản hồi API thành công
    // (không fabricate). Mất khi tắt app - chấp nhận được cho bản này, chưa đồng
    // bộ lại với server khi mở lại app (giới hạn đã biết, không phải fake data).
    private val sessionOrders = mutableListOf<ActiveOrder>()

    private fun upsertSessionOrder(order: ActiveOrder) {
        sessionOrders.removeAll { it.id == order.id }
        sessionOrders.add(0, order)
    }

    override suspend fun holdOrder(
        deal: Deal,
        quantity: Int,
        pickupSlot: String?,
        note: String?,
        promotionId: String?
    ): Result<ActiveOrder> {
        return try {
            val response = ordersApiService.holdOrder(
                request = CreateOrderRequest(
                    offerId = deal.id,
                    quantity = quantity,
                    pickupSlot = pickupSlot,
                    promotionId = promotionId,
                    note = note
                ),
                idempotencyKey = UUID.randomUUID().toString()
            )

            val dto = response.body()
            if (response.isSuccessful && dto != null) {
                val order = ActiveOrder(
                    id = dto.id,
                    orderCode = dto.code,
                    deal = deal,
                    quantity = dto.quantity,
                    unitPrice = dto.unitPrice.toInt(),
                    totalPrice = dto.totalAmount.toInt(),
                    holdExpiresAtMillis = parseIsoToMillis(dto.holdExpiresAt)
                        ?: (System.currentTimeMillis() + 10 * 60 * 1000L),
                    status = OrderStatus.PENDING_PAYMENT,
                    qrToken = "",
                    fallbackPin = "",
                    pickupWindow = deal.pickupWindowText
                )
                upsertSessionOrder(order)
                Result.success(order)
            } else {
                Result.failure(apiError(response.code(), response.errorBody()?.string()))
            }
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    override suspend fun getActiveOrders(): Result<List<ActiveOrder>> {
        // Đồng bộ từ máy chủ để đơn tạo ở phiên trước hoặc nơi khác vẫn hiện; trường không có trong
        // phản hồi để trống, không bịa. Lỗi mạng thì dùng bộ nhớ đệm phiên.
        return try {
            val response = ordersApiService.getActiveOrders()
            val list = response.body()
            if (response.isSuccessful && list != null) {
                list.asReversed().forEach { dto ->
                    val status = when (dto.status) {
                        "PENDING_PAYMENT" -> OrderStatus.PENDING_PAYMENT
                        "PAID" -> OrderStatus.PAID_WAITING_PICKUP
                        "PICKED_UP" -> OrderStatus.PICKED_UP
                        "EXPIRED", "NO_SHOW" -> OrderStatus.EXPIRED
                        else -> OrderStatus.CANCELLED
                    }
                    val known = sessionOrders.find { it.id == dto.id }
                    val deal = known?.deal ?: Deal(
                        id = dto.offerId, storeId = dto.storeId, storeName = dto.storeName.orEmpty(),
                        storeAddress = dto.storeAddress.orEmpty(), storeLogoUrl = dto.storeLogoUrl.orEmpty(), coverImageUrl = dto.imageUrl.orEmpty(),
                        title = dto.itemName.orEmpty(), description = "", whatYouCouldGet = "",
                        category = com.surplusiq.app.domain.model.DealCategory.OTHER,
                        originalPrice = dto.unitPrice.toInt(), discountPrice = dto.unitPrice.toInt(),
                        discountPercent = 0, remainingStock = 0, initialStock = 0,
                        pickupWindowText = dto.pickupSlot ?: pickupWindowOf(dto.offer?.pickupStart, dto.offer?.pickupEnd), distanceText = "",
                        rating = 0.0, reviewCount = 0, allergens = emptyList()
                    )
                    upsertSessionOrder(
                        ActiveOrder(
                            id = dto.id, orderCode = dto.code, deal = deal, quantity = dto.quantity,
                            unitPrice = dto.unitPrice.toInt(), totalPrice = dto.totalAmount.toInt(),
                            holdExpiresAtMillis = parseIsoToMillis(dto.holdExpiresAt) ?: 0L,
                            status = status, qrToken = known?.qrToken.orEmpty(),
                            fallbackPin = known?.fallbackPin.orEmpty(),
                            pickupWindow = known?.pickupWindow ?: dto.pickupSlot ?: pickupWindowOf(dto.offer?.pickupStart, dto.offer?.pickupEnd)
                        )
                    )
                }
            }
            Result.success(sessionOrders.toList())
        } catch (e: Exception) {
            Result.success(sessionOrders.toList())
        }
    }

    override suspend fun cancelHold(orderId: String, reason: String?): Result<Boolean> {
        return try {
            val response = ordersApiService.cancelHold(
                orderId,
                CancelOrderRequest(reason = reason ?: "Khách hủy giữ suất")
            )
            if (response.isSuccessful) {
                sessionOrders.find { it.id == orderId }?.let {
                    upsertSessionOrder(it.copy(status = OrderStatus.CANCELLED))
                }
                Result.success(true)
            } else {
                Result.failure(apiError(response.code(), response.errorBody()?.string()))
            }
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    override suspend fun notifyArriving(orderId: String): Result<Boolean> {
        return try {
            val response = ordersApiService.notifyArriving(orderId)
            if (response.isSuccessful) Result.success(true)
            else Result.failure(apiError(response.code(), response.errorBody()?.string()))
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    override suspend fun createPayment(orderId: String): Result<PaymentInfo> {
        return try {
            val response = paymentsApiService.createPayment(
                orderId = orderId,
                request = CreatePaymentRequest(method = "SIMULATED"),
                idempotencyKey = UUID.randomUUID().toString()
            )
            val dto = response.body()
            if (response.isSuccessful && dto != null) {
                Result.success(
                    PaymentInfo(
                        transactionId = dto.transactionId,
                        orderId = dto.orderId,
                        orderCode = dto.orderCode,
                        amount = dto.amount.toLong(),
                        transferSyntax = dto.transferSyntax,
                        bankAccount = dto.bankAccount,
                        bankBin = dto.bankBin,
                        bankName = dto.bankName,
                        qrUrl = dto.qrUrl,
                        holdExpiresAtMillis = parseIsoToMillis(dto.holdExpiresAt)
                            ?: System.currentTimeMillis(),
                        status = dto.status
                    )
                )
            } else {
                Result.failure(apiError(response.code(), response.errorBody()?.string()))
            }
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    override suspend fun recheckPayment(orderId: String): Result<PaymentRecheckResult> {
        return try {
            val response = paymentsApiService.recheckPayment(orderId)
            val dto = response.body()
            if (response.isSuccessful && dto != null) {
                if (dto.orderStatus == "PAID") {
                    sessionOrders.find { it.id == orderId }?.let {
                        upsertSessionOrder(it.copy(status = OrderStatus.PAID_WAITING_PICKUP))
                    }
                }
                Result.success(
                    PaymentRecheckResult(
                        orderId = dto.orderId,
                        orderStatus = dto.orderStatus,
                        paymentStatus = dto.paymentStatus,
                        message = dto.message
                    )
                )
            } else {
                Result.failure(apiError(response.code(), response.errorBody()?.string()))
            }
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    override suspend fun getOrderStatus(orderId: String): Result<String> {
        return try {
            val response = ordersApiService.getOrderById(orderId)
            val dto = response.body()
            if (response.isSuccessful && dto != null) {
                if (dto.status == "PICKED_UP") {
                    sessionOrders.find { it.id == orderId }?.let {
                        upsertSessionOrder(it.copy(status = OrderStatus.PICKED_UP))
                    }
                }
                Result.success(dto.status)
            } else {
                Result.failure(apiError(response.code(), response.errorBody()?.string()))
            }
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    override suspend fun createProxyCode(orderId: String): Result<ProxyCodeResponse> {
        return try {
            val response = ordersApiService.createProxyCode(orderId)
            val dto = response.body()
            if (response.isSuccessful && dto != null) {
                Result.success(dto)
            } else {
                Result.failure(apiError(response.code(), response.errorBody()?.string()))
            }
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    override suspend fun getProxyCode(orderId: String): Result<ProxyCodeResponse?> {
        return try {
            val response = ordersApiService.getProxyCode(orderId)
            if (response.isSuccessful) {
                Result.success(response.body())
            } else {
                Result.failure(apiError(response.code(), response.errorBody()?.string()))
            }
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    override suspend fun revokeProxyCode(orderId: String): Result<Boolean> {
        return try {
            val response = ordersApiService.revokeProxyCode(orderId)
            if (response.isSuccessful) Result.success(true)
            else Result.failure(apiError(response.code(), response.errorBody()?.string()))
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    override suspend fun getCancelDeadlineMillis(orderId: String): Result<Long?> {
        return try {
            val response = ordersApiService.getOrderById(orderId)
            val dto = response.body()
            if (response.isSuccessful && dto != null) {
                val deadline = when (dto.status) {
                    "PENDING_PAYMENT" -> parseIsoToMillis(dto.holdExpiresAt)
                    // Khớp ORDERS_CONSTANTS.CANCEL_CUTOFF_MINUTES = 60 ở backend (R1-043).
                    "PAID" -> parseIsoToMillis(dto.offer?.pickupStart)?.minus(60 * 60 * 1000L)
                    else -> null
                }
                Result.success(deadline)
            } else {
                Result.failure(apiError(response.code(), response.errorBody()?.string()))
            }
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    override suspend fun getOrderReceipt(orderId: String): Result<OrderReceiptDto> {
        return try {
            val response = ordersApiService.getOrderReceipt(orderId)
            val dto = response.body()
            if (response.isSuccessful && dto != null) Result.success(dto)
            else Result.failure(apiError(response.code(), response.errorBody()?.string()))
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    override suspend fun reorder(oldOrderId: String): Result<ReorderResponseDto?> {
        return try {
            val response = ordersApiService.reorder(oldOrderId)
            val dto = response.body()
            when {
                response.isSuccessful && dto != null -> Result.success(dto)
                // 400 = món chưa mở suất hôm nay -> trạng thái rỗng, không phải lỗi.
                response.code() == 400 -> Result.success(null)
                else -> Result.failure(apiError(response.code(), response.errorBody()?.string()))
            }
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    override suspend fun attachPaymentProof(orderId: String, proofUrl: String): Result<Boolean> {
        return try {
            val response = ordersApiService.attachPaymentProof(orderId, AttachPaymentProofRequest(proofUrl))
            if (response.isSuccessful) {
                Result.success(true)
            } else {
                Result.failure(apiError(response.code(), response.errorBody()?.string()))
            }
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    override suspend fun updatePickupSlot(orderId: String, pickupSlot: String): Result<Boolean> {
        return try {
            val response = ordersApiService.updatePickupSlot(orderId, UpdatePickupSlotRequest(pickupSlot))
            if (response.isSuccessful) {
                Result.success(true)
            } else {
                Result.failure(apiError(response.code(), response.errorBody()?.string()))
            }
        } catch (e: Exception) {
            Result.failure(networkError(e))
        }
    }

    private fun parseIsoToMillis(iso: String?): Long? {
        if (iso.isNullOrBlank()) return null
        return try {
            java.time.Instant.parse(iso).toEpochMilli()
        } catch (_: Exception) {
            null
        }
    }

    private fun apiError(code: Int, body: String?): Exception {
        val message = when (code) {
            400 -> backendMessage(body) ?: "Yêu cầu không hợp lệ, vui lòng kiểm tra lại thông tin."
            401 -> "Phiên đăng nhập đã hết. Đăng nhập lại để tiếp tục."
            404 -> "Không tìm thấy đơn hàng hoặc giao dịch."
            409 -> "Dữ liệu đã thay đổi, vui lòng tải lại."
            429 -> "Bạn đang thao tác quá nhanh, vui lòng thử lại sau một chút."
            in 500..599 -> "Hệ thống đang gặp sự cố. Vui lòng thử lại sau."
            else -> body?.takeIf { it.isNotBlank() } ?: "Không thể hoàn tất yêu cầu."
        }
        return Exception(message)
    }

    /** Lý do nghiệp vụ backend trả trong 400 (vd. quá hạn hủy, mã ưu đãi không hợp lệ). */
    private fun backendMessage(body: String?): String? = runCatching {
        val msg = com.google.gson.JsonParser.parseString(body).asJsonObject.get("message")
        if (msg.isJsonArray) msg.asJsonArray.joinToString("; ") { it.asString } else msg.asString
    }.getOrNull()?.takeIf { it.isNotBlank() }

    private fun networkError(e: Exception): Exception {
        return Exception("Không kết nối được. Kiểm tra mạng rồi thử lại.", e)
    }

    /** "Hôm nay 19:00 - 21:30" từ mốc giờ ISO của suất; rỗng nếu thiếu dữ liệu. */
    private fun pickupWindowOf(start: String?, end: String?): String {
        fun at(iso: String?) = runCatching {
            java.time.OffsetDateTime.parse(iso).atZoneSameInstant(java.time.ZoneId.systemDefault())
        }.getOrNull()
        val s = at(start) ?: return ""
        val e = at(end)
        val today = java.time.LocalDate.now()
        val day = when (s.toLocalDate()) {
            today -> "Hôm nay"
            today.plusDays(1) -> "Ngày mai"
            else -> "%02d/%02d".format(s.dayOfMonth, s.monthValue)
        }
        val from = s.toLocalTime().toString().take(5)
        return if (e != null) "$day $from - ${e.toLocalTime().toString().take(5)}" else "$day từ $from"
    }
}
