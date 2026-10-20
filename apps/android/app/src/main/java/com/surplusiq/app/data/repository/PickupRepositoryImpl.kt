package com.surplusiq.app.data.repository

import com.surplusiq.app.data.local.dao.PickupPassDao
import com.surplusiq.app.data.local.entity.PickupPassEntity
import com.surplusiq.app.data.remote.api.PickupsApiService
import com.surplusiq.app.domain.repository.PickupPassInfo
import com.surplusiq.app.domain.repository.PickupRepository
import javax.inject.Inject
import javax.inject.Singleton

/**
 * KHÔNG trả vé nhận hàng giả khi API lỗi (rule 0.1 "không fake success"). Một vé
 * hiển thị "hợp lệ" nhưng QR không ký thật sẽ không quét được ở quán và đánh lừa
 * khách. Chỉ dùng cache Room cho dữ liệu đã từng tải thật (offline), không bịa mới.
 */
@Singleton
class PickupRepositoryImpl @Inject constructor(
    private val pickupsApiService: PickupsApiService,
    private val pickupPassDao: PickupPassDao
) : PickupRepository {

    override suspend fun getPickupPass(orderId: String): Result<PickupPassInfo> {
        return try {
            val response = pickupsApiService.getPickupPass(orderId)
            val dto = response.body()
            if (response.isSuccessful && dto != null) {
                val info = PickupPassInfo(
                    orderId = dto.orderId,
                    orderCode = dto.orderCode,
                    qrToken = dto.pickupToken,
                    fallbackPin = dto.backupCode,
                    expiresAt = dto.expiresAt,
                    itemName = dto.itemName,
                    quantity = dto.quantity,
                    totalAmount = dto.totalAmount.toInt()
                )
                try {
                    pickupPassDao.savePickupPass(
                        PickupPassEntity(
                            orderId = info.orderId,
                            orderCode = info.orderCode,
                            qrToken = info.qrToken,
                            backupPin = info.fallbackPin,
                            expiresAt = info.expiresAt,
                            itemName = info.itemName,
                            quantity = info.quantity,
                            totalAmount = info.totalAmount
                        )
                    )
                } catch (_: Exception) {
                    // Cache offline là tiện ích phụ - lỗi cache không được làm hỏng vé thật đã tải.
                }
                Result.success(info)
            } else {
                getOfflineOrFail(orderId, apiErrorMessage(response.code()))
            }
        } catch (_: Exception) {
            getOfflineOrFail(orderId, "Không kết nối được. Kiểm tra mạng rồi thử lại.")
        }
    }

    private suspend fun getOfflineOrFail(orderId: String, errorMessage: String): Result<PickupPassInfo> {
        val cached = pickupPassDao.getPickupPassById(orderId)
        return if (cached != null) {
            Result.success(
                PickupPassInfo(
                    orderId = cached.orderId,
                    orderCode = cached.orderCode,
                    qrToken = cached.qrToken,
                    fallbackPin = cached.backupPin,
                    expiresAt = cached.expiresAt,
                    itemName = cached.itemName,
                    quantity = cached.quantity,
                    totalAmount = cached.totalAmount
                )
            )
        } else {
            Result.failure(Exception(errorMessage))
        }
    }

    private fun apiErrorMessage(code: Int): String = when (code) {
        401 -> "Phiên đăng nhập đã hết. Đăng nhập lại để tiếp tục."
        404 -> "Không tìm thấy vé nhận hàng cho đơn này."
        in 500..599 -> "Hệ thống đang gặp sự cố. Vui lòng thử lại sau."
        else -> "Không thể tải vé nhận hàng."
    }
}
