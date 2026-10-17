package com.surplusiq.app.domain.repository

data class PickupPassInfo(
    val orderId: String,
    val orderCode: String,
    val qrToken: String,
    val fallbackPin: String,
    val expiresAt: String,
    val itemName: String,
    val quantity: Int,
    val totalAmount: Int
)

interface PickupRepository {
    suspend fun getPickupPass(orderId: String): Result<PickupPassInfo>
}
