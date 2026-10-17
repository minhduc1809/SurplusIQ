package com.surplusiq.app.domain.repository

import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.domain.model.UserPreferences

interface DiscoveryRepository {
    suspend fun getNearbyDeals(
        latitude: Double? = 10.7769,
        longitude: Double? = 106.7009,
        radiusKm: Double = 2.0,
        searchQuery: String? = null,
        preferences: UserPreferences? = null
    ): Result<List<Deal>>

    suspend fun getDealDetail(id: String): Result<Deal>

    suspend fun toggleFavorite(dealId: String, storeId: String, currentStatus: Boolean): Result<Boolean>
}
