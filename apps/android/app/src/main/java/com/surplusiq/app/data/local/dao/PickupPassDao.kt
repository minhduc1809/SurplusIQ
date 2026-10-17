package com.surplusiq.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.surplusiq.app.data.local.entity.PickupPassEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface PickupPassDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun savePickupPass(entity: PickupPassEntity)

    @Query("SELECT * FROM pickup_passes WHERE orderId = :orderId LIMIT 1")
    suspend fun getPickupPassById(orderId: String): PickupPassEntity?

    @Query("SELECT * FROM pickup_passes ORDER BY updatedAtMillis DESC LIMIT 1")
    suspend fun getLatestPickupPass(): PickupPassEntity?

    @Query("SELECT * FROM pickup_passes ORDER BY updatedAtMillis DESC")
    fun getAllPickupPassesFlow(): Flow<List<PickupPassEntity>>

    @Query("DELETE FROM pickup_passes WHERE orderId = :orderId")
    suspend fun deletePickupPass(orderId: String)
}
