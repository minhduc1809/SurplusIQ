package com.surplusiq.app.domain.repository

import com.surplusiq.app.domain.model.RescuePool
import com.surplusiq.app.domain.model.RescuePoolOrderResult

/**
 * Rescue Pool (CM-C02). register/update/withdraw chỉ là đăng ký nhu cầu - không tạo đơn, không thu tiền.
 * Chỉ confirmOffer (khách chủ động) mới tạo đơn thật qua luồng đặt hàng hiện tại.
 */
interface RescuePoolRepository {
    suspend fun listPools(serviceArea: String? = null): Result<List<RescuePool>>
    suspend fun getPool(poolId: String): Result<RescuePool>
    suspend fun register(
        poolId: String,
        quantity: Int,
        budgetMax: Int?,
        pickupStart: String?,
        pickupEnd: String?
    ): Result<RescuePool>
    suspend fun updateRegistration(
        poolId: String,
        quantity: Int,
        budgetMax: Int?,
        pickupStart: String?,
        pickupEnd: String?
    ): Result<RescuePool>
    suspend fun withdraw(poolId: String, reason: String): Result<RescuePool>
    suspend fun confirmOffer(poolId: String, offerVersion: Int): Result<RescuePoolOrderResult>
}
