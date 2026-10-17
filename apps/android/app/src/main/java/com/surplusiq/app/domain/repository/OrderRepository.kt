package com.surplusiq.app.domain.repository

import com.surplusiq.app.domain.model.ActiveOrder
import com.surplusiq.app.domain.model.Deal

interface OrderRepository {
    suspend fun holdOrder(
        deal: Deal,
        quantity: Int,
        pickupSlot: String? = null,
        note: String? = null
    ): Result<ActiveOrder>

    suspend fun getActiveOrders(): Result<List<ActiveOrder>>

    suspend fun cancelHold(orderId: String, reason: String? = null): Result<Boolean>

    suspend fun notifyArriving(orderId: String): Result<Boolean>

    suspend fun confirmPayment(orderId: String): Result<ActiveOrder>
}
