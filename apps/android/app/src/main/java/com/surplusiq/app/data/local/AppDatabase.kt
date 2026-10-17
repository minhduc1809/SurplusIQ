package com.surplusiq.app.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.surplusiq.app.data.local.dao.PickupPassDao
import com.surplusiq.app.data.local.entity.PickupPassEntity

@Database(
    entities = [PickupPassEntity::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun pickupPassDao(): PickupPassDao
}
