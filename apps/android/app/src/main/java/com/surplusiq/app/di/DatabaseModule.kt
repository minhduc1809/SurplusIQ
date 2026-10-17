package com.surplusiq.app.di

import android.content.Context
import androidx.room.Room
import com.surplusiq.app.data.local.AppDatabase
import com.surplusiq.app.data.local.dao.PickupPassDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideAppDatabase(
        @ApplicationContext context: Context
    ): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "surplusiq_local.db"
        )
        .fallbackToDestructiveMigration()
        .build()
    }

    @Provides
    @Singleton
    fun providePickupPassDao(database: AppDatabase): PickupPassDao {
        return database.pickupPassDao()
    }
}
