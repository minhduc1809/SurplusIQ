package com.surplusiq.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "pickup_passes")
data class PickupPassEntity(
    @PrimaryKey
    val orderId: String,
    val orderCode: String,
    val qrToken: String,
    val backupPin: String,
    val expiresAt: String,
    val itemName: String,
    val quantity: Int,
    val totalAmount: Int,
    val updatedAtMillis: Long = System.currentTimeMillis()
)
